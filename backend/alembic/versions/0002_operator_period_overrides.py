"""operator_period overrides

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("operator_periods", sa.Column("override_tone", sa.Integer, nullable=True))
    op.add_column("operator_periods", sa.Column("override_completeness", sa.Integer, nullable=True))
    op.add_column("operator_periods", sa.Column("override_dialog", sa.Integer, nullable=True))
    op.add_column("operator_periods", sa.Column("override_reason", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("operator_periods", "override_reason")
    op.drop_column("operator_periods", "override_dialog")
    op.drop_column("operator_periods", "override_completeness")
    op.drop_column("operator_periods", "override_tone")
