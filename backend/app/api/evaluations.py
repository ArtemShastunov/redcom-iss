from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..deps import get_current_user, get_db
from ..models import Evaluation, Operator, Period, PeriodStatus, User, UserRole
from ..schemas import EvaluationIn, EvaluationOut, EvaluationPatch

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


def _ensure_period_open(db: Session, period_id: int) -> Period:
    p = db.get(Period, period_id)
    if p is None:
        raise HTTPException(404, "Period not found")
    if p.status == PeriodStatus.CLOSED:
        raise HTTPException(409, "Период закрыт. Откройте его, чтобы вносить правки.")
    return p


def _can_edit(user: User, ev: Evaluation) -> bool:
    if user.role in (UserRole.HEAD, UserRole.ADMIN):
        return True
    return user.role == UserRole.SUPERVISOR and ev.supervisor_id == user.id


def _load(db: Session, evaluation_id: int) -> Evaluation | None:
    return db.scalar(
        select(Evaluation)
        .options(joinedload(Evaluation.operator), joinedload(Evaluation.supervisor))
        .where(Evaluation.id == evaluation_id)
    )


@router.get("", response_model=list[EvaluationOut])
def list_evaluations(
    period_id: int = Query(...),
    operator_id: int | None = None,
    supervisor_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Evaluation]:
    q = (
        select(Evaluation)
        .options(joinedload(Evaluation.operator), joinedload(Evaluation.supervisor))
        .where(Evaluation.period_id == period_id)
        .order_by(Evaluation.call_date, Evaluation.id)
    )
    if operator_id is not None:
        q = q.where(Evaluation.operator_id == operator_id)
    if supervisor_id is not None:
        q = q.where(Evaluation.supervisor_id == supervisor_id)
    return list(db.scalars(q))


@router.post("", response_model=EvaluationOut, status_code=201)
def create_evaluation(
    payload: EvaluationIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    if user.role not in (UserRole.SUPERVISOR, UserRole.HEAD, UserRole.ADMIN):
        raise HTTPException(403, "Forbidden")

    _ensure_period_open(db, payload.period_id)

    if db.get(Operator, payload.operator_id) is None:
        raise HTTPException(404, "Operator not found")

    supervisor_id = payload.supervisor_id or user.id
    if user.role == UserRole.SUPERVISOR and supervisor_id != user.id:
        raise HTTPException(403, "Supervisor can only create own evaluations")

    ev = Evaluation(
        period_id=payload.period_id,
        operator_id=payload.operator_id,
        supervisor_id=supervisor_id,
        call_date=payload.call_date,
        phone=payload.phone,
        contract_number=payload.contract_number,
        tone=payload.tone,
        completeness=payload.completeness,
        dialog_1c=payload.dialog_1c,
        question=payload.question,
        what_was=payload.what_was,
        how_should_be=payload.how_should_be,
        impact=payload.impact,
        comment=payload.comment,
    )
    db.add(ev)
    db.commit()
    ev = _load(db, ev.id)
    assert ev is not None
    return ev


@router.get("/{evaluation_id}", response_model=EvaluationOut)
def get_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Evaluation:
    ev = _load(db, evaluation_id)
    if ev is None:
        raise HTTPException(404, "Evaluation not found")
    return ev


@router.patch("/{evaluation_id}", response_model=EvaluationOut)
def patch_evaluation(
    evaluation_id: int,
    payload: EvaluationPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Evaluation:
    ev = db.get(Evaluation, evaluation_id)
    if ev is None:
        raise HTTPException(404, "Evaluation not found")
    if not _can_edit(user, ev):
        raise HTTPException(403, "Forbidden")
    _ensure_period_open(db, ev.period_id)

    data = payload.model_dump(exclude_unset=True)

    # Смена супервайзера — только head/admin. Если тот же supervisor_id —
    # это НЕ смена, а обычное сохранение карточки. Просто игнорируем поле.
    if "supervisor_id" in data and data["supervisor_id"] is not None:
        new_sup_id = data["supervisor_id"]
        if new_sup_id != ev.supervisor_id:
            if user.role not in (UserRole.HEAD, UserRole.ADMIN):
                raise HTTPException(
                    403,
                    "Только начальник ИСС или админ может менять супервайзера",
                )
            target = db.get(User, new_sup_id)
            if target is None or target.role != UserRole.SUPERVISOR:
                raise HTTPException(404, "Супервайзер не найден")
        del data["supervisor_id"]

    for k, v in data.items():
        setattr(ev, k, v)
    db.commit()
    ev = _load(db, evaluation_id)
    assert ev is not None
    return ev


@router.delete("/{evaluation_id}", status_code=204)
def delete_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    ev = db.get(Evaluation, evaluation_id)
    if ev is None:
        raise HTTPException(404, "Evaluation not found")
    if not _can_edit(user, ev):
        raise HTTPException(403, "Forbidden")
    _ensure_period_open(db, ev.period_id)
    db.delete(ev)
    db.commit()
