from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..models import (
    Evaluation,
    Operator,
    OperatorPeriod,
    Period,
    SupervisorPeriod,
    User,
    UserRole,
)
from ..scoring import (
    OperatorEvaluationSummary,
    SupervisorEvaluationSummary,
    award_supervisor,
    rank_and_award_operators,
    score_operator,
)

router = APIRouter(prefix="/api/scoring", tags=["scoring"])


class OperatorScoreOut(BaseModel):
    operator_id: int
    operator_name: str
    calls_handled: int
    callback_calls: int
    has_critical_errors: bool
    critical_errors_reason: str | None
    evaluations_count: int
    is_supervisor: bool = False

    auto_tone: int
    auto_completeness: int
    auto_dialog: int

    tone_score: int
    completeness_score: int
    dialog_score: int
    summary_score: int

    override_tone: int | None
    override_completeness: int | None
    override_dialog: int | None
    override_reason: str | None

    rank: int | None
    premium: int
    excluded_reason: str | None


class SupervisorScoreOut(BaseModel):
    supervisor_id: int
    supervisor_name: str
    norm_score: int | None
    summary_score: int | None
    premium: int


class PeriodScoringOut(BaseModel):
    period_id: int
    operators: list[OperatorScoreOut]
    supervisors: list[SupervisorScoreOut]
    total_premium: int


@router.get("/period/{period_id}", response_model=PeriodScoringOut)
def get_period_scoring(
    period_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PeriodScoringOut:
    period = db.get(Period, period_id)
    if period is None:
        raise HTTPException(404, "Period not found")

    all_operators = list(db.scalars(select(Operator).order_by(Operator.id)))
    operators_by_id = {op.id: op for op in all_operators}

    evals = list(
        db.scalars(select(Evaluation).where(Evaluation.period_id == period_id))
    )
    by_operator: dict[int, list[Evaluation]] = {}
    for e in evals:
        by_operator.setdefault(e.operator_id, []).append(e)

    op_periods = {
        op.operator_id: op
        for op in db.scalars(
            select(OperatorPeriod).where(OperatorPeriod.period_id == period_id)
        )
    }

    operators_with_data = set(by_operator.keys()) | set(op_periods.keys())
    included = [
        op
        for op in operators_by_id.values()
        if op.is_active or op.id in operators_with_data
    ]

    summaries: list[OperatorEvaluationSummary] = []
    for op in included:
        evs = by_operator.get(op.id, [])
        op_period = op_periods.get(op.id)

        if op_period is not None:
            calls = op_period.calls_handled
        else:
            calls = 0

        summaries.append(
            score_operator(
                operator_id=op.id,
                operator_name=op.full_name,
                tone_scores=[e.tone for e in evs],
                completeness_scores=[e.completeness for e in evs],
                dialog_scores=[e.dialog_1c for e in evs],
                calls_handled=calls,
                has_critical_errors=op_period.has_critical_errors
                if op_period
                else False,
                critical_errors_reason=op_period.critical_errors_reason
                if op_period
                else None,
                op_period=op_period,
                is_supervisor=op.is_supervisor,  # Передаем флаг
            )
        )

    summaries = rank_and_award_operators(summaries)

    supervisors = list(
        db.scalars(
            select(User).where(User.role == UserRole.SUPERVISOR).order_by(User.id)
        )
    )
    sup_periods = {
        sp.supervisor_id: sp
        for sp in db.scalars(
            select(SupervisorPeriod).where(SupervisorPeriod.period_id == period_id)
        )
    }
    sup_summaries: list[SupervisorEvaluationSummary] = []
    for s in supervisors:
        sp = sup_periods.get(s.id)
        norm = sp.norm_score if sp else None
        sup_summaries.append(
            SupervisorEvaluationSummary(
                supervisor_id=s.id,
                supervisor_name=s.full_name,
                norm_score=norm,
                summary_score=None,
                premium=award_supervisor(norm),
            )
        )

    total = sum(o.premium for o in summaries) + sum(s.premium for s in sup_summaries)

    return PeriodScoringOut(
        period_id=period_id,
        operators=[
            OperatorScoreOut(
                operator_id=o.operator_id,
                operator_name=o.operator_name,
                calls_handled=o.calls_handled,
                callback_calls=(
                    op_periods.get(o.operator_id).callback_calls
                    if op_periods.get(o.operator_id)
                    else 0
                ),
                has_critical_errors=o.has_critical_errors,
                critical_errors_reason=o.critical_errors_reason,
                evaluations_count=o.evaluations_count,
                is_supervisor=o.is_supervisor,
                auto_tone=o.auto_tone,
                auto_completeness=o.auto_completeness,
                auto_dialog=o.auto_dialog,
                tone_score=o.tone_score,
                completeness_score=o.completeness_score,
                dialog_score=o.dialog_score,
                summary_score=o.summary_score,
                override_tone=o.override_tone,
                override_completeness=o.override_completeness,
                override_dialog=o.override_dialog,
                override_reason=o.override_reason,
                rank=o.rank,
                premium=o.premium,
                excluded_reason=o.excluded_reason,
            )
            for o in summaries
        ],
        supervisors=[
            SupervisorScoreOut(
                supervisor_id=s.supervisor_id,
                supervisor_name=s.supervisor_name,
                norm_score=s.norm_score,
                summary_score=s.summary_score,
                premium=s.premium,
            )
            for s in sup_summaries
        ],
        total_premium=total,
    )
