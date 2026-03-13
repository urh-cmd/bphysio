"""Movement session and related models."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def uuid_hex():
    return uuid.uuid4().hex[:32]


class MovementSession(Base):
    __tablename__ = "movement_sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    patient_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("patients.id"), nullable=True, index=True)
    praxis_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    session_type: Mapped[str] = mapped_column(String(20), default="gait")  # gait, spine, shoulder, balance
    capture_mode: Mapped[str] = mapped_column(String(20), default="single")  # single, multi_3d
    camera_count: Mapped[int] = mapped_column(Integer, default=1)

    video_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    keypoints_2d_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    keypoints_3d_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    metrics_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    clinical_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, processing, completed, failed
    progress_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100 während processing
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    fps: Mapped[float | None] = mapped_column(Float, nullable=True)
    frame_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
