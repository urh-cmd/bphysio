"""Appointment and online booking API endpoints."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import RequireDeleteRole, get_current_user_id_required
from app.models.appointment import Appointment, AppointmentSlot, Therapist, Room, OnlineBookingConfig
from app.models.patient import Patient
from app.services.ai import get_llm_provider

router = APIRouter()


# ============ Pydantic Schemas ============

class SlotResponse(BaseModel):
    id: str
    start_time: datetime
    end_time: datetime
    therapist_name: str
    therapist_specialization: Optional[str] = None
    room_name: Optional[str] = None
    slot_type: str
    
    class Config:
        from_attributes = True


class BookingRequest(BaseModel):
    slot_id: str
    patient_name: str = Field(..., min_length=2, max_length=255)
    patient_email: EmailStr
    patient_phone: str = Field(..., min_length=5, max_length=50)
    reason: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = Field(None, max_length=2000)


class BookingResponse(BaseModel):
    id: str
    slot_id: str
    patient_name: str
    patient_email: str
    start_time: datetime
    end_time: datetime
    therapist_name: str
    status: str
    
    class Config:
        from_attributes = True


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    preferred_date: Optional[str] = None  # ISO date, e.g., "2026-03-15"
    preferred_time: Optional[str] = None  # "morning", "afternoon", "evening"
    treatment_type: Optional[str] = None  # "back", "neck", "shoulder", etc.


class AIChatResponse(BaseModel):
    response: str
    suggested_slots: list[SlotResponse] = []
    action: Optional[str] = None  # "show_slots", "ask_clarification", "confirm_booking"


class BookingConfigResponse(BaseModel):
    is_enabled: bool
    min_advance_hours: int
    max_advance_days: int
    default_slot_duration: int
    ai_chat_enabled: bool
    business_hours: dict


# ============ Public Endpoints (no auth required) ============

@router.get("/config", response_model=BookingConfigResponse)
async def get_booking_config(db: AsyncSession = Depends(get_db)):
    """Get online booking configuration."""
    result = await db.execute(select(OnlineBookingConfig).limit(1))
    config = result.scalar_one_or_none()
    
    if not config:
        # Return default config
        return BookingConfigResponse(
            is_enabled=True,
            min_advance_hours=24,
            max_advance_days=60,
            default_slot_duration=30,
            ai_chat_enabled=True,
            business_hours={
                "monday": ["08:00-18:00"],
                "tuesday": ["08:00-18:00"],
                "wednesday": ["08:00-18:00"],
                "thursday": ["08:00-18:00"],
                "friday": ["08:00-16:00"],
                "saturday": [],
                "sunday": [],
            }
        )
    
    import json
    return BookingConfigResponse(
        is_enabled=config.is_enabled,
        min_advance_hours=config.min_advance_hours,
        max_advance_days=config.max_advance_days,
        default_slot_duration=config.default_slot_duration,
        ai_chat_enabled=config.ai_chat_enabled,
        business_hours=json.loads(config.business_hours_json) if config.business_hours_json else {}
    )


@router.get("/slots", response_model=list[SlotResponse])
async def get_available_slots(
    from_date: datetime = Query(..., description="Start date for slot search"),
    to_date: Optional[datetime] = Query(None, description="End date for slot search"),
    therapist_id: Optional[str] = Query(None, description="Filter by therapist"),
    treatment_type: Optional[str] = Query(None, description="Filter by treatment type"),
    db: AsyncSession = Depends(get_db),
):
    """Get available appointment slots."""
    if not to_date:
        to_date = from_date + timedelta(days=7)
    
    # Build query
    query = select(AppointmentSlot).where(
        and_(
            AppointmentSlot.is_booked == False,
            AppointmentSlot.start_time >= from_date,
            AppointmentSlot.start_time <= to_date,
        )
    )
    
    if therapist_id:
        query = query.where(AppointmentSlot.therapist_id == therapist_id)
    
    if treatment_type:
        # Join with therapist to filter by specialization
        query = query.join(Therapist).where(
            Therapist.specialization.ilike(f"%{treatment_type}%")
        )
    
    query = query.order_by(AppointmentSlot.start_time)
    
    result = await db.execute(query)
    slots = result.scalars().all()
    
    # Build response
    slot_responses = []
    for slot in slots:
        await db.refresh(slot, ["therapist", "room"])
        slot_responses.append(SlotResponse(
            id=slot.id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            therapist_name=slot.therapist.name if slot.therapist else "Unbekannt",
            therapist_specialization=slot.therapist.specialization if slot.therapist else None,
            room_name=slot.room.name if slot.room else None,
            slot_type=slot.slot_type,
        ))
    
    return slot_responses


@router.post("/book", response_model=BookingResponse)
async def book_appointment(
    request: BookingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Book an appointment."""
    # Check if slot exists and is available
    result = await db.execute(
        select(AppointmentSlot).where(AppointmentSlot.id == request.slot_id)
    )
    slot = result.scalar_one_or_none()
    
    if not slot:
        raise HTTPException(status_code=404, detail="Slot nicht gefunden")
    
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Slot bereits gebucht")
    
    # Check minimum advance notice
    config_result = await db.execute(select(OnlineBookingConfig).limit(1))
    config = config_result.scalar_one_or_none()
    min_advance = config.min_advance_hours if config else 24
    
    min_booking_time = datetime.utcnow() + timedelta(hours=min_advance)
    if slot.start_time < min_booking_time:
        raise HTTPException(
            status_code=400, 
            detail=f"Termine müssen mindestens {min_advance} Stunden im Voraus gebucht werden"
        )
    
    # Create appointment
    appointment = Appointment(
        slot_id=request.slot_id,
        patient_name=request.patient_name,
        patient_email=request.patient_email,
        patient_phone=request.patient_phone,
        reason=request.reason,
        notes=request.notes,
        status="confirmed",
    )
    
    # Mark slot as booked
    slot.is_booked = True
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    await db.refresh(slot)
    
    # Build response
    await db.refresh(slot, ["therapist"])
    return BookingResponse(
        id=appointment.id,
        slot_id=appointment.slot_id,
        patient_name=appointment.patient_name,
        patient_email=appointment.patient_email,
        start_time=slot.start_time,
        end_time=slot.end_time,
        therapist_name=slot.therapist.name if slot.therapist else "Unbekannt",
        status=appointment.status,
    )


