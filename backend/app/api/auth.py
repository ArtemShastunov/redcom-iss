from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_current_user, get_db
from ..models import LoginAttempt, User
from ..schemas import ChangeCredentialsIn
from ..security import hash_password, make_session_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "session"

RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW_SECONDS = 60
CLEANUP_OLDER_THAN_HOURS = 24


class LoginIn(BaseModel):
    login: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    full_name: str
    role: str
    operator_id: int | None


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()[:64]
    if request.client:
        return request.client.host[:64]
    return "unknown"


def _check_rate_limit(db: Session, ip: str) -> None:
    since = datetime.utcnow() - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)
    failed = (
        db.scalar(
            select(func.count(LoginAttempt.id)).where(
                LoginAttempt.ip == ip,
                LoginAttempt.attempted_at >= since,
                LoginAttempt.success.is_(False),
            )
        )
        or 0
    )
    if failed >= RATE_LIMIT_MAX:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Слишком много попыток входа. Подождите {RATE_LIMIT_WINDOW_SECONDS} секунд.",
        )


def _log_attempt(db: Session, ip: str, login: str | None, success: bool) -> None:
    db.add(LoginAttempt(ip=ip, login=login, success=success))
    if not success:
        cutoff = datetime.utcnow() - timedelta(hours=CLEANUP_OLDER_THAN_HOURS)
        db.execute(delete(LoginAttempt).where(LoginAttempt.attempted_at < cutoff))
    db.commit()


@router.post("/login", response_model=UserOut)
def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    ip = _client_ip(request)
    _check_rate_limit(db, ip)

    user = db.scalar(select(User).where(User.login == payload.login))
    if (
        user is None
        or not user.is_active
        or not verify_password(user.password_hash, payload.password)
    ):
        _log_attempt(db, ip, payload.login, success=False)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    _log_attempt(db, ip, payload.login, success=True)

    response.set_cookie(
        key=COOKIE_NAME,
        value=make_session_token(user.id),
        max_age=settings.session_max_age_seconds,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    return user


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/change-credentials", response_model=UserOut)
def change_credentials(
    payload: ChangeCredentialsIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    """Пользователь меняет свой логин и/или пароль.

    Требуется текущий пароль — защита от смены с чужого устройства,
    где остался открытый cookie.
    """
    if not verify_password(user.password_hash, payload.current_password):
        raise HTTPException(401, "Неверный текущий пароль")

    changing_login = payload.new_login is not None and payload.new_login.strip() != ""
    changing_password = payload.new_password is not None and payload.new_password != ""

    if not changing_login and not changing_password:
        raise HTTPException(400, "Нечего менять: укажите новый логин или новый пароль")

    if changing_login:
        new_login = payload.new_login.strip().lower()
        if new_login == user.login:
            changing_login = False
        else:
            existing = db.scalar(select(User).where(User.login == new_login))
            if existing is not None:
                raise HTTPException(409, "Такой логин уже занят")
            user.login = new_login

    if changing_password:
        if payload.new_password_confirm is None:
            raise HTTPException(400, "Укажите подтверждение нового пароля")
        if payload.new_password != payload.new_password_confirm:
            raise HTTPException(400, "Пароли не совпадают")
        user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(user)
    return user
