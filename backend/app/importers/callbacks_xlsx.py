from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
import re
from pathlib import Path

from openpyxl import load_workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Operator, OperatorPeriod, Period, PeriodStatus
from .premiums_xlsx import _build_indexes, _find_operator


@dataclass
class CallbacksImportReport:
    period_id: int
    rows_total: int = 0
    matched: list[tuple[str, str, int]] = field(default_factory=list)
    not_matched: list[tuple[str, int]] = field(default_factory=list)
    created: int = 0
    updated: int = 0


def _parse_callbacks_file(path: Path) -> tuple[dict[str, int], int | None, int | None]:
    if path.suffix.lower() != ".xlsx":
        raise ValueError(f"Только .xlsx поддерживается (получено {path.suffix!r})")

    wb = load_workbook(path, data_only=True, read_only=True)

    # 1. Ищем лист, где есть заголовок "Оператор"
    ws = None
    for sheet in wb.worksheets:
        row1 = [str(cell.value).strip() if cell.value else "" for cell in sheet[1]]
        if "Оператор" in row1:
            ws = sheet
            break

    if ws is None:
        ws = wb.worksheets[0]  # Фолбэк, если заголовки не найдены

    # 2. Ищем индексы колонок по заголовкам (устойчиво к сдвигу колонок)
    header_row = None
    op_col_idx = 6
    date_col_idx = 1

    for row_idx in range(1, min(10, ws.max_row + 1)):
        row_vals = [
            str(ws.cell(row=row_idx, column=c).value).strip()
            for c in range(1, ws.max_column + 1)
        ]
        if "Оператор" in row_vals:
            header_row = row_idx
            op_col_idx = row_vals.index("Оператор") + 1
            if "Дата звонка" in row_vals:
                date_col_idx = row_vals.index("Дата звонка") + 1
            break

    start_row = (header_row + 1) if header_row else 2
    counts: dict[str, int] = {}
    detected_year = None
    detected_month = None

    # 3. Читаем данные
    for row_idx in range(start_row, ws.max_row + 1):
        operator_raw = ws.cell(row=row_idx, column=op_col_idx).value
        if operator_raw is not None:
            name = str(operator_raw).strip()
            if name:
                counts[name] = counts.get(name, 0) + 1

        # 4. Извлекаем дату из первой же заполненной строки
        if detected_year is None:
            date_val = ws.cell(row=row_idx, column=date_col_idx).value
            if isinstance(date_val, datetime):
                detected_year = date_val.year
                detected_month = date_val.month
            elif isinstance(date_val, str):
                # На случай, если дата записана текстом (dd.mm.yyyy)
                match = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", date_val)
                if match:
                    detected_month = int(match.group(2))
                    detected_year = int(match.group(3))

    return counts, detected_year, detected_month


def import_callbacks_xlsx(
    path: Path, db: Session, year: int, month: int
) -> CallbacksImportReport:
    counts, file_year, file_month = _parse_callbacks_file(path)

    # 🔥 ВАЛИДАЦИЯ: Проверяем, совпадают ли даты в файле с выбранным периодом
    if file_year is not None and file_month is not None:
        if file_year != year or file_month != month:
            raise ValueError(
                f"Файл содержит данные за {file_month:02d}.{file_year}, "
                f"а период выбран {month:02d}.{year}. "
                f"Пожалуйста, перейдите в правильный период или загрузите файл, соответствующий месяцу."
            )

    period = db.scalar(select(Period).where(Period.year == year, Period.month == month))
    if period is None:
        period = Period(year=year, month=month, status=PeriodStatus.OPEN)
        db.add(period)
        db.flush()

    report = CallbacksImportReport(period_id=period.id)
    report.rows_total = sum(counts.values())

    # ВАЖНО: Сбрасываем старые заказные звонки за этот период в 0
    op_periods_all = list(
        db.scalars(select(OperatorPeriod).where(OperatorPeriod.period_id == period.id))
    )
    for op in op_periods_all:
        op.callback_calls = 0

    operators = list(db.scalars(select(Operator).order_by(Operator.id)))
    by_premium, by_surname = _build_indexes(operators)

    for file_name, count in counts.items():
        op, _ = _find_operator(file_name, by_premium, by_surname)
        if op is None:
            report.not_matched.append((file_name, count))
            continue

        op_period = db.get(OperatorPeriod, (period.id, op.id))
        if op_period is None:
            op_period = OperatorPeriod(period_id=period.id, operator_id=op.id)
            db.add(op_period)
            report.created += 1
        else:
            report.updated += 1

        op_period.callback_calls = count
        report.matched.append((op.full_name, file_name, count))

    db.commit()
    return report
