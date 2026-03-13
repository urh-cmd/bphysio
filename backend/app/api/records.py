"""Records (Akten) API."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.dependencies import DbSession, RequireDeleteRole, get_current_user_id_required
from app.models.record import Record

router = APIRouter()


class RecordCreate(BaseModel):
    patient_id: str
    title: Optional[str] = None
    record_type: str = "soap"
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


class RecordUpdate(BaseModel):
    title: Optional[str] = None
    record_type: Optional[str] = None
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None


class RecordResponse(BaseModel):
    id: str
    patient_id: str
    title: Optional[str]
    record_type: str
    subjective: Optional[str]
    objective: Optional[str]
    assessment: Optional[str]
    plan: Optional[str]
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


def _to_response(r: Record) -> RecordResponse:
    return RecordResponse(
        id=r.id,
        patient_id=r.patient_id,
        title=r.title,
        record_type=r.record_type,
        subjective=r.subjective,
        objective=r.objective,
        assessment=r.assessment,
        plan=r.plan,
        created_at=r.created_at.isoformat(),
        updated_at=r.updated_at.isoformat(),
    )


@router.get("", response_model=list[RecordResponse])
async def list_records(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    patient_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Liste Akten, optional nach Patient gefiltert."""
    q = select(Record).order_by(Record.updated_at.desc()).offset(skip).limit(limit)
    if patient_id:
        q = q.where(Record.patient_id == patient_id)
    result = await db.execute(q)
    records = result.scalars().all()
    return [_to_response(r) for r in records]


@router.post("", response_model=RecordResponse, status_code=201)
async def create_record(
    data: RecordCreate,
    db: DbSession,
    user_id: str = Depends(get_current_user_id_required),
):
    """Akte anlegen."""
    record = Record(
        patient_id=data.patient_id,
        title=data.title,
        record_type=data.record_type,
        subjective=data.subjective,
        objective=data.objective,
        assessment=data.assessment,
        plan=data.plan,
        created_by=user_id,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return _to_response(record)


@router.get("/{record_id}", response_model=RecordResponse)
async def get_record(
    record_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Akte abrufen."""
    result = await db.execute(select(Record).where(Record.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Akte nicht gefunden")
    return _to_response(record)


@router.patch("/{record_id}", response_model=RecordResponse)
async def update_record(
    record_id: str,
    data: RecordUpdate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Akte aktualisieren."""
    result = await db.execute(select(Record).where(Record.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Akte nicht gefunden")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(record, k, v)
    await db.flush()
    await db.refresh(record)
    return _to_response(record)


@router.delete("/{record_id}", status_code=204)
async def delete_record(
    record_id: str,
    db: DbSession,
    _user_id: RequireDeleteRole,
):
    """Akte löschen."""
    result = await db.execute(select(Record).where(Record.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Akte nicht gefunden")
    await db.delete(record)
    return None
