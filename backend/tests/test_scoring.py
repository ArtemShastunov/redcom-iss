"""Тесты правил расчёта — §3.5 + override + рейтинг «по 2 на место»."""
from app.scoring import (
    OperatorEvaluationSummary,
    award_supervisor,
    derive_completeness,
    derive_dialog,
    derive_summary,
    derive_tone,
    rank_and_award_operators,
    score_operator,
)


# ---------- тон ----------

def test_tone_poor_if_any_negative():
    assert derive_tone([0, 0, -1]) == -1
    assert derive_tone([1, 1, -1]) == -1


def test_tone_max_if_two_positive():
    assert derive_tone([1, 1, 0]) == 1
    assert derive_tone([1, 1, 1]) == 1


def test_tone_normal_otherwise():
    assert derive_tone([0, 0, 0]) == 0
    assert derive_tone([1, 0, 0]) == 0


# ---------- полнота ----------

def test_completeness_poor_if_three_negative():
    assert derive_completeness([-1, -1, -1, 0]) == -1


def test_completeness_max_if_three_positive():
    assert derive_completeness([1, 1, 1, 0]) == 1


def test_completeness_normal_otherwise():
    assert derive_completeness([-1, -1, 0]) == 0
    assert derive_completeness([1, 1, 0]) == 0


# ---------- диалог ----------

def test_dialog_poor_if_six_negative():
    assert derive_dialog([-1] * 6) == -1


def test_dialog_normal_if_three_negative():
    assert derive_dialog([-1, -1, -1, 0]) == 0


def test_dialog_max_otherwise():
    assert derive_dialog([0, 0, 0, -1, -1]) == 1
    assert derive_dialog([]) == 1


# ---------- сводная ----------

def test_summary_floor():
    assert derive_summary(1, 1, 1) == 1
    assert derive_summary(0, 0, 0) == 0
    assert derive_summary(-1, 0, 1) == 0
    assert derive_summary(-1, -1, 0) == -1
    assert derive_summary(1, 0, 0) == 0


# ---------- премия супервайзера ----------

def test_supervisor_premium():
    assert award_supervisor(None) == 0
    assert award_supervisor(0) == 3000
    assert award_supervisor(1) == 6000
    assert award_supervisor(-1) == 0


# ---------- рейтинг ----------

def _item(id_, name, calls, summary, critical=False, evals=30):
    return OperatorEvaluationSummary(
        operator_id=id_, operator_name=name,
        calls_handled=calls,
        has_critical_errors=critical,
        critical_errors_reason=None,
        evaluations_count=evals,
        auto_tone=0, auto_completeness=0, auto_dialog=0,
        tone_score=0, completeness_score=0, dialog_score=0,
        summary_score=summary,
    )


def test_ranking_two_per_place_1_1_2_2_3_3():
    items = [_item(i, f"op{i}", 1000 - i * 10, 1) for i in range(1, 7)]
    result = rank_and_award_operators(items)
    in_rank = sorted(
        [x for x in result if x.rank is not None], key=lambda x: -x.calls_handled
    )
    assert [x.rank for x in in_rank] == [1, 1, 2, 2, 3, 3]


def test_ranking_premium_by_place_and_summary():
    items = [
        _item(1, "A", 1000, 1),  # поз 1 -> rank 1, Макс -> 5000
        _item(2, "B", 900, 0),   # поз 2 -> rank 1, Хор -> 2500
        _item(3, "C", 800, 1),   # поз 3 -> rank 2, Макс -> 4000
        _item(4, "D", 700, 0),   # поз 4 -> rank 2, Хор -> 2000
        _item(5, "E", 600, 1),   # поз 5 -> rank 3, Макс -> 3000
        _item(6, "F", 500, 0),   # поз 6 -> rank 3, Хор -> 1500
    ]
    result = rank_and_award_operators(items)
    premiums = {x.operator_id: x.premium for x in result}
    ranks = {x.operator_id: x.rank for x in result}
    assert ranks == {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3}
    assert premiums == {1: 5000, 2: 2500, 3: 4000, 4: 2000, 5: 3000, 6: 1500}


def test_ranking_excludes_critical_and_poor():
    items = [
        _item(1, "A", 100, 1, critical=True),
        _item(2, "B", 200, 0),
        _item(3, "C", 50, -1),
        _item(4, "D", 10, 1),
    ]
    result = rank_and_award_operators(items)
    ids_in_rank = [x.operator_id for x in result if x.rank is not None]
    assert 1 not in ids_in_rank
    assert 3 not in ids_in_rank
    assert ids_in_rank == [2, 4]

    excluded = {x.operator_id: x.excluded_reason for x in result if x.rank is None}
    assert excluded[1] == "Критические ошибки"
    assert excluded[3] == "Сводная оценка Плохо"


def test_ranking_excludes_no_evaluations():
    items = [
        _item(1, "A", 500, 0, evals=0),
        _item(2, "B", 200, 0, evals=30),
    ]
    result = rank_and_award_operators(items)
    b = next(x for x in result if x.operator_id == 2)
    a = next(x for x in result if x.operator_id == 1)
    assert b.rank == 1
    assert a.rank is None
    assert a.premium == 0
    assert a.excluded_reason == "Нет оценок"


def test_ranking_outside_top6():
    items = [_item(i, f"op{i}", 1000 - i * 10, 1) for i in range(1, 9)]
    result = rank_and_award_operators(items)
    in_rank = [x for x in result if x.rank is not None]
    out_rank = [x for x in result if x.rank is None]
    assert len(in_rank) == 6
    assert len(out_rank) == 2
    assert all(x.premium == 0 for x in out_rank)
    assert all(x.excluded_reason == "Вне топ-6" for x in out_rank)


# ---------- override ----------

class _FakePeriod:
    def __init__(self, ot=None, oc=None, od=None, reason=None):
        self.override_tone = ot
        self.override_completeness = oc
        self.override_dialog = od
        self.override_reason = reason


def test_override_none_uses_auto():
    s = score_operator(
        operator_id=1, operator_name="A",
        tone_scores=[1, 1, 0], completeness_scores=[1, 1, 1],
        dialog_scores=[1] * 30,
        calls_handled=10, has_critical_errors=False,
        critical_errors_reason=None, op_period=None,
    )
    assert s.auto_tone == 1 and s.tone_score == 1
    assert s.auto_completeness == 1 and s.completeness_score == 1
    assert s.auto_dialog == 1 and s.dialog_score == 1
    assert s.summary_score == 1


def test_override_single_field():
    s = score_operator(
        operator_id=1, operator_name="A",
        tone_scores=[0, 0, 0], completeness_scores=[0, 0, 0],
        dialog_scores=[1] * 30,
        calls_handled=10, has_critical_errors=False,
        critical_errors_reason=None,
        op_period=_FakePeriod(ot=1, reason="начальник поставил вручную"),
    )
    assert s.auto_tone == 0 and s.tone_score == 1
    assert s.auto_completeness == 0 and s.completeness_score == 0
    assert s.auto_dialog == 1 and s.dialog_score == 1
    assert s.summary_score == 0
    assert s.override_reason == "начальник поставил вручную"


def test_override_flips_summary():
    s = score_operator(
        operator_id=1, operator_name="A",
        tone_scores=[0] * 30, completeness_scores=[0] * 30,
        dialog_scores=[1] * 30,
        calls_handled=10, has_critical_errors=False,
        critical_errors_reason=None,
        op_period=_FakePeriod(ot=1, oc=1),
    )
    assert s.summary_score == 1
