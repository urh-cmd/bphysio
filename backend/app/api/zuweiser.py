"""Zuweiser (Ärzte) API."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, or_

from app.core.dependencies import DbSession, RequireDeleteRole, get_current_user_id_required
from app.models.zuweiser import Zuweiser

router = APIRouter()


class ZuweiserCreate(BaseModel):
    title: Optional[str] = None
    first_name: str
    last_name: str
    specialization: Optional[str] = None
    practice_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None
    notes: Optional[str] = None


class ZuweiserUpdate(BaseModel):
    title: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    specialization: Optional[str] = None
    practice_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    fax: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ZuweiserResponse(BaseModel):
    id: str
    title: Optional[str]
    first_name: str
    last_name: str
    specialization: Optional[str]
    practice_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class ZuweiserDetailResponse(ZuweiserResponse):
    address: Optional[str] = None
    fax: Optional[str] = None
    notes: Optional[str] = None


def _to_response(z: Zuweiser) -> ZuweiserResponse:
    return ZuweiserResponse(
        id=z.id,
        title=z.title,
        first_name=z.first_name,
        last_name=z.last_name,
        specialization=z.specialization,
        practice_name=z.practice_name,
        phone=z.phone,
        email=z.email,
        is_active=z.is_active,
    )


def _to_detail_response(z: Zuweiser) -> ZuweiserDetailResponse:
    return ZuweiserDetailResponse(
        id=z.id,
        title=z.title,
        first_name=z.first_name,
        last_name=z.last_name,
        specialization=z.specialization,
        practice_name=z.practice_name,
        phone=z.phone,
        email=z.email,
        is_active=z.is_active,
        address=z.address,
        fax=z.fax,
        notes=z.notes,
    )


@router.get("", response_model=list[ZuweiserResponse])
async def list_zuweiser(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    q: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Liste Zuweiser (Ärzte)."""
    query = select(Zuweiser).order_by(Zuweiser.last_name).offset(skip).limit(limit)
    if q:
        search = f"%{q}%"
        query = query.where(
            or_(
                Zuweiser.first_name.ilike(search),
                Zuweiser.last_name.ilike(search),
                Zuweiser.practice_name.ilike(search),
                Zuweiser.specialization.ilike(search),
            )
        )
    result = await db.execute(query)
    items = result.scalars().all()
    return [_to_response(z) for z in items]


@router.post("", response_model=ZuweiserResponse, status_code=201)
async def create_zuweiser(
    data: ZuweiserCreate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Zuweiser anlegen."""
    z = Zuweiser(
        title=data.title,
        first_name=data.first_name,
        last_name=data.last_name,
        specialization=data.specialization,
        practice_name=data.practice_name,
        address=data.address,
        phone=data.phone,
        email=data.email,
        fax=data.fax,
        notes=data.notes,
    )
    db.add(z)
    await db.flush()
    await db.refresh(z)
    return _to_response(z)


@router.get("/{zuweiser_id}", response_model=ZuweiserDetailResponse)
async def get_zuweiser(
    zuweiser_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Zuweiser abrufen."""
    result = await db.execute(select(Zuweiser).where(Zuweiser.id == zuweiser_id))
    z = result.scalar_one_or_none()
    if not z:
        raise HTTPException(404, "Zuweiser nicht gefunden")
    return _to_detail_response(z)


@router.patch("/{zuweiser_id}", response_model=ZuweiserDetailResponse)
async def update_zuweiser(
    zuweiser_id: str,
    data: ZuweiserUpdate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Zuweiser aktualisieren."""
    result = await db.execute(select(Zuweiser).where(Zuweiser.id == zuweiser_id))
    z = result.scalar_one_or_none()
    if not z:
        raise HTTPException(404, "Zuweiser nicht gefunden")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(z, k, v)
    await db.flush()
    await db.refresh(z)
    return _to_detail_response(z)


@router.delete("/{zuweiser_id}", status_code=204)
async def delete_zuweiser(
    zuweiser_id: str,
    db: DbSession,
    _user_id: RequireDeleteRole,
):
    """Zuweiser löschen."""
    result = await db.execute(select(Zuweiser).where(Zuweiser.id == zuweiser_id))
    z = result.scalar_one_or_none()
    if not z:
        raise HTTPException(404, "Zuweiser nicht gefunden")
    await db.delete(z)
    return None
