from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_db, get_current_user, require_role
from ..models import Operator, User, UserRole
from ..schemas import (
    OperatorAccountIn,
    OperatorAccountOut,
    OperatorIn,
    OperatorOut,
    OperatorPatch,
)
from ..security import hash_password, make_login_from_full_name

router = APIRouter(prefix="/api/operators", tags=["operators"])

admin_head = require_role(UserRole.HEAD, UserRole.ADMIN)


def _to_out(db: Session, op: Operator) -> OperatorOut:
    acc = db.scalar(
        select(User).where(
            User.operator_id == op.id,
            User.role == UserRole.OPERATOR,
        )
    )
    return OperatorOut(
        id=op.id,
        full_name=op.full_name,
        premium_name=op.premium_name,
        is_active=op.is_active,
        account_id=acc.id if acc else None,
        account_login=acc.login if acc else None,
        account_active=acc.is_active if acc else None,
    )


@router.get("", response_model=list[OperatorOut])
def list_operators(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[OperatorOut]:
    ops = list(db.scalars(select(Operator).order_by(Operator.full_name)))
    return [_to_out(db, op) for op in ops]


@router.post("", response_model=OperatorOut, status_code=201)
def create_operator(
    payload: OperatorIn,
    db: Session = Depends(get_db),
    _: User = Depends(admin_head),
) -> OperatorOut:
    if db.scalar(select(Operator).where(Operator.full_name == payload.full_name)):
        raise HTTPException(409, "Operator with this name already exists")
    op = Operator(
        full_name=payload.full_name,
        premium_name=payload.premium_name,
        is_active=payload.is_active,
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return _to_out(db, op)


@router.get("/{operator_id}", response_model=OperatorOut)
def get_operator(
    operator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> OperatorOut:
    op = db.get(Operator, operator_id)
    if op is None:
        raise HTTPException(404, "Operator not found")
    return _to_out(db, op)


@router.patch("/{operator_id}", response_model=OperatorOut)
def patch_operator(
    operator_id: int,
    payload: OperatorPatch,
    db: Session = Depends(get_db),
    _: User = Depends(admin_head),
) -> OperatorOut:
    op = db.get(Operator, operator_id)
    if op is None:
        raise HTTPException(404, "Operator not found")
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"] != op.full_name:
        if db.scalar(select(Operator).where(Operator.full_name == data["full_name"])):
            raise HTTPException(409, "Operator with this name already exists")
    for k, v in data.items():
        setattr(op, k, v)
    db.commit()
    db.refresh(op)
    return _to_out(db, op)


@router.delete("/{operator_id}", response_model=OperatorOut)
def deactivate_operator(
    operator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(admin_head),
) -> OperatorOut:
    op = db.get(Operator, operator_id)
    if op is None:
        raise HTTPException(404, "Operator not found")
    op.is_active = False
    db.commit()
    db.refresh(op)
    return _to_out(db, op)


# ---------- Аккаунт оператора ----------


def _unique_login(db: Session, base: str) -> str:
    candidate = base
    n = 2
    while db.scalar(select(User).where(User.login == candidate)):
        candidate = f"{base}_{n}"
        n += 1
        if n > 100:
            raise HTTPException(500, "Не удалось подобрать уникальный логин")
    return candidate


@router.post(
    "/{operator_id}/account",
    response_model=OperatorAccountOut,
    status_code=201,
)
def create_account(
    operator_id: int,
    payload: OperatorAccountIn,
    db: Session = Depends(get_db),
    _: User = Depends(admin_head),
) -> OperatorAccountOut:
    op = db.get(Operator, operator_id)
    if op is None:
        raise HTTPException(404, "Operator not found")

    existing = db.scalar(
        select(User).where(
            User.operator_id == op.id,
            User.role == UserRole.OPERATOR,
        )
    )
    if existing is not None:
        raise HTTPException(409, "У этого оператора уже есть аккаунт")

    base_login = (payload.login or "").strip().lower() or make_login_from_full_name(
        op.full_name
    )
    login = _unique_login(db, base_login)

    user = User(
        login=login,
        password_hash=hash_password(payload.password),
        full_name=op.full_name,
        role=UserRole.OPERATOR,
        is_active=True,
        operator_id=op.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return OperatorAccountOut(
        user_id=user.id,
        login=user.login,
        is_active=user.is_active,
        operator_id=op.id,
    )


@router.post(
    "/{operator_id}/account/reset-password",
    response_model=OperatorAccountOut,
)
def reset_account_password(
    operator_id: int,
    payload: OperatorAccountIn,
    db: Session = Depends(get_db),
    _: User = Depends(admin_head),
) -> OperatorAccountOut:
    op = db.get(Operator, operator_id)
    if op is None:
        raise HTTPException(404, "Operator not found")

    user = db.scalar(
        select(User).where(
            User.operator_id == op.id,
            User.role == UserRole.OPERATOR,
        )
    )
    if user is None:
        raise HTTPException(404, "У оператора нет аккаунта")

    user.password_hash = hash_password(payload.password)
    user.is_active = True
    db.commit()
    db.refresh(user)

    return OperatorAccountOut(
        user_id=user.id,
        login=user.login,
        is_active=user.is_active,
        operator_id=op.id,
    )


@router.delete("/{operator_id}/account", status_code=204)
def deactivate_account(
    operator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(admin_head),
) -> None:
    user = db.scalar(
        select(User).where(
            User.operator_id == operator_id,
            User.role == UserRole.OPERATOR,
        )
    )
    if user is None:
        raise HTTPException(404, "У оператора нет аккаунта")
    user.is_active = False
    db.commit()
