"""debtor_periods + debtor_records

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "debtor_periods",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("year", "month", name="uq_debtor_periods_year_month"),
    )

    op.create_table(
        "debtor_records",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "period_id", sa.Integer,
            sa.ForeignKey("debtor_periods.id", ondelete="CASCADE"),
            nullable=False, index=True,
        ),
        sa.Column(
            "operator_id", sa.Integer,
            sa.ForeignKey("operators.id"),
            nullable=False, index=True,
        ),
        sa.Column("previous_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("current_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.UniqueConstraint("period_id", "operator_id", name="uq_debtor_records_period_operator"),
    )


def downgrade() -> None:
    op.drop_table("debtor_records")
    op.drop_table("debtor_periods")
