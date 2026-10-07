from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db, require_role
from ..models import User, UserRole
from ..schemas import PasswordChangeIn, UserIn, UserOut, UserPatch
from ..security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


# Все эндпоинты доступны только админу.
admin_only = require_role(UserRole.ADMIN)


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


@router.post("", response_model=UserOut, status_code=201)
def create_user(
    payload: UserIn,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> User:
    if db.scalar(select(User).where(User.login == payload.login)):
        raise HTTPException(409, "Пользователь с таким логином уже существует")
    user = User(
        login=payload.login,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def patch_user(
    user_id: int,
    payload: UserPatch,
    db: Session = Depends(get_db),
    current: User = Depends(admin_only),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Пользователь не найден")

    data = payload.model_dump(exclude_unset=True)

    # Нельзя лишить себя роли admin или деактивировать себя — иначе
    # можем остаться без единого админа и потерять доступ к управлению.
    if user.id == current.id:
        if "role" in data and data["role"] != UserRole.ADMIN:
            raise HTTPException(400, "Нельзя изменить свою роль")
        if "is_active" in data and data["is_active"] is False:
            raise HTTPException(400, "Нельзя деактивировать себя")

    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/password", response_model=UserOut)
def change_password(
    user_id: int,
    payload: PasswordChangeIn,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Пользователь не найден")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=UserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(admin_only),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "Пользователь не найден")
    if user.id == current.id:
        raise HTTPException(400, "Нельзя деактивировать себя")
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user
