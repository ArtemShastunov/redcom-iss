from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db, require_role
from ..models import Period, PeriodStatus, User, UserRole
from ..schemas import PeriodIn, PeriodOut

router = APIRouter(prefix="/api/periods", tags=["periods"])


@router.get("", response_model=list[PeriodOut])
def list_periods(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Period]:
    return list(db.scalars(select(Period).order_by(Period.year.desc(), Period.month.desc())))


@router.post("", response_model=PeriodOut, status_code=201)
def create_period(
    payload: PeriodIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> Period:
    exists = db.scalar(
        select(Period).where(Period.year == payload.year, Period.month == payload.month)
    )
    if exists:
        raise HTTPException(409, "Period already exists")
    p = Period(year=payload.year, month=payload.month, status=PeriodStatus.OPEN)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/{period_id}", response_model=PeriodOut)
def get_period(
    period_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Period:
    p = db.get(Period, period_id)
    if p is None:
        raise HTTPException(404, "Period not found")
    return p


@router.post("/{period_id}/close", response_model=PeriodOut)
def close_period(
    period_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> Period:
    p = db.get(Period, period_id)
    if p is None:
        raise HTTPException(404, "Period not found")
    if p.status == PeriodStatus.CLOSED:
        raise HTTPException(409, "Period already closed")
    p.status = PeriodStatus.CLOSED
    p.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return p


@router.post("/{period_id}/reopen", response_model=PeriodOut)
def reopen_period(
    period_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> Period:
    p = db.get(Period, period_id)
    if p is None:
        raise HTTPException(404, "Period not found")
    p.status = PeriodStatus.OPEN
    p.closed_at = None
    db.commit()
    db.refresh(p)
    return p
