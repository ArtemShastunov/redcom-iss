from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from .models import UserRole


Score = Literal[-1, 0, 1]


# ---------- operators ----------


class OperatorIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    premium_name: str | None = Field(default=None, max_length=200)
    is_active: bool = True


class OperatorPatch(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    premium_name: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None


class OperatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    premium_name: str | None
    is_active: bool


# ---------- periods ----------


class PeriodIn(BaseModel):
    year: int = Field(ge=2024, le=2100)
    month: int = Field(ge=1, le=12)


class PeriodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    year: int
    month: int
    status: str
    closed_at: datetime | None


# ---------- users ----------


class UserShort(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    role: UserRole


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    login: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserIn(BaseModel):
    login: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=200)
    full_name: str = Field(min_length=1, max_length=200)
    role: UserRole


class UserPatch(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    role: UserRole | None = None
    is_active: bool | None = None


class PasswordChangeIn(BaseModel):
    new_password: str = Field(min_length=1, max_length=200)


# ---------- evaluations ----------


class EvaluationIn(BaseModel):
    period_id: int
    operator_id: int
    supervisor_id: int | None = None
    call_date: datetime
    phone: str = Field(min_length=1, max_length=32)
    contract_number: str | None = None
    tone: Score
    completeness: Score
    dialog_1c: Score
    question: str | None = None
    what_was: str | None = None
    how_should_be: str | None = None
    impact: str | None = None
    comment: str | None = None


class EvaluationPatch(BaseModel):
    call_date: datetime | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    contract_number: str | None = None
    tone: Score | None = None
    completeness: Score | None = None
    dialog_1c: Score | None = None
    question: str | None = None
    what_was: str | None = None
    how_should_be: str | None = None
    impact: str | None = None
    comment: str | None = None
    supervisor_id: int | None = None


class EvaluationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    period_id: int
    call_date: datetime
    phone: str
    contract_number: str | None
    tone: int
    completeness: int
    dialog_1c: int
    question: str | None
    what_was: str | None
    how_should_be: str | None
    impact: str | None
    comment: str | None
    created_at: datetime
    updated_at: datetime
    operator: OperatorOut
    supervisor: UserShort


# ---------- operator_periods ----------


class OperatorPeriodIn(BaseModel):
    calls_incoming: int = Field(default=0, ge=0)
    calls_outgoing: int = Field(default=0, ge=0)
    chats_bitrix: int = Field(default=0, ge=0)
    chats_mobile: int = Field(default=0, ge=0)
    callback_calls: int = Field(default=0, ge=0)
    has_critical_errors: bool = False
    critical_errors_reason: str | None = None
    override_tone: Score | None = None
    override_completeness: Score | None = None
    override_dialog: Score | None = None
    override_reason: str | None = None


class OperatorPeriodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    period_id: int
    calls_incoming: int
    calls_outgoing: int
    chats_bitrix: int
    chats_mobile: int
    callback_calls: int
    has_critical_errors: bool
    critical_errors_reason: str | None
    override_tone: int | None
    override_completeness: int | None
    override_dialog: int | None
    override_reason: str | None
    operator: OperatorOut

    @computed_field
    @property
    def calls_handled(self) -> int:
        return (
            (self.calls_incoming or 0)
            + (self.calls_outgoing or 0)
            + (self.chats_bitrix or 0)
            + (self.chats_mobile or 0)
        )


# ---------- supervisor_periods ----------


class SupervisorPeriodIn(BaseModel):
    norm_score: Score | None = None


class SupervisorPeriodOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    period_id: int
    norm_score: int | None
    supervisor: UserShort
