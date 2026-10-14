"""Роль operator + users.operator_id + login_attempts

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-14
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users.operator_id
    op.add_column("users", sa.Column("operator_id", sa.Integer, nullable=True))
    op.create_foreign_key(
        "fk_users_operator_id",
        "users",
        "operators",
        ["operator_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_users_operator_id", "users", ["operator_id"])

    # login_attempts
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("ip", sa.String(64), nullable=False),
        sa.Column("login", sa.String(64), nullable=True),
        sa.Column("attempted_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("success", sa.Boolean, nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_login_attempts_ip", "login_attempts", ["ip"])
    op.create_index("ix_login_attempts_attempted_at", "login_attempts", ["attempted_at"])


def downgrade() -> None:
    op.drop_index("ix_login_attempts_attempted_at", table_name="login_attempts")
    op.drop_index("ix_login_attempts_ip", table_name="login_attempts")
    op.drop_table("login_attempts")

    op.drop_index("ix_users_operator_id", table_name="users")
    op.drop_constraint("fk_users_operator_id", "users", type_="foreignkey")
    op.drop_column("users", "operator_id")
