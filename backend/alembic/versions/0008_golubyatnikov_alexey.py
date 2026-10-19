"""Голубятников Леша -> Голубятников Алексей

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-19
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Переименовываем в справочнике операторов
    op.execute("""
        UPDATE operators
        SET full_name = 'Голубятников Алексей'
        WHERE full_name = 'Голубятников Леша'
    """)
    # Переименовываем в аккаунте пользователя
    op.execute("""
        UPDATE users
        SET full_name = 'Голубятников Алексей'
        WHERE full_name = 'Голубятников Леша'
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE operators
        SET full_name = 'Голубятников Леша'
        WHERE full_name = 'Голубятников Алексей'
    """)
    op.execute("""
        UPDATE users
        SET full_name = 'Голубятников Леша'
        WHERE full_name = 'Голубятников Алексей'
    """)
