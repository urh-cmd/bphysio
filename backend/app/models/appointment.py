"""Appointment models for online booking system."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Therapist(Base):
    """Therapist/resource for appointments."""
    
    __tablename__ = "therapists"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    specialization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Availability JSON: {"monday": [{"start": "08:00", "end": "12:00"}, ...], ...}
    availability_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships (Appointments gehen über AppointmentSlot.slot -> Appointment)
    slots: Mapped[list["AppointmentSlot"]] = relationship(
        "AppointmentSlot", back_populates="therapist"
    )


class Room(Base):
    """Treatment room resource."""
    
    __tablename__ = "rooms"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resources: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON: ["Fango", "Kabine", ...]
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships (Appointments gehen über AppointmentSlot)
    slots: Mapped[list["AppointmentSlot"]] = relationship(
        "AppointmentSlot", back_populates="room"
    )


class AppointmentSlot(Base):
    """Available appointment slots."""
    
    __tablename__ = "appointment_slots"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    therapist_id: Mapped[str] = mapped_column(ForeignKey("therapists.id"), nullable=False)
    room_id: Mapped[Optional[str]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
    
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    
    slot_type: Mapped[str] = mapped_column(String(50), default="treatment")  # treatment, consultation, free
    is_booked: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Booking constraints
    requires_prescription: Mapped[bool] = mapped_column(Boolean, default=False)
    min_notice_hours: Mapped[int] = mapped_column(Integer, default=24)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    therapist: Mapped["Therapist"] = relationship(back_populates="slots")
    room: Mapped[Optional["Room"]] = relationship(back_populates="slots")
    appointment: Mapped[Optional["Appointment"]] = relationship(back_populates="slot")


class Appointment(Base):
    """Booked appointment."""
    
    __tablename__ = "appointments"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    slot_id: Mapped[str] = mapped_column(ForeignKey("appointment_slots.id"), nullable=False, unique=True)
    
    # Patient info (can be anonymous for online booking)
    patient_id: Mapped[Optional[str]] = mapped_column(ForeignKey("patients.id"), nullable=True)
    patient_name: Mapped[str] = mapped_column(String(255), nullable=False)
    patient_email: Mapped[str] = mapped_column(String(255), nullable=False)
    patient_phone: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Appointment details
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # z.B. "Rückenschmerzen", "Nachsorge"
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status
    status: Mapped[str] = mapped_column(String(50), default="confirmed")  # confirmed, cancelled, completed, no_show
    
    # Reminders
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    reminder_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    slot: Mapped["AppointmentSlot"] = relationship(back_populates="appointment")
    patient: Mapped[Optional["Patient"]] = relationship()


class OnlineBookingConfig(Base):
    """Configuration for online booking."""
    
    __tablename__ = "online_booking_config"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # General settings
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    min_advance_hours: Mapped[int] = mapped_column(Integer, default=24)
    max_advance_days: Mapped[int] = mapped_column(Integer, default=60)
    
    # Slot duration in minutes
    default_slot_duration: Mapped[int] = mapped_column(Integer, default=30)
    
    # AI Chat settings
    ai_chat_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_provider: Mapped[str] = mapped_column(String(50), default="ollama")  # ollama, openai, anthropic, nvidia
    ai_model: Mapped[str] = mapped_column(String(100), default="llama3.2")
    
    # Business hours (JSON)
    business_hours_json: Mapped[str] = mapped_column(Text, default='{"monday": ["08:00-18:00"], "tuesday": ["08:00-18:00"], "wednesday": ["08:00-18:00"], "thursday": ["08:00-18:00"], "friday": ["08:00-16:00"], "saturday": [], "sunday": []}')
    
    # Blocked dates (JSON array of ISO dates)
    blocked_dates_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
