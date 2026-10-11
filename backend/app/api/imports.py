import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..deps import get_db, require_role
from ..importers.callbacks_xlsx import import_callbacks_xlsx
from ..importers.premiums_xlsx import import_premiums_xlsx
from ..models import Period, User, UserRole

router = APIRouter(prefix="/api/periods", tags=["imports"])


# ---------- премии ----------

class MatchedRow(BaseModel):
    db_name: str
    file_name: str


class PremiumsImportResponse(BaseModel):
    period_id: int
    rows_total: int
    matched: list[MatchedRow]
    not_matched: list[str]
    created: int
    updated: int


@router.post(
    "/{period_id}/import-premiums",
    response_model=PremiumsImportResponse,
)
async def import_premiums(
    period_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> PremiumsImportResponse:
    period = db.get(Period, period_id)
    if period is None:
        raise HTTPException(404, "Period not found")
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "Ожидается файл .xlsx")

    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        report = import_premiums_xlsx(
            path=tmp_path, db=db, year=period.year, month=period.month,
        )
    except Exception as e:
        raise HTTPException(400, f"Ошибка импорта: {e}") from e
    finally:
        tmp_path.unlink(missing_ok=True)

    return PremiumsImportResponse(
        period_id=report.period_id,
        rows_total=report.rows_total,
        matched=[MatchedRow(db_name=d, file_name=f) for d, f in report.matched],
        not_matched=report.not_matched,
        created=report.created,
        updated=report.updated,
    )


# ---------- заказные (обратные) звонки ----------

class CallbackRow(BaseModel):
    db_name: str
    file_name: str
    count: int


class CallbacksNotMatched(BaseModel):
    file_name: str
    count: int


class CallbacksImportResponse(BaseModel):
    period_id: int
    rows_total: int
    matched: list[CallbackRow]
    not_matched: list[CallbacksNotMatched]
    created: int
    updated: int


@router.post(
    "/{period_id}/import-callbacks",
    response_model=CallbacksImportResponse,
)
async def import_callbacks(
    period_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.HEAD, UserRole.ADMIN)),
) -> CallbacksImportResponse:
    period = db.get(Period, period_id)
    if period is None:
        raise HTTPException(404, "Period not found")
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "Ожидается файл .xlsx")

    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        report = import_callbacks_xlsx(
            path=tmp_path, db=db, year=period.year, month=period.month,
        )
    except Exception as e:
        raise HTTPException(400, f"Ошибка импорта: {e}") from e
    finally:
        tmp_path.unlink(missing_ok=True)

    return CallbacksImportResponse(
        period_id=report.period_id,
        rows_total=report.rows_total,
        matched=[
            CallbackRow(db_name=d, file_name=f, count=c)
            for d, f, c in report.matched
        ],
        not_matched=[
            CallbacksNotMatched(file_name=f, count=c)
            for f, c in report.not_matched
        ],
        created=report.created,
        updated=report.updated,
    )
