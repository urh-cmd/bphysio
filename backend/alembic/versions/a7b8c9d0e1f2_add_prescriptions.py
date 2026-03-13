"""add prescriptions and prescription_id on treatment_logs

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "prescriptions",
        sa.Column("id", sa.String(32), nullable=False),
        sa.Column("patient_id", sa.String(32), nullable=False),
        sa.Column("zuweiser_id", sa.String(32), nullable=True),
        sa.Column("prescription_date", sa.Date(), nullable=False),
        sa.Column("valid_until", sa.Date(), nullable=True),
        sa.Column("diagnosis_code", sa.String(20), nullable=True),
        sa.Column("prescription_number", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["zuweiser_id"], ["zuweiser.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_prescriptions_patient_id"), "prescriptions", ["patient_id"])
    op.create_index(op.f("ix_prescriptions_zuweiser_id"), "prescriptions", ["zuweiser_id"])

    op.create_table(
        "prescription_items",
        sa.Column("id", sa.String(32), nullable=False),
        sa.Column("prescription_id", sa.String(32), nullable=False),
        sa.Column("service_code", sa.String(30), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["prescription_id"], ["prescriptions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_prescription_items_prescription_id"), "prescription_items", ["prescription_id"])

    op.add_column("treatment_logs", sa.Column("prescription_id", sa.String(32), nullable=True))
    op.create_foreign_key(
        "fk_treatment_logs_prescription_id",
        "treatment_logs",
        "prescriptions",
        ["prescription_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_treatment_logs_prescription_id"), "treatment_logs", ["prescription_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_treatment_logs_prescription_id"), "treatment_logs")
    op.drop_constraint("fk_treatment_logs_prescription_id", "treatment_logs", type_="foreignkey")
    op.drop_column("treatment_logs", "prescription_id")
    op.drop_index(op.f("ix_prescription_items_prescription_id"), "prescription_items")
    op.drop_table("prescription_items")
    op.drop_index(op.f("ix_prescriptions_zuweiser_id"), "prescriptions")
    op.drop_index(op.f("ix_prescriptions_patient_id"), "prescriptions")
    op.drop_table("prescriptions")
