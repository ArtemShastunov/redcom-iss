from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..deps import get_current_user, get_db
from ..models import LoginAttempt, User
from ..security import make_session_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "session"

# Не больше N неудачных попыток за последние WINDOW_SECONDS секунд с одного IP.
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW_SECONDS = 60

# Старые записи удаляем раз в сутки при очередной попытке
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
    """Настоящий IP клиента. За прокси (Layero) смотрим X-Forwarded-For."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        # "client, proxy1, proxy2" -> берём первый
        return fwd.split(",")[0].strip()[:64]
    if request.client:
        return request.client.host[:64]
    return "unknown"


def _check_rate_limit(db: Session, ip: str) -> None:
    """Бросает 429, если с этого IP слишком много неудачных попыток."""
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
    # Раз в сутки чистим старые записи
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
