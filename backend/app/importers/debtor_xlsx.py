"""Импорт дебиторки из двух файлов:
  1. «прошлый месяц» — остатки;
  2. «текущий месяц» — поступления.

Оба файла — .xlsx (пересохранить .xls перед загрузкой).

Структура:
  * «прошлый месяц»: A=Сумма, C=ФИО («Фамилия И.О.»);
  * «текущий месяц»: внутри детального списка есть заголовки блоков
    F=Сумма, G=ФИО. Их и берём.

Итог — по каждому оператору:
  Итого   = previous + current
  5%      = Итого * 0.05
  На руки = 5% * 0.87 * 1.6
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from re import compile as re_compile

from openpyxl import load_workbook
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import DebtorPeriod, DebtorRecord, Operator

FIO_PATTERN = re_compile(r"^[А-ЯЁ][а-яё\-]+\s+[А-ЯЁ]\.[А-ЯЁ]?\.?$")


def _looks_like_fio(value) -> bool:
    if value is None:
        return False
    s = str(value).strip()
    return bool(FIO_PATTERN.match(s))


def _to_float(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(str(value).replace(",", ".").strip())
    except (ValueError, TypeError):
        return 0.0


def _parse_previous(path: Path) -> dict[str, float]:
    """A=Сумма, C=ФИО. Построчно."""
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb.active
    result: dict[str, float] = {}

    for row_idx in range(1, ws.max_row + 1):
        a = ws.cell(row=row_idx, column=1).value
        c = ws.cell(row=row_idx, column=3).value
        if not _looks_like_fio(c):
            continue
        amount = _to_float(a)
        fio = str(c).strip()
        result[fio] = result.get(fio, 0.0) + amount

    return result


def _parse_current(path: Path) -> dict[str, float]:
    """Заголовки блоков: F=Сумма, G=ФИО."""
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb.active
    result: dict[str, float] = {}

    for row_idx in range(1, ws.max_row + 1):
        f = ws.cell(row=row_idx, column=6).value
        g = ws.cell(row=row_idx, column=7).value
        if not _looks_like_fio(g):
            continue
        amount = _to_float(f)
        if amount <= 0:
            continue
        fio = str(g).strip()
        result[fio] = amount  # заголовок блока = итог оператора

    return result


@dataclass
class DebtorImportReport:
    period_id: int
    matched: int = 0
    unmatched: list[str] = field(default_factory=list)
    previous_only: list[str] = field(default_factory=list)
    current_only: list[str] = field(default_factory=list)


def import_debtor_xlsx(
    previous_path: Path,
    current_path: Path,
    db: Session,
    year: int,
    month: int,
) -> DebtorImportReport:
    previous = _parse_previous(previous_path)
    current = _parse_current(current_path)

    period = db.scalar(
        select(DebtorPeriod).where(DebtorPeriod.year == year, DebtorPeriod.month == month)
    )
    if period is None:
        period = DebtorPeriod(year=year, month=month)
        db.add(period)
        db.flush()

    db.execute(delete(DebtorRecord).where(DebtorRecord.period_id == period.id))

    report = DebtorImportReport(period_id=period.id)

    operators = list(db.scalars(select(Operator).order_by(Operator.id)))
    by_premium: dict[str, Operator] = {}
    by_surname: dict[str, list[Operator]] = {}
    for op in operators:
        if op.premium_name:
            by_premium[op.premium_name.strip().lower()] = op
        surname = op.full_name.strip().split()[0].lower() if op.full_name else ""
        if surname:
            by_surname.setdefault(surname, []).append(op)

    all_fios = set(previous.keys()) | set(current.keys())
    matched_fios: set[str] = set()

    for fio in sorted(all_fios):
        op = by_premium.get(fio.strip().lower())
        if op is None:
            surname = fio.strip().split()[0].lower()
            matches = by_surname.get(surname, [])
            if len(matches) == 1:
                op = matches[0]

        if op is None:
            report.unmatched.append(fio)
            continue

        matched_fios.add(fio)
        rec = DebtorRecord(
            period_id=period.id,
            operator_id=op.id,
            previous_amount=previous.get(fio, 0.0),
            current_amount=current.get(fio, 0.0),
        )
        db.add(rec)
        report.matched += 1

    report.previous_only = sorted(set(previous.keys()) - matched_fios)
    report.current_only = sorted(set(current.keys()) - matched_fios)

    db.commit()
    return report
