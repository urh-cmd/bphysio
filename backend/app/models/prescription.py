"""Prescription (Verordnung) model – ärztliche Heilmittelverordnung."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def uuid_hex():
    return uuid.uuid4().hex[:32]


class Prescription(Base):
    """Ärztliche Verordnung für Heilmittel."""

    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    patient_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    zuweiser_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("zuweiser.id", ondelete="SET NULL"), nullable=True, index=True
    )

    prescription_date: Mapped[date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    diagnosis_code: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ICD-10
    prescription_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active, used, expired

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class PrescriptionItem(Base):
    """Einzelposition einer Verordnung (Leistung + Anzahl)."""

    __tablename__ = "prescription_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    prescription_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    service_code: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
