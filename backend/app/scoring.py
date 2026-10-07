"""Чистые функции расчёта оценок и премий по Положению о премировании ИСС.

Правила — пороговые из §3.5 Положения. Источник истины — документ,
а не Excel-файл: там смесь формул INT(AVERAGE) и ручных констант, единого
алгоритма нет.

Поверх авторасчёта допускаются ручные правки (override) от начальника
отдела. Если override-поле не NULL — оно перекрывает авторасчёт по этой
метрике. Сводная всегда считается из эффективных значений.

Рейтинг — по 2 человека на место (1, 1, 2, 2, 3, 3), как в отделе
исторически. Место определяет размер премии.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from .models import OperatorPeriod


# ---------- производные оценки (пороговые правила §3.5) ----------

def derive_tone(scores: list[int]) -> int:
    c = Counter(scores)
    if c.get(-1, 0) >= 1:
        return -1
    if c.get(1, 0) >= 2:
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
    neg = c.get(-1, 0)
    if neg >= 6:
        return -1
    if neg >= 3:
        return 0
    return 1


def derive_summary(*derived: int) -> int:
    if not derived:
        raise ValueError("derive_summary requires at least one score")
    return sum(derived) // len(derived)


# ---------- override ----------

def _effective(derived: int, override: int | None) -> int:
    """Возвращает override, если он задан, иначе — авторасчёт."""
    return override if override is not None else derived


# ---------- премия ----------

# Место в рейтинге → {сводная оценка: премия}.
# По 2 человека на место, значит мест 1..3 покрывают топ-6.
OPERATOR_PREMIUM: dict[int, dict[int, int]] = {
    1: {0: 2500, 1: 5000},
    2: {0: 2000, 1: 4000},
    3: {0: 1500, 1: 3000},
}

SUPERVISOR_PREMIUM: dict[int, int] = {0: 3000, 1: 6000}

# Сколько человек делят одно место
RANK_GROUP_SIZE = 2

# Сколько всего мест в премиальном топе (6 человек = 3 места × 2)
MAX_RANK = 3


# ---------- структуры ----------

@dataclass
class OperatorEvaluationSummary:
    operator_id: int
    operator_name: str
    calls_handled: int
    has_critical_errors: bool
    critical_errors_reason: str | None
    evaluations_count: int

    auto_tone: int
    auto_completeness: int
    auto_dialog: int

    tone_score: int
    completeness_score: int
    dialog_score: int

    summary_score: int

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


# ---------- агрегация для оператора ----------

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


# ---------- рейтинг и премии операторов ----------

def rank_and_award_operators(
    items: list[OperatorEvaluationSummary],
) -> list[OperatorEvaluationSummary]:
    """Сортирует по calls_handled desc, выставляет rank и premium.

    Формат мест — «по 2 человека на место»: 1, 1, 2, 2, 3, 3.
    Топ-6 = 3 места × 2 человека. Премия зависит от места и сводной оценки.

    Из рейтинга исключаются:
      * операторы с критическими ошибками;
      * операторы со сводной -1 (Плохо);
      * операторы без оценок в текущем периоде.

    Все исключённые остаются в списке с excluded_reason.
    """
    eligible: list[OperatorEvaluationSummary] = []
    ineligible: list[OperatorEvaluationSummary] = []

    for i in items:
        if i.has_critical_errors:
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
        else:
            eligible.append(i)

    eligible.sort(key=lambda x: (-x.calls_handled, x.operator_name))

    max_people = MAX_RANK * RANK_GROUP_SIZE  # 6
    for pos, item in enumerate(eligible, start=1):
        if pos > max_people:
            item.rank = None
            item.premium = 0
            item.excluded_reason = "Вне топ-6"
            continue
        # позиция 1,2 -> место 1; позиция 3,4 -> место 2; позиция 5,6 -> место 3
        rank = (pos - 1) // RANK_GROUP_SIZE + 1
        item.rank = rank
        item.premium = OPERATOR_PREMIUM[rank].get(item.summary_score, 0)

    return eligible + ineligible


# ---------- премия супервайзера ----------

def award_supervisor(norm_score: int | None) -> int:
    if norm_score is None:
        return 0
    return SUPERVISOR_PREMIUM.get(norm_score, 0)
