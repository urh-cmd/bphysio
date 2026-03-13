"""add patient insurance fields

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("insurance_type", sa.String(20), nullable=True))
    op.add_column("patients", sa.Column("insurance_name", sa.String(255), nullable=True))
    op.add_column("patients", sa.Column("insurance_number", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "insurance_number")
    op.drop_column("patients", "insurance_name")
    op.drop_column("patients", "insurance_type")
