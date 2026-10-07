"""operators.premium_name + operator_periods разложение calls_handled

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("operators", sa.Column("premium_name", sa.String(200), nullable=True))

    op.add_column(
        "operator_periods",
        sa.Column("calls_incoming", sa.Integer, nullable=False, server_default="0"),
    )
    op.add_column(
        "operator_periods",
        sa.Column("calls_outgoing", sa.Integer, nullable=False, server_default="0"),
    )
    op.add_column(
        "operator_periods",
        sa.Column("chats_bitrix", sa.Integer, nullable=False, server_default="0"),
    )
    op.add_column(
        "operator_periods",
        sa.Column("chats_mobile", sa.Integer, nullable=False, server_default="0"),
    )
    op.drop_column("operator_periods", "calls_handled")


def downgrade() -> None:
    op.add_column(
        "operator_periods",
        sa.Column("calls_handled", sa.Integer, nullable=False, server_default="0"),
    )
    op.drop_column("operator_periods", "chats_mobile")
    op.drop_column("operator_periods", "chats_bitrix")
    op.drop_column("operator_periods", "calls_outgoing")
    op.drop_column("operator_periods", "calls_incoming")
    op.drop_column("operators", "premium_name")
