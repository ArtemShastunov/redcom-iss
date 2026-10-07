from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..deps import get_current_user, get_db, require_role
from ..models import Period, PeriodStatus, SupervisorPeriod, User, UserRole
from ..schemas import SupervisorPeriodIn, SupervisorPeriodOut

router = APIRouter(prefix="/api/supervisor-periods", tags=["supervisor-periods"])


def _ensure_period_open(db: Session, period_id: int) -> None:
    p = db.get(Period, period_id)
    if p is None:
        raise HTTPException(404, "Period not found")
    if p.status == PeriodStatus.CLOSED:
        raise HTTPException(409, "Period is closed")


@router.get("", response_model=list[SupervisorPeriodOut])
def list_supervisor_periods(
    period_id: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[SupervisorPeriod]:
    q = (
        select(SupervisorPeriod)
        .options(joinedload(SupervisorPeriod.supervisor))
        .where(SupervisorPeriod.period_id == period_id)
    )
    return list(db.scalars(q))


@router.put("/{period_id}/{supervisor_id}", response_model=SupervisorPeriodOut)
def upsert_supervisor_period(
    period_id: int,
    supervisor_id: int,
    payload: SupervisorPeriodIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> SupervisorPeriod:
    _ensure_period_open(db, period_id)
    sup = db.get(User, supervisor_id)
    if sup is None or sup.role != UserRole.SUPERVISOR:
        raise HTTPException(404, "Supervisor not found")

    sp = db.get(SupervisorPeriod, (period_id, supervisor_id))
    if sp is None:
        sp = SupervisorPeriod(period_id=period_id, supervisor_id=supervisor_id)
        db.add(sp)
    sp.norm_score = payload.norm_score
    db.commit()
    sp = db.scalar(
        select(SupervisorPeriod)
        .options(joinedload(SupervisorPeriod.supervisor))
        .where(SupervisorPeriod.period_id == period_id, SupervisorPeriod.supervisor_id == supervisor_id)
    )
    assert sp is not None
    return sp
