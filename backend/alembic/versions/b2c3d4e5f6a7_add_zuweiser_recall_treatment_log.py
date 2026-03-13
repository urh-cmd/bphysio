"""add_zuweiser_recall_treatment_log

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "zuweiser",
        sa.Column("id", sa.String(32), nullable=False),
        sa.Column("praxis_id", sa.String(32), nullable=True),
        sa.Column("title", sa.String(50), nullable=True),
        sa.Column("first_name", sa.String(255), nullable=False),
        sa.Column("last_name", sa.String(255), nullable=False),
        sa.Column("specialization", sa.String(255), nullable=True),
        sa.Column("practice_name", sa.String(255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("fax", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_zuweiser_praxis_id"), "zuweiser", ["praxis_id"])

    op.create_table(
        "recalls",
        sa.Column("id", sa.String(32), nullable=False),
        sa.Column("patient_id", sa.String(32), nullable=False),
        sa.Column("praxis_id", sa.String(32), nullable=True),
        sa.Column("recall_date", sa.Date(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("notified", sa.Boolean(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recalls_patient_id"), "recalls", ["patient_id"])
    op.create_index(op.f("ix_recalls_praxis_id"), "recalls", ["praxis_id"])

    op.create_table(
        "treatment_logs",
        sa.Column("id", sa.String(32), nullable=False),
        sa.Column("patient_id", sa.String(32), nullable=False),
        sa.Column("praxis_id", sa.String(32), nullable=True),
        sa.Column("created_by", sa.String(32), nullable=True),
        sa.Column("treatment_date", sa.Date(), nullable=False),
        sa.Column("service_code", sa.String(50), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_treatment_logs_patient_id"), "treatment_logs", ["patient_id"])
    op.create_index(op.f("ix_treatment_logs_praxis_id"), "treatment_logs", ["praxis_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_treatment_logs_praxis_id"), "treatment_logs")
    op.drop_index(op.f("ix_treatment_logs_patient_id"), "treatment_logs")
    op.drop_table("treatment_logs")
    op.drop_index(op.f("ix_recalls_praxis_id"), "recalls")
    op.drop_index(op.f("ix_recalls_patient_id"), "recalls")
    op.drop_table("recalls")
    op.drop_index(op.f("ix_zuweiser_praxis_id"), "zuweiser")
    op.drop_table("zuweiser")
