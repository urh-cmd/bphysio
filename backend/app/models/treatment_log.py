"""TreatmentLog (Behandlungsprotokoll) model – pro Sitzung."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def uuid_hex():
    return uuid.uuid4().hex[:32]


class TreatmentLog(Base):
    """Behandlungsprotokoll – Leistung, Dauer, Notiz pro Sitzung."""

    __tablename__ = "treatment_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    patient_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prescription_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    praxis_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_by: Mapped[str | None] = mapped_column(String(32), nullable=True)

    treatment_date: Mapped[date] = mapped_column(Date, nullable=False)
    service_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # KG, MT, etc.
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
