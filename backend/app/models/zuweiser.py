"""Zuweiser (Arzt) model – für Zuweisungsverwaltung und -statistik."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def uuid_hex():
    return uuid.uuid4().hex[:32]


class Zuweiser(Base):
    """Zuweisender Arzt – Kontaktdaten, Zuweisungsstatistik."""

    __tablename__ = "zuweiser"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=uuid_hex)
    praxis_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    # Stammdaten
    title: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Dr. med., etc.
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Kontakt
    practice_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fax: Mapped[str | None] = mapped_column(String(50), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
