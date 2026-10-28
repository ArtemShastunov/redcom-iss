"""Чистые функции расчёта оценок и премий."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from .models import OperatorPeriod


def derive_tone(scores: list[int]) -> int:
    c = Counter(scores)
    if c.get(-1, 0) >= 3:
        return -1
    if c.get(1, 0) >= 3:
        return 1
    return 0


def derive_completeness(scores: list[int]) -> int:
    c = Counter(scores)
    if c.get(-1, 0) >= 3:
        return -1
    if c.get(1, 0) >= 3:
        return 1
    return 0


def derive_dialog(scores: list[int]) -> int:
    c = Counter(scores)
    if c.get(-1, 0) >= 3:
        return -1
    if c.get(1, 0) >= 3:
        return 1
    return 0


def derive_summary(*derived: int) -> int:
    if not derived:
        raise ValueError("derive_summary requires at least one score")
    return sum(derived) // len(derived)


def _effective(derived: int, override: int | None) -> int:
    return override if override is not None else derived


OPERATOR_PREMIUM: dict[int, dict[int, int]] = {
    1: {0: 2500, 1: 5000},
    2: {0: 2500, 1: 5000},
    3: {0: 2000, 1: 4000},
    4: {0: 2000, 1: 4000},
    5: {0: 1500, 1: 3000},
    6: {0: 1500, 1: 3000},
}

SUPERVISOR_PREMIUM: dict[int, int] = {0: 3000, 1: 6000}

RANK_GROUP_SIZE = 2
MAX_RANK = 3


@dataclass
class OperatorEvaluationSummary:
    operator_id: int
    operator_name: str
    calls_handled: int
    has_critical_errors: bool
    critical_errors_reason: str | None
    evaluations_count: int
    is_supervisor: bool = False  # <-- НОВОЕ ПОЛЕ

    auto_tone: int = 0
    auto_completeness: int = 0
    auto_dialog: int = 0

    tone_score: int = 0
    completeness_score: int = 0
    dialog_score: int = 0

    summary_score: int = 0

    override_tone: int | None = None
    override_completeness: int | None = None
    override_dialog: int | None = None
    override_reason: str | None = None

    rank: int | None = None
    premium: int = 0
    excluded_reason: str | None = None


@dataclass
class SupervisorEvaluationSummary:
    supervisor_id: int
    supervisor_name: str
    norm_score: int | None
    summary_score: int | None = None
    premium: int = 0


def score_operator(
    operator_id: int,
    operator_name: str,
    tone_scores: list[int],
    completeness_scores: list[int],
    dialog_scores: list[int],
    calls_handled: int,
    has_critical_errors: bool,
    critical_errors_reason: str | None,
    op_period: OperatorPeriod | None = None,
    is_supervisor: bool = False,  # <-- НОВЫЙ АРГУМЕНТ
) -> OperatorEvaluationSummary:
    auto_tone = derive_tone(tone_scores)
    auto_comp = derive_completeness(completeness_scores)
    auto_dialog = derive_dialog(dialog_scores)

    ov_t = op_period.override_tone if op_period else None
    ov_c = op_period.override_completeness if op_period else None
    ov_d = op_period.override_dialog if op_period else None
    ov_reason = op_period.override_reason if op_period else None

    tone = _effective(auto_tone, ov_t)
    comp = _effective(auto_comp, ov_c)
    dialog = _effective(auto_dialog, ov_d)
    summary = derive_summary(tone, comp, dialog)

    return OperatorEvaluationSummary(
        operator_id=operator_id,
        operator_name=operator_name,
        calls_handled=calls_handled,
        has_critical_errors=has_critical_errors,
        critical_errors_reason=critical_errors_reason,
        evaluations_count=len(tone_scores),
        is_supervisor=is_supervisor,
        auto_tone=auto_tone,
        auto_completeness=auto_comp,
        auto_dialog=auto_dialog,
        tone_score=tone,
        completeness_score=comp,
        dialog_score=dialog,
        summary_score=summary,
        override_tone=ov_t,
        override_completeness=ov_c,
        override_dialog=ov_d,
        override_reason=ov_reason,
    )


def rank_and_award_operators(
    items: list[OperatorEvaluationSummary],
) -> list[OperatorEvaluationSummary]:
    eligible: list[OperatorEvaluationSummary] = []
    ineligible: list[OperatorEvaluationSummary] = []

    for i in items:
        if i.is_supervisor:
            i.rank = None
            i.premium = 0
            i.excluded_reason = "Супервайзер"
            ineligible.append(i)
        elif i.has_critical_errors:
            i.rank = None
            i.premium = 0
            i.excluded_reason = "Критические ошибки"
            ineligible.append(i)
        elif i.evaluations_count == 0:
            i.rank = None
            i.premium = 0
            i.excluded_reason = "Нет оценок"
            ineligible.append(i)
        elif i.summary_score == -1:
            i.rank = None
            i.premium = 0
            i.excluded_reason = "Сводная оценка Плохо"
            ineligible.append(i)
        elif i.calls_handled <= 0:
            i.rank = None
            i.premium = 0
            i.excluded_reason = "Нет данных по звонкам"
            ineligible.append(i)
        else:
            eligible.append(i)

    eligible.sort(key=lambda x: (-x.calls_handled, x.operator_name))

    max_people = MAX_RANK * RANK_GROUP_SIZE
    for pos, item in enumerate(eligible, start=1):
        if pos > max_people:
            item.rank = None
            item.premium = 0
            item.excluded_reason = "Вне топ-6"
            continue
        rank = (pos - 1) // RANK_GROUP_SIZE + 1
        item.rank = rank
        item.premium = OPERATOR_PREMIUM[rank].get(item.summary_score, 0)

    return eligible + ineligible


def award_supervisor(norm_score: int | None) -> int:
    if norm_score is None:
        return 0
    return SUPERVISOR_PREMIUM.get(norm_score, 0)
