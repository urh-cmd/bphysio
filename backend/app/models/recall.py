"""Recall (Wiedervorstellung) model."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def uuid_hex():
    return uuid.uuid4().hex[:32]


class Recall(Base):
    """Wiedervorstellung / Kontrolltermin."""

    __tablename__ = "recalls"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    patient_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    praxis_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    recall_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    notified: Mapped[bool] = mapped_column(default=False)
    completed: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
