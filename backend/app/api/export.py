from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db
from ..exporters.iss_xlsx import build_iss_xlsx_bytes
from ..models import Period, User

router = APIRouter(prefix="/api/periods", tags=["export"])

MONTHS_RU = {
    1: "Январь", 2: "Февраль", 3: "Март", 4: "Апрель",
    5: "Май", 6: "Июнь", 7: "Июль", 8: "Август",
    9: "Сентябрь", 10: "Октябрь", 11: "Ноябрь", 12: "Декабрь",
}


@router.get("/{period_id}/export")
def export_period_xlsx(
    period_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Response:
    period = db.scalar(select(Period).where(Period.id == period_id))
    if period is None:
        raise HTTPException(404, "Period not found")

    month_label = MONTHS_RU.get(period.month, str(period.month))
    data = build_iss_xlsx_bytes(db, period, month_label)

    filename = f"Совместные итоги_{month_label}_{period.year}.xlsx"
    quoted = quote(filename)
    return Response(
        content=data,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quoted}",
        },
    )
