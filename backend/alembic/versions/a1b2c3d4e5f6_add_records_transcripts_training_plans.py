"""add_records_transcripts_training_plans

Revision ID: a1b2c3d4e5f6
Revises: 2afa4caa191a
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "2afa4caa191a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "records",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("patient_id", sa.String(length=32), nullable=False),
        sa.Column("praxis_id", sa.String(length=32), nullable=True),
        sa.Column("subjective", sa.Text(), nullable=True),
        sa.Column("objective", sa.Text(), nullable=True),
        sa.Column("assessment", sa.Text(), nullable=True),
        sa.Column("plan", sa.Text(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("record_type", sa.String(length=50), nullable=False),
        sa.Column("document_path", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_records_patient_id"), "records", ["patient_id"], unique=False)
    op.create_index(op.f("ix_records_praxis_id"), "records", ["praxis_id"], unique=False)

    op.create_table(
        "transcripts",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("patient_id", sa.String(length=32), nullable=True),
        sa.Column("praxis_id", sa.String(length=32), nullable=True),
        sa.Column("audio_path", sa.String(length=512), nullable=True),
        sa.Column("raw_text", sa.Text(), nullable=True),
        sa.Column("soap_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_transcripts_patient_id"), "transcripts", ["patient_id"], unique=False)
    op.create_index(op.f("ix_transcripts_praxis_id"), "transcripts", ["praxis_id"], unique=False)

    op.create_table(
        "training_plans",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("patient_id", sa.String(length=32), nullable=True),
        sa.Column("praxis_id", sa.String(length=32), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("exercises_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_template", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_training_plans_patient_id"), "training_plans", ["patient_id"], unique=False
    )
    op.create_index(
        op.f("ix_training_plans_praxis_id"), "training_plans", ["praxis_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_training_plans_praxis_id"), table_name="training_plans")
    op.drop_index(op.f("ix_training_plans_patient_id"), table_name="training_plans")
    op.drop_table("training_plans")
    op.drop_index(op.f("ix_transcripts_praxis_id"), table_name="transcripts")
    op.drop_index(op.f("ix_transcripts_patient_id"), table_name="transcripts")
    op.drop_table("transcripts")
    op.drop_index(op.f("ix_records_praxis_id"), table_name="records")
    op.drop_index(op.f("ix_records_patient_id"), table_name="records")
    op.drop_table("records")