@router.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    request: AIChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """AI chat for appointment booking assistance."""
    # Get config
    config_result = await db.execute(select(OnlineBookingConfig).limit(1))
    config = config_result.scalar_one_or_none()
    
    if not config or not config.ai_chat_enabled:
        raise HTTPException(status_code=503, detail="AI-Chat ist derzeit nicht verfügbar")
    
    # Get LLM provider
    try:
        llm = get_llm_provider(config.ai_provider, config.ai_model)
    except Exception as e:
        # Fallback to simple response if LLM not available
        return AIChatResponse(
            response="Ich kann Ihnen helfen, einen Termin zu finden. Bitte wählen Sie einen passenden Slot aus der Liste.",
            suggested_slots=[],
            action="show_slots",
        )
    
    # Parse user intent
    user_message = request.message.lower()
    
    # Extract preferences
    preferred_date = request.preferred_date
    preferred_time = request.preferred_time
    treatment_type = request.treatment_type
    
    # Auto-detect from message
    if not preferred_time:
        if any(word in user_message for word in ["morgen", "vormittag", "morning"]):
            preferred_time = "morning"
        elif any(word in user_message for word in ["nachmittag", "afternoon"]):
            preferred_time = "afternoon"
        elif any(word in user_message for word in ["abend", "evening"]):
            preferred_time = "evening"
    
    if not treatment_type:
        if any(word in user_message for word in ["rücken", "back", "rückenschmerzen"]):
            treatment_type = "back"
        elif any(word in user_message for word in ["nacken", "neck", "schulter", "shoulder"]):
            treatment_type = "neck"
        elif any(word in user_message for word in ["knie", "knee", "bein", "leg"]):
            treatment_type = "leg"
    
    # Build system prompt
    system_prompt = """Du bist ein freundlicher Assistent für die Online-Terminbuchung einer Physiotherapie-Praxis.

Deine Aufgaben:
1. Verstehe die Bedürfnisse des Patienten (Beschwerden, bevorzugte Zeiten)
2. Stelle gezielte Rückfragen, wenn Informationen fehlen
3. Schlage passende Termine vor
4. Erkläre kurz, was bei der Behandlung erwartet wird

Antworte auf Deutsch, kurz und freundlich."""
    
    # Get available slots for context
    from_date = datetime.now()
    to_date = from_date + timedelta(days=14)
    
    query = select(AppointmentSlot).where(
        and_(
            AppointmentSlot.is_booked == False,
            AppointmentSlot.start_time >= from_date,
            AppointmentSlot.start_time <= to_date,
        )
    ).order_by(AppointmentSlot.start_time).limit(10)
    
    result = await db.execute(query)
    slots = result.scalars().all()
    
    # Filter by preferred time if specified
    filtered_slots = []
    for slot in slots:
        await db.refresh(slot, ["therapist"])
        hour = slot.start_time.hour
        
        if preferred_time == "morning" and 8 <= hour < 12:
            filtered_slots.append(slot)
        elif preferred_time == "afternoon" and 12 <= hour < 17:
            filtered_slots.append(slot)
        elif preferred_time == "evening" and 17 <= hour < 20:
            filtered_slots.append(slot)
        elif not preferred_time:
            filtered_slots.append(slot)
    
    # Build slot info for LLM
    slot_info = "\n".join([
        f"- {s.start_time.strftime('%A %d.%m. %H:%M')} ({s.therapist.name if s.therapist else 'Unbekannt'})"
        for s in filtered_slots[:5]
    ])
    
    # Build user context
    context = f"""Patientenanfrage: {request.message}

Verfügbare Termine (nächste 2 Wochen):
{slot_info}

Bevorzugter Zeitraum: {preferred_time or 'nicht angegeben'}
Behandlungsgrund: {treatment_type or 'nicht angegeben'}

Bitte antworte freundlich und schlage passende Termine vor."""
    
    # Get AI response
    try:
        ai_response = await llm.chat_completion(
            system_prompt=system_prompt,
            user_message=context,
            temperature=0.7,
            max_tokens=300,
        )
    except Exception:
        ai_response = "Ich kann Ihnen helfen, einen passenden Termin zu finden. Hier sind die nächsten verfügbaren Termine."
    
    # Build suggested slots response
    suggested = []
    for slot in filtered_slots[:5]:
        await db.refresh(slot, ["therapist", "room"])
        suggested.append(SlotResponse(
            id=slot.id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            therapist_name=slot.therapist.name if slot.therapist else "Unbekannt",
            therapist_specialization=slot.therapist.specialization if slot.therapist else None,
            room_name=slot.room.name if slot.room else None,
            slot_type=slot.slot_type,
        ))
    
    return AIChatResponse(
        response=ai_response,
        suggested_slots=suggested,
        action="show_slots" if suggested else "ask_clarification",
    )


class CreateTherapistRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=3)
    specialization: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)


@router.post("/admin/therapists", response_model=dict)
async def create_therapist(
    body: CreateTherapistRequest,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id_required),
):
    """Therapeut anlegen (Admin)."""
    import json
    therapist = Therapist(
        name=body.name,
        email=body.email,
        specialization=body.specialization,
        phone=body.phone,
        availability_json=json.dumps({
            "monday": ["08:00-18:00"],
            "tuesday": ["08:00-18:00"],
            "wednesday": ["08:00-18:00"],
            "thursday": ["08:00-18:00"],
            "friday": ["08:00-16:00"],
            "saturday": [],
            "sunday": [],
        }),
    )
    db.add(therapist)
    await db.flush()
    return {"id": therapist.id, "name": therapist.name}


@router.get("/therapists", response_model=list[dict])
async def get_therapists(db: AsyncSession = Depends(get_db)):
    """Get list of active therapists."""
    result = await db.execute(
        select(Therapist).where(Therapist.is_active == True)
    )
    therapists = result.scalars().all()
    
    return [
        {
            "id": t.id,
            "name": t.name,
            "specialization": t.specialization,
        }
        for t in therapists
    ]


# ============ Admin Endpoints (auth required) ============

class AdminAppointmentResponse(BaseModel):
    id: str
    slot_id: str
    patient_name: str
    patient_email: str
    patient_phone: str
    start_time: datetime
    end_time: datetime
    therapist_name: str
    room_name: Optional[str] = None
    status: str
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AdminSlotResponse(BaseModel):
    id: str
    start_time: datetime
    end_time: datetime
    therapist_name: str
    room_name: Optional[str] = None
    is_booked: bool
    appointment_id: Optional[str] = None
    patient_name: Optional[str] = None

    class Config:
        from_attributes = True


class GenerateSlotsRequest(BaseModel):
    from_date: datetime
    to_date: datetime


@router.get("/admin/appointments", response_model=list[AdminAppointmentResponse])
async def list_admin_appointments(
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id_required),
):
    """Liste aller Terminbuchungen (Admin)."""
    q = select(Appointment).join(AppointmentSlot, Appointment.slot_id == AppointmentSlot.id)
    if from_date:
        q = q.where(AppointmentSlot.start_time >= from_date)
    if to_date:
        q = q.where(AppointmentSlot.start_time <= to_date)
    if status:
        q = q.where(Appointment.status == status)
    q = q.order_by(AppointmentSlot.start_time.desc())
    result = await db.execute(q)
    apps = result.scalars().unique().all()
    out = []
    for a in apps:
        await db.refresh(a, ["slot"])
        slot = a.slot
        await db.refresh(slot, ["therapist", "room"])
        out.append(AdminAppointmentResponse(
            id=a.id,
            slot_id=a.slot_id,
            patient_name=a.patient_name,
            patient_email=a.patient_email,
            patient_phone=a.patient_phone or "",
            start_time=slot.start_time,
            end_time=slot.end_time,
            therapist_name=slot.therapist.name if slot.therapist else "—",
            room_name=slot.room.name if slot.room else None,
            status=a.status,
            reason=a.reason,
            created_at=a.created_at,
        ))
    return out


