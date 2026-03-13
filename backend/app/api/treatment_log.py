"""TreatmentLog (Behandlungsprotokoll) API."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.dependencies import DbSession, RequireDeleteRole, get_current_user_id_required
from app.models.treatment_log import TreatmentLog

router = APIRouter()


class TreatmentLogCreate(BaseModel):
    patient_id: str
    treatment_date: date
    service_code: Optional[str] = None
    prescription_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    note: Optional[str] = None


class TreatmentLogUpdate(BaseModel):
    treatment_date: Optional[date] = None
    service_code: Optional[str] = None
    prescription_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    note: Optional[str] = None


class TreatmentLogResponse(BaseModel):
    id: str
    patient_id: str
    treatment_date: str
    service_code: Optional[str]
    prescription_id: Optional[str]
    duration_minutes: Optional[int]
    note: Optional[str]

    model_config = ConfigDict(from_attributes=True)


def _to_response(t: TreatmentLog) -> TreatmentLogResponse:
    return TreatmentLogResponse(
        id=t.id,
        patient_id=t.patient_id,
        treatment_date=t.treatment_date.isoformat(),
        service_code=t.service_code,
        prescription_id=t.prescription_id,
        duration_minutes=t.duration_minutes,
        note=t.note,
    )


@router.get("", response_model=list[TreatmentLogResponse])
async def list_treatment_logs(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    patient_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Liste Behandlungsprotokolle."""
    query = (
        select(TreatmentLog)
        .order_by(TreatmentLog.treatment_date.desc())
        .offset(skip)
        .limit(limit)
    )
    if patient_id:
        query = query.where(TreatmentLog.patient_id == patient_id)
    result = await db.execute(query)
    items = result.scalars().all()
    return [_to_response(t) for t in items]


@router.post("", response_model=TreatmentLogResponse, status_code=201)
async def create_treatment_log(
    data: TreatmentLogCreate,
    db: DbSession,
    user_id: str = Depends(get_current_user_id_required),
):
    """Behandlungsprotokoll anlegen."""
    t = TreatmentLog(
        patient_id=data.patient_id,
        treatment_date=data.treatment_date,
        service_code=data.service_code,
        prescription_id=data.prescription_id,
        duration_minutes=data.duration_minutes,
        note=data.note,
        created_by=user_id,
    )
    db.add(t)
    await db.flush()
    await db.refresh(t)
    return _to_response(t)


@router.get("/{log_id}", response_model=TreatmentLogResponse)
async def get_treatment_log(
    log_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Behandlungsprotokoll abrufen."""
    result = await db.execute(select(TreatmentLog).where(TreatmentLog.id == log_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Behandlungsprotokoll nicht gefunden")
    return _to_response(t)


@router.patch("/{log_id}", response_model=TreatmentLogResponse)
async def update_treatment_log(
    log_id: str,
    data: TreatmentLogUpdate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Behandlungsprotokoll aktualisieren."""
    result = await db.execute(select(TreatmentLog).where(TreatmentLog.id == log_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Behandlungsprotokoll nicht gefunden")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    await db.flush()
    await db.refresh(t)
    return _to_response(t)


@router.delete("/{log_id}", status_code=204)
async def delete_treatment_log(
    log_id: str,
    db: DbSession,
    _user_id: RequireDeleteRole,
):
    """Behandlungsprotokoll löschen."""
    result = await db.execute(select(TreatmentLog).where(TreatmentLog.id == log_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Behandlungsprotokoll nicht gefunden")
    await db.delete(t)
    return None
