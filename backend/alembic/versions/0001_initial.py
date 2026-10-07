"""initial

Revision ID: 0001
Revises:
Create Date: 2026-10-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("login", sa.String(64), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_login", "users", ["login"], unique=True)

    op.create_table(
        "operators",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_operators_full_name", "operators", ["full_name"], unique=True)

    op.create_table(
        "periods",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("status", sa.String(10), nullable=False, server_default="open"),
        sa.Column("closed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("year", "month", name="uq_periods_year_month"),
    )

    op.create_table(
        "evaluations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("period_id", sa.Integer, sa.ForeignKey("periods.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operator_id", sa.Integer, sa.ForeignKey("operators.id"), nullable=False),
        sa.Column("supervisor_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("call_date", sa.DateTime, nullable=False),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column("contract_number", sa.String(64), nullable=True),
        sa.Column("tone", sa.Integer, nullable=False),
        sa.Column("completeness", sa.Integer, nullable=False),
        sa.Column("dialog_1c", sa.Integer, nullable=False),
        sa.Column("question", sa.Text, nullable=True),
        sa.Column("what_was", sa.Text, nullable=True),
        sa.Column("how_should_be", sa.Text, nullable=True),
        sa.Column("impact", sa.Text, nullable=True),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_evaluations_period_id", "evaluations", ["period_id"])
    op.create_index("ix_evaluations_operator_id", "evaluations", ["operator_id"])
    op.create_index("ix_evaluations_supervisor_id", "evaluations", ["supervisor_id"])

    op.create_table(
        "operator_periods",
        sa.Column("period_id", sa.Integer, sa.ForeignKey("periods.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("operator_id", sa.Integer, sa.ForeignKey("operators.id"), primary_key=True),
        sa.Column("calls_handled", sa.Integer, nullable=False, server_default="0"),
        sa.Column("has_critical_errors", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("critical_errors_reason", sa.Text, nullable=True),
    )

    op.create_table(
        "supervisor_periods",
        sa.Column("period_id", sa.Integer, sa.ForeignKey("periods.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("supervisor_id", sa.Integer, sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("norm_score", sa.Integer, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("supervisor_periods")
    op.drop_table("operator_periods")
    op.drop_index("ix_evaluations_supervisor_id", "evaluations")
    op.drop_index("ix_evaluations_operator_id", "evaluations")
    op.drop_index("ix_evaluations_period_id", "evaluations")
    op.drop_table("evaluations")
    op.drop_table("periods")
    op.drop_index("ix_operators_full_name", "operators")
    op.drop_table("operators")
    op.drop_index("ix_users_login", "users")
    op.drop_table("users")
