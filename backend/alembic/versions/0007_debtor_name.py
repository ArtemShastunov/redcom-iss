"""debtor_records.name + operator_id nullable

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("debtor_records", sa.Column("name", sa.String(200), nullable=True))

    op.execute("""
        UPDATE debtor_records
        SET name = (SELECT full_name FROM operators WHERE operators.id = debtor_records.operator_id)
        WHERE name IS NULL
    """)

    op.alter_column("debtor_records", "name", nullable=False)
    op.alter_column("debtor_records", "operator_id", nullable=True)

    # Меняем unique constraint: теперь по (period_id, name), а не (period_id, operator_id)
    op.drop_constraint(
        "uq_debtor_records_period_operator", "debtor_records", type_="unique"
    )
    op.create_unique_constraint(
        "uq_debtor_records_period_name", "debtor_records", ["period_id", "name"]
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_debtor_records_period_name", "debtor_records", type_="unique"
    )
    op.create_unique_constraint(
        "uq_debtor_records_period_operator", "debtor_records",
        ["period_id", "operator_id"],
    )
    op.alter_column("debtor_records", "operator_id", nullable=False)
    op.drop_column("debtor_records", "name")
