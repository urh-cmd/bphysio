"""add appointment tables (therapists, rooms, slots, appointments, online_booking_config)

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-03-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "therapists",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(32), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("specialization", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("availability_json", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_therapists_user_id"), "therapists", ["user_id"], unique=False)

    op.create_table(
        "rooms",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("resources", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "appointment_slots",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("therapist_id", sa.String(36), nullable=False),
        sa.Column("room_id", sa.String(36), nullable=True),
        sa.Column("start_time", sa.DateTime(), nullable=False),
        sa.Column("end_time", sa.DateTime(), nullable=False),
        sa.Column("slot_type", sa.String(50), nullable=False),
        sa.Column("is_booked", sa.Boolean(), nullable=False),
        sa.Column("requires_prescription", sa.Boolean(), nullable=False),
        sa.Column("min_notice_hours", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["therapist_id"], ["therapists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["room_id"], ["rooms.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appointment_slots_therapist_id"), "appointment_slots", ["therapist_id"])
    op.create_index(op.f("ix_appointment_slots_room_id"), "appointment_slots", ["room_id"])

    op.create_table(
        "appointments",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("slot_id", sa.String(36), nullable=False),
        sa.Column("patient_id", sa.String(32), nullable=True),
        sa.Column("patient_name", sa.String(255), nullable=False),
        sa.Column("patient_email", sa.String(255), nullable=False),
        sa.Column("patient_phone", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("reminder_sent", sa.Boolean(), nullable=False),
        sa.Column("reminder_sent_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["slot_id"], ["appointment_slots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slot_id", name="uq_appointments_slot_id"),
    )
    op.create_index(op.f("ix_appointments_slot_id"), "appointments", ["slot_id"], unique=True)
    op.create_index(op.f("ix_appointments_patient_id"), "appointments", ["patient_id"])

    op.create_table(
        "online_booking_config",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("is_enabled", sa.Boolean(), nullable=False),
        sa.Column("min_advance_hours", sa.Integer(), nullable=False),
        sa.Column("max_advance_days", sa.Integer(), nullable=False),
        sa.Column("default_slot_duration", sa.Integer(), nullable=False),
        sa.Column("ai_chat_enabled", sa.Boolean(), nullable=False),
        sa.Column("ai_provider", sa.String(50), nullable=False),
        sa.Column("ai_model", sa.String(100), nullable=False),
        sa.Column("business_hours_json", sa.Text(), nullable=False),
        sa.Column("blocked_dates_json", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("online_booking_config")
    op.drop_index(op.f("ix_appointments_patient_id"), "appointments")
    op.drop_index(op.f("ix_appointments_slot_id"), "appointments")
    op.drop_table("appointments")
    op.drop_index(op.f("ix_appointment_slots_room_id"), "appointment_slots")
    op.drop_index(op.f("ix_appointment_slots_therapist_id"), "appointment_slots")
    op.drop_table("appointment_slots")
    op.drop_table("rooms")
    op.drop_index(op.f("ix_therapists_user_id"), "therapists")
    op.drop_table("therapists")
