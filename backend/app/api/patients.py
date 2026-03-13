"""Patients API."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import DbSession, RequireDeleteRole, get_current_user_id_required
from app.models.patient import Patient
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

router = APIRouter()


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    insurance_type: Optional[str] = None
    insurance_name: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    insurance_type: Optional[str] = None
    insurance_name: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None


class PatientResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    insurance_type: Optional[str] = None
    insurance_name: Optional[str] = None
    insurance_number: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list[PatientResponse])
async def list_patients(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    q: Optional[str] = None,
):
    """List patients with pagination and optional search."""
    query = select(Patient).offset(skip).limit(limit).order_by(Patient.last_name)
    if q:
        search = f"%{q}%"
        query = query.where(
            (Patient.first_name.ilike(search))
            | (Patient.last_name.ilike(search))
            | (Patient.email.ilike(search))
        )
    result = await db.execute(query)
    patients = result.scalars().all()
    return patients


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(
    data: PatientCreate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Create patient."""
    patient = Patient(
        first_name=data.first_name,
        last_name=data.last_name,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        email=data.email,
        phone=data.phone,
        address=data.address,
        insurance_type=data.insurance_type,
        insurance_name=data.insurance_name,
        insurance_number=data.insurance_number,
        notes=data.notes,
    )
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Get patient by id."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient nicht gefunden")
    return patient


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    data: PatientUpdate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Update patient."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient nicht gefunden")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(patient, k, v)
    await db.flush()
    await db.refresh(patient)
    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: str,
    db: DbSession,
    _user_id: RequireDeleteRole,
):
    """Delete patient."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient nicht gefunden")
    await db.delete(patient)
    return None
