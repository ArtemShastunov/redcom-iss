from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..deps import get_current_user, get_db, require_role
from ..models import Operator, OperatorPeriod, Period, PeriodStatus, User, UserRole
from ..schemas import OperatorPeriodIn, OperatorPeriodOut

router = APIRouter(prefix="/api/operator-periods", tags=["operator-periods"])


def _ensure_period_open(db: Session, period_id: int) -> None:
    p = db.get(Period, period_id)
    if p is None:
        raise HTTPException(404, "Period not found")
    if p.status == PeriodStatus.CLOSED:
        raise HTTPException(409, "Period is closed")


@router.get("", response_model=list[OperatorPeriodOut])
def list_operator_periods(
    period_id: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[OperatorPeriod]:
    q = (
        select(OperatorPeriod)
        .options(joinedload(OperatorPeriod.operator))
        .where(OperatorPeriod.period_id == period_id)
    )
    return list(db.scalars(q))


@router.put("/{period_id}/{operator_id}", response_model=OperatorPeriodOut)
def upsert_operator_period(
    period_id: int,
    operator_id: int,
    payload: OperatorPeriodIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> OperatorPeriod:
    _ensure_period_open(db, period_id)
    if db.get(Operator, operator_id) is None:
        raise HTTPException(404, "Operator not found")

    op = db.get(OperatorPeriod, (period_id, operator_id))
    if op is None:
        op = OperatorPeriod(period_id=period_id, operator_id=operator_id)
        db.add(op)
    op.calls_incoming = payload.calls_incoming
    op.calls_outgoing = payload.calls_outgoing
    op.chats_bitrix = payload.chats_bitrix
    op.chats_mobile = payload.chats_mobile
    op.callback_calls = payload.callback_calls
    op.has_critical_errors = payload.has_critical_errors
    op.critical_errors_reason = payload.critical_errors_reason
    op.override_tone = payload.override_tone
    op.override_completeness = payload.override_completeness
    op.override_dialog = payload.override_dialog
    op.override_reason = payload.override_reason
    db.commit()
    op = db.scalar(
        select(OperatorPeriod)
        .options(joinedload(OperatorPeriod.operator))
        .where(OperatorPeriod.period_id == period_id, OperatorPeriod.operator_id == operator_id)
    )
    assert op is not None
    return op


@router.delete("/{period_id}/{operator_id}", status_code=204)
def delete_operator_period(
    period_id: int,
    operator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> None:
    _ensure_period_open(db, period_id)
    op = db.get(OperatorPeriod, (period_id, operator_id))
    if op is None:
        raise HTTPException(404, "Not found")
    db.delete(op)
    db.commit()

