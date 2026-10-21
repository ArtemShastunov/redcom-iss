"""Добавление is_supervisor и операторов для Софьи/Ольги

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-21
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Добавляем флаг супервайзера
    op.add_column("operators", sa.Column("is_supervisor", sa.Boolean(), server_default=sa.false(), nullable=False))
    
    # Добавляем Соню и Олю в справочник операторов, чтобы их звонки не терялись
    op.execute("""
        INSERT INTO operators (full_name, premium_name, is_active, is_supervisor) 
        VALUES ('Софронова С.О.', 'Софронова С.О.', true, true) 
        ON CONFLICT (full_name) DO NOTHING;
    """)
    op.execute("""
        INSERT INTO operators (full_name, premium_name, is_active, is_supervisor) 
        VALUES ('Цебрежинская О.В.', 'Цебрежинская О.В.', true, true) 
        ON CONFLICT (full_name) DO NOTHING;
    """)

def downgrade() -> None:
    op.drop_column("operators", "is_supervisor")
