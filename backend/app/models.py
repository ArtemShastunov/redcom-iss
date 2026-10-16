from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class UserRole(str, enum.Enum):
    SUPERVISOR = "supervisor"
    HEAD = "head"
    ADMIN = "admin"
    OPERATOR = "operator"


class PeriodStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[UserRole] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    operator_id: Mapped[int | None] = mapped_column(
        ForeignKey("operators.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    operator: Mapped[Operator | None] = relationship()


class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    ip: Mapped[str] = mapped_column(String(64), index=True)
    login: Mapped[str | None] = mapped_column(String(64), nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), index=True
    )
    success: Mapped[bool] = mapped_column(Boolean, default=False)


class Operator(Base):
    __tablename__ = "operators"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200), unique=True)
    premium_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Period(Base):
    __tablename__ = "periods"
    __table_args__ = (UniqueConstraint("year", "month", name="uq_periods_year_month"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    status: Mapped[PeriodStatus] = mapped_column(String(10), default=PeriodStatus.OPEN)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(primary_key=True)
    period_id: Mapped[int] = mapped_column(
        ForeignKey("periods.id", ondelete="CASCADE"), index=True
    )
    operator_id: Mapped[int] = mapped_column(ForeignKey("operators.id"), index=True)
    supervisor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    call_date: Mapped[datetime] = mapped_column(DateTime)
    phone: Mapped[str] = mapped_column(String(32))
    contract_number: Mapped[str | None] = mapped_column(String(64), nullable=True)

    tone: Mapped[int] = mapped_column(Integer)
    completeness: Mapped[int] = mapped_column(Integer)
    dialog_1c: Mapped[int] = mapped_column(Integer)

    question: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_was: Mapped[str | None] = mapped_column(Text, nullable=True)
    how_should_be: Mapped[str | None] = mapped_column(Text, nullable=True)
    impact: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    operator: Mapped[Operator] = relationship()
    supervisor: Mapped[User] = relationship()


class OperatorPeriod(Base):
    __tablename__ = "operator_periods"

    period_id: Mapped[int] = mapped_column(
        ForeignKey("periods.id", ondelete="CASCADE"), primary_key=True
    )
    operator_id: Mapped[int] = mapped_column(
        ForeignKey("operators.id"), primary_key=True
    )

    calls_incoming: Mapped[int] = mapped_column(Integer, default=0)
    calls_outgoing: Mapped[int] = mapped_column(Integer, default=0)
    chats_bitrix: Mapped[int] = mapped_column(Integer, default=0)
    chats_mobile: Mapped[int] = mapped_column(Integer, default=0)

    callback_calls: Mapped[int] = mapped_column(Integer, default=0)

    has_critical_errors: Mapped[bool] = mapped_column(Boolean, default=False)
    critical_errors_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    override_tone: Mapped[int | None] = mapped_column(Integer, nullable=True)
    override_completeness: Mapped[int | None] = mapped_column(Integer, nullable=True)
    override_dialog: Mapped[int | None] = mapped_column(Integer, nullable=True)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    operator: Mapped[Operator] = relationship()

    @property
    def calls_handled(self) -> int:
        return (
            (self.calls_incoming or 0)
            + (self.calls_outgoing or 0)
            + (self.chats_bitrix or 0)
            + (self.chats_mobile or 0)
        )


class SupervisorPeriod(Base):
    __tablename__ = "supervisor_periods"

    period_id: Mapped[int] = mapped_column(
        ForeignKey("periods.id", ondelete="CASCADE"), primary_key=True
    )
    supervisor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    norm_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    supervisor: Mapped[User] = relationship()


class DebtorPeriod(Base):
    __tablename__ = "debtor_periods"
    __table_args__ = (
        UniqueConstraint("year", "month", name="uq_debtor_periods_year_month"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class DebtorRecord(Base):
    __tablename__ = "debtor_records"
    __table_args__ = (
        UniqueConstraint(
            "period_id", "operator_id", name="uq_debtor_records_period_operator"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    period_id: Mapped[int] = mapped_column(
        ForeignKey("debtor_periods.id", ondelete="CASCADE"), index=True
    )
    operator_id: Mapped[int] = mapped_column(ForeignKey("operators.id"), index=True)
    previous_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    current_amount: Mapped[float] = mapped_column(Numeric(14, 2), default=0)

    operator: Mapped[Operator] = relationship()
