from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db, require_role
from ..models import Operator, User, UserRole
from ..schemas import OperatorIn, OperatorOut, OperatorPatch

router = APIRouter(prefix="/api/operators", tags=["operators"])


@router.get("", response_model=list[OperatorOut])
def list_operators(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Operator]:
    return list(db.scalars(select(Operator).order_by(Operator.full_name)))


@router.post("", response_model=OperatorOut, status_code=201)
def create_operator(
    payload: OperatorIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> Operator:
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
    return op


@router.get("/{operator_id}", response_model=OperatorOut)
def get_operator(
    operator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Operator:
    op = db.get(Operator, operator_id)
    if op is None:
        raise HTTPException(404, "Operator not found")
    return op


@router.patch("/{operator_id}", response_model=OperatorOut)
def patch_operator(
    operator_id: int,
    payload: OperatorPatch,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> Operator:
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
    return op


@router.delete("/{operator_id}", response_model=OperatorOut)
def deactivate_operator(
    operator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> Operator:
    op = db.get(Operator, operator_id)
    if op is None:
        raise HTTPException(404, "Operator not found")
    op.is_active = False
    db.commit()
    db.refresh(op)
    return op
