"""Prescriptions (Verordnungen) API."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from app.core.dependencies import DbSession, get_current_user_id_required
from app.models.prescription import Prescription, PrescriptionItem
from app.models.zuweiser import Zuweiser

router = APIRouter()


class PrescriptionItemCreate(BaseModel):
    service_code: str
    quantity: int = 1
    note: Optional[str] = None


class PrescriptionItemResponse(BaseModel):
    id: str
    service_code: str
    quantity: int
    note: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class PrescriptionCreate(BaseModel):
    patient_id: str
    zuweiser_id: Optional[str] = None
    prescription_date: date
    valid_until: Optional[date] = None
    diagnosis_code: Optional[str] = None
    prescription_number: Optional[str] = None
    notes: Optional[str] = None
    items: list[PrescriptionItemCreate] = []


class PrescriptionUpdate(BaseModel):
    zuweiser_id: Optional[str] = None
    prescription_date: Optional[date] = None
    valid_until: Optional[date] = None
    diagnosis_code: Optional[str] = None
    prescription_number: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionResponse(BaseModel):
    id: str
    patient_id: str
    zuweiser_id: Optional[str]
    prescription_date: str
    valid_until: Optional[str]
    diagnosis_code: Optional[str]
    prescription_number: Optional[str]
    status: str
    notes: Optional[str]
    items: list[PrescriptionItemResponse] = []
    zuweiser_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=list[PrescriptionResponse])
async def list_prescriptions(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    patient_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Verordnungen auflisten."""
    q = (
        select(Prescription)
        .order_by(Prescription.prescription_date.desc())
        .offset(skip)
        .limit(limit)
    )
    if patient_id:
        q = q.where(Prescription.patient_id == patient_id)
    if status:
        q = q.where(Prescription.status == status)
    result = await db.execute(q)
    prescriptions = result.scalars().all()

    out = []
    for p in prescriptions:
        items = await db.execute(select(PrescriptionItem).where(PrescriptionItem.prescription_id == p.id))
        item_list = items.scalars().all()
        zuweiser_name = None
        if p.zuweiser_id:
            z = await db.get(Zuweiser, p.zuweiser_id)
            if z:
                zuweiser_name = f"{z.title or ''} {z.first_name} {z.last_name}".strip()
        out.append(
            PrescriptionResponse(
                id=p.id,
                patient_id=p.patient_id,
                zuweiser_id=p.zuweiser_id,
                prescription_date=p.prescription_date.isoformat(),
                valid_until=p.valid_until.isoformat() if p.valid_until else None,
                diagnosis_code=p.diagnosis_code,
                prescription_number=p.prescription_number,
                status=p.status,
                notes=p.notes,
                items=[PrescriptionItemResponse(id=i.id, service_code=i.service_code, quantity=i.quantity, note=i.note) for i in item_list],
                zuweiser_name=zuweiser_name,
            )
        )
    return out


@router.post("", response_model=PrescriptionResponse, status_code=201)
async def create_prescription(
    data: PrescriptionCreate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Verordnung anlegen."""
    p = Prescription(
        patient_id=data.patient_id,
        zuweiser_id=data.zuweiser_id,
        prescription_date=data.prescription_date,
        valid_until=data.valid_until,
        diagnosis_code=data.diagnosis_code,
        prescription_number=data.prescription_number,
        notes=data.notes,
    )
    db.add(p)
    await db.flush()
    for it in data.items:
        pi = PrescriptionItem(
            prescription_id=p.id,
            service_code=it.service_code,
            quantity=it.quantity,
            note=it.note,
        )
        db.add(pi)
    await db.flush()
    await db.refresh(p)
    items_result = await db.execute(select(PrescriptionItem).where(PrescriptionItem.prescription_id == p.id))
    item_list = items_result.scalars().all()
    zuweiser_name = None
    if p.zuweiser_id:
        z = await db.get(Zuweiser, p.zuweiser_id)
        if z:
            zuweiser_name = f"{z.title or ''} {z.first_name} {z.last_name}".strip()
    return PrescriptionResponse(
        id=p.id,
        patient_id=p.patient_id,
        zuweiser_id=p.zuweiser_id,
        prescription_date=p.prescription_date.isoformat(),
        valid_until=p.valid_until.isoformat() if p.valid_until else None,
        diagnosis_code=p.diagnosis_code,
        prescription_number=p.prescription_number,
        status=p.status,
        notes=p.notes,
        items=[PrescriptionItemResponse(id=i.id, service_code=i.service_code, quantity=i.quantity, note=i.note) for i in item_list],
        zuweiser_name=zuweiser_name,
    )


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Verordnung abrufen."""
    result = await db.execute(select(Prescription).where(Prescription.id == prescription_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Verordnung nicht gefunden")
    items_result = await db.execute(select(PrescriptionItem).where(PrescriptionItem.prescription_id == p.id))
    item_list = items_result.scalars().all()
    zuweiser_name = None
    if p.zuweiser_id:
        z = await db.get(Zuweiser, p.zuweiser_id)
        if z:
            zuweiser_name = f"{z.title or ''} {z.first_name} {z.last_name}".strip()
    return PrescriptionResponse(
        id=p.id,
        patient_id=p.patient_id,
        zuweiser_id=p.zuweiser_id,
        prescription_date=p.prescription_date.isoformat(),
        valid_until=p.valid_until.isoformat() if p.valid_until else None,
        diagnosis_code=p.diagnosis_code,
        prescription_number=p.prescription_number,
        status=p.status,
        notes=p.notes,
        items=[PrescriptionItemResponse(id=i.id, service_code=i.service_code, quantity=i.quantity, note=i.note) for i in item_list],
        zuweiser_name=zuweiser_name,
    )


@router.patch("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: str,
    data: PrescriptionUpdate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Verordnung aktualisieren."""
    result = await db.execute(select(Prescription).where(Prescription.id == prescription_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Verordnung nicht gefunden")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    await db.flush()
    await db.refresh(p)
    items_result = await db.execute(select(PrescriptionItem).where(PrescriptionItem.prescription_id == p.id))
    item_list = items_result.scalars().all()
    zuweiser_name = None
    if p.zuweiser_id:
        z = await db.get(Zuweiser, p.zuweiser_id)
        if z:
            zuweiser_name = f"{z.title or ''} {z.first_name} {z.last_name}".strip()
    return PrescriptionResponse(
        id=p.id,
        patient_id=p.patient_id,
        zuweiser_id=p.zuweiser_id,
        prescription_date=p.prescription_date.isoformat(),
        valid_until=p.valid_until.isoformat() if p.valid_until else None,
        diagnosis_code=p.diagnosis_code,
        prescription_number=p.prescription_number,
        status=p.status,
        notes=p.notes,
        items=[PrescriptionItemResponse(id=i.id, service_code=i.service_code, quantity=i.quantity, note=i.note) for i in item_list],
        zuweiser_name=zuweiser_name,
    )
