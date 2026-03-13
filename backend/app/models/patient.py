"""Patient model."""

import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def uuid7_hex():
    return uuid.uuid4().hex


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid7_hex)
    praxis_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    # Stammdaten
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Versicherung (abrechnungsrelevant)
    insurance_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # gkv, pkv, self
    insurance_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    insurance_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Zusatz
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
