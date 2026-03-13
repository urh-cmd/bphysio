"""Recall (Wiedervorstellung) API."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.dependencies import DbSession, RequireDeleteRole, get_current_user_id_required
from app.models.recall import Recall

router = APIRouter()


class RecallCreate(BaseModel):
    patient_id: str
    recall_date: date
    reason: Optional[str] = None
    notes: Optional[str] = None


class RecallUpdate(BaseModel):
    recall_date: Optional[date] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    notified: Optional[bool] = None
    completed: Optional[bool] = None


class RecallResponse(BaseModel):
    id: str
    patient_id: str
    recall_date: str
    reason: Optional[str]
    notes: Optional[str]
    notified: bool
    completed: bool

    model_config = ConfigDict(from_attributes=True)


def _to_response(r: Recall) -> RecallResponse:
    return RecallResponse(
        id=r.id,
        patient_id=r.patient_id,
        recall_date=r.recall_date.isoformat(),
        reason=r.reason,
        notes=r.notes,
        notified=r.notified,
        completed=r.completed,
    )


@router.get("", response_model=list[RecallResponse])
async def list_recalls(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    patient_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Liste Wiedervorstellungen."""
    query = select(Recall).order_by(Recall.recall_date.desc()).offset(skip).limit(limit)
    if patient_id:
        query = query.where(Recall.patient_id == patient_id)
    result = await db.execute(query)
    items = result.scalars().all()
    return [_to_response(r) for r in items]


@router.post("", response_model=RecallResponse, status_code=201)
async def create_recall(
    data: RecallCreate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Wiedervorstellung anlegen."""
    r = Recall(
        patient_id=data.patient_id,
        recall_date=data.recall_date,
        reason=data.reason,
        notes=data.notes,
    )
    db.add(r)
    await db.flush()
    await db.refresh(r)
    return _to_response(r)


@router.get("/{recall_id}", response_model=RecallResponse)
async def get_recall(
    recall_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Wiedervorstellung abrufen."""
    result = await db.execute(select(Recall).where(Recall.id == recall_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Wiedervorstellung nicht gefunden")
    return _to_response(r)


@router.patch("/{recall_id}", response_model=RecallResponse)
async def update_recall(
    recall_id: str,
    data: RecallUpdate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Wiedervorstellung aktualisieren."""
    result = await db.execute(select(Recall).where(Recall.id == recall_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Wiedervorstellung nicht gefunden")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    await db.flush()
    await db.refresh(r)
    return _to_response(r)


@router.delete("/{recall_id}", status_code=204)
async def delete_recall(
    recall_id: str,
    db: DbSession,
    _user_id: RequireDeleteRole,
):
    """Wiedervorstellung löschen."""
    result = await db.execute(select(Recall).where(Recall.id == recall_id))
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(404, "Wiedervorstellung nicht gefunden")
    await db.delete(r)
    return None
