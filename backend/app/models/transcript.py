"""Transcript model – Audio-Transkription, SOAP-Strukturierung."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def uuid_hex():
    return uuid.uuid4().hex[:32]


class Transcript(Base):
    """Transkript – Audio-Upload, Rohtext, SOAP strukturiert."""

    __tablename__ = "transcripts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    patient_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    praxis_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    audio_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    soap_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, transcribing, completed, failed
    progress_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100 während transcribing
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