@router.delete("/admin/appointments/{appointment_id}", status_code=204)
async def delete_appointment(
    appointment_id: str,
    _user_id: RequireDeleteRole,
    db: AsyncSession = Depends(get_db),
):
    """Terminbuchung löschen (Admin/Therapeut)."""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Termin nicht gefunden")
    slot = await db.get(AppointmentSlot, app.slot_id)
    if slot:
        slot.is_booked = False
    await db.delete(app)
    return None


@router.get("/admin/slots", response_model=list[AdminSlotResponse])
async def list_admin_slots(
    from_date: datetime = Query(...),
    to_date: datetime = Query(...),
    therapist_id: Optional[str] = Query(None),
    is_booked: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id_required),
):
    """Liste aller Slots in einem Zeitraum (Admin)."""
    q = select(AppointmentSlot).where(
        AppointmentSlot.start_time >= from_date,
        AppointmentSlot.start_time <= to_date,
    )
    if therapist_id:
        q = q.where(AppointmentSlot.therapist_id == therapist_id)
    if is_booked is not None:
        q = q.where(AppointmentSlot.is_booked == is_booked)
    q = q.order_by(AppointmentSlot.start_time)
    result = await db.execute(q)
    slots = result.scalars().all()
    out = []
    for s in slots:
        await db.refresh(s, ["therapist", "room", "appointment"])
        app = s.appointment
        if isinstance(app, list):
            app = app[0] if app else None
        out.append(AdminSlotResponse(
            id=s.id,
            start_time=s.start_time,
            end_time=s.end_time,
            therapist_name=s.therapist.name if s.therapist else "—",
            room_name=s.room.name if s.room else None,
            is_booked=s.is_booked,
            appointment_id=app.id if app else None,
            patient_name=app.patient_name if app else None,
        ))
    return out


@router.post("/admin/slots/generate")
async def generate_slots(
    body: GenerateSlotsRequest,
    db: AsyncSession = Depends(get_db),
    _user_id: str = Depends(get_current_user_id_required),
):
    """Slots für Datumsbereich generieren."""
    import json
    from_date = body.from_date
    to_date = body.to_date
    result = await db.execute(select(Therapist).where(Therapist.is_active == True))
    therapists = result.scalars().all()
    config_result = await db.execute(select(OnlineBookingConfig).limit(1))
    config = config_result.scalar_one_or_none()
    default_hours = {"monday": ["08:00-18:00"], "tuesday": ["08:00-18:00"], "wednesday": ["08:00-18:00"], "thursday": ["08:00-18:00"], "friday": ["08:00-16:00"], "saturday": [], "sunday": []}
    if config and config.business_hours_json:
        default_hours = json.loads(config.business_hours_json)
    slots_created = 0
    current_date = from_date.replace(hour=0, minute=0, second=0, microsecond=0)
    to_date = to_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    while current_date.date() <= to_date.date():
        for therapist in therapists:
            availability = json.loads(therapist.availability_json) if therapist.availability_json else default_hours
            weekday = current_date.weekday()  # 0=Monday, 6=Sunday
            day_map = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            day_name = day_map[weekday]
            time_ranges = availability.get(day_name, default_hours.get(day_name, []))
            if isinstance(time_ranges, list) and time_ranges:
                for tr in time_ranges:
                    if isinstance(tr, str) and "-" in tr:
                        start_str, end_str = tr.split("-", 1)
                        start_parts = start_str.strip().split(":")
                        end_parts = end_str.strip().split(":")
                        start_hour, start_min = int(start_parts[0]), int(start_parts[1]) if len(start_parts) > 1 else 0
                        end_hour, end_min = int(end_parts[0]), int(end_parts[1]) if len(end_parts) > 1 else 0
                        slot_start = current_date.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
                        slot_end = current_date.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)
                        while slot_start < slot_end:
                            slot = AppointmentSlot(
                                therapist_id=therapist.id,
                                start_time=slot_start,
                                end_time=slot_start + timedelta(minutes=30),
                                slot_type="treatment",
                            )
                            db.add(slot)
                            slots_created += 1
                            slot_start += timedelta(minutes=30)
        current_date += timedelta(days=1)
    
    await db.flush()
    return {"message": f"{slots_created} Slots erstellt"}
