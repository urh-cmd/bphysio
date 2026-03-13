"""TrainingPlan model – Trainingspläne, Übungen, Vorlagen."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def uuid_hex():
    return uuid.uuid4().hex[:32]


class TrainingPlan(Base):
    """Trainingsplan – Übungen, Markdown/strukturiert, Vorlagen."""

    __tablename__ = "training_plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    patient_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    praxis_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)  # Markdown oder JSON
    exercises_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)  # strukturierte Übungen
    is_template: Mapped[bool] = mapped_column(default=False)  # Vorlage für andere Pläne

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    created_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
