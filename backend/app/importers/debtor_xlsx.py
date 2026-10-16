"""Импорт дебиторки из двух файлов:
  1. «прошлый месяц» — остатки;
  2. «текущий месяц» — поступления.

Оба файла — .xlsx. Парсер сам находит шапку в первых строках
(ищет колонки «Оператор» и «Сумма платежа»/«Сумма»). Если шапки нет —
использует дефолтное расположение: Сумма в колонке C, ФИО в колонке E.

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

# Дефолт, если шапку не нашли: Сумма в C, ФИО в E
DEFAULT_AMOUNT_COL = 3
DEFAULT_OPERATOR_COL = 5

# Максимум строк, среди которых ищем шапку
HEADER_SEARCH_LIMIT = 15


def _looks_like_fio(value) -> bool:
    if value is None:
        return False
    s = str(value).strip()
    return bool(FIO_PATTERN.match(s))


def _to_float(value) -> float:
    if value is None:
        return 0.0
    try:
        return float(str(value).replace(" ", "").replace(",", ".").strip())
    except (ValueError, TypeError):
        return 0.0


def _detect_columns(ws) -> tuple[int, int, int]:
    """Возвращает (operator_col, amount_col, first_data_row).

    Ищет шапку в первых HEADER_SEARCH_LIMIT строках. Ищет по всем колонкам
    слова «оператор» и «сумма».
    """
    operator_col: int | None = None
    amount_col: int | None = None
    header_row: int | None = None

    max_row = min(HEADER_SEARCH_LIMIT, ws.max_row)
    max_col = min(ws.max_column, 15)

    for row_idx in range(1, max_row + 1):
        row_operator_col: int | None = None
        row_amount_col: int | None = None
        for col_idx in range(1, max_col + 1):
            v = ws.cell(row=row_idx, column=col_idx).value
            if v is None or not isinstance(v, str):
                continue
            v_lower = v.strip().lower()
            if "оператор" in v_lower:
                row_operator_col = col_idx
            if "сумма" in v_lower:
                row_amount_col = col_idx
        if row_operator_col is not None and row_amount_col is not None:
            operator_col = row_operator_col
            amount_col = row_amount_col
            header_row = row_idx
            break

    if header_row is not None:
        return operator_col, amount_col, header_row + 1

    # Шапки нет — дефолт
    return DEFAULT_OPERATOR_COL, DEFAULT_AMOUNT_COL, 1


def _parse_file(path: Path) -> dict[str, float]:
    """Читает .xlsx и возвращает {ФИО: сумма}."""
    wb = load_workbook(path, data_only=True, read_only=True)
    ws = wb.active

    operator_col, amount_col, first_data_row = _detect_columns(ws)

    result: dict[str, float] = {}

    for row_idx in range(first_data_row, ws.max_row + 1):
        fio_raw = ws.cell(row=row_idx, column=operator_col).value
        if not _looks_like_fio(fio_raw):
            continue
        amount = _to_float(ws.cell(row=row_idx, column=amount_col).value)
        fio = str(fio_raw).strip()
        result[fio] = result.get(fio, 0.0) + amount

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
    previous = _parse_file(previous_path)
    current = _parse_file(current_path)

    period = db.scalar(
        select(DebtorPeriod).where(
            DebtorPeriod.year == year, DebtorPeriod.month == month
        )
    )
    if period is None:
        period = DebtorPeriod(year=year, month=month)
        db.add(period)
        db.flush()

    # Полная перезапись периода
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
