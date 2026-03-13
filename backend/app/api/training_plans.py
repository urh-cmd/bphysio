"""Training plans API."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.dependencies import DbSession, RequireDeleteRole, get_current_user_id_required
from app.models.training_plan import TrainingPlan

router = APIRouter()


class TrainingPlanCreate(BaseModel):
    patient_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    exercises_json: Optional[dict] = None
    is_template: bool = False


class TrainingPlanUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    exercises_json: Optional[dict] = None
    is_template: Optional[bool] = None
    patient_id: Optional[str] = None


class TrainingPlanResponse(BaseModel):
    id: str
    patient_id: Optional[str]
    title: str
    description: Optional[str]
    content: Optional[str]
    exercises_json: Optional[dict]
    is_template: bool
    created_at: str
    updated_at: str

    model_config = ConfigDict(from_attributes=True)


def _to_response(p: TrainingPlan) -> TrainingPlanResponse:
    return TrainingPlanResponse(
        id=p.id,
        patient_id=p.patient_id,
        title=p.title,
        description=p.description,
        content=p.content,
        exercises_json=p.exercises_json,
        is_template=p.is_template,
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat(),
    )


@router.get("", response_model=list[TrainingPlanResponse])
async def list_training_plans(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
    patient_id: Optional[str] = Query(None),
    templates_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """Liste Trainingspläne, optional nach Patient oder nur Vorlagen."""
    q = select(TrainingPlan).order_by(TrainingPlan.updated_at.desc()).offset(skip).limit(limit)
    if patient_id:
        q = q.where(TrainingPlan.patient_id == patient_id)
    if templates_only:
        q = q.where(TrainingPlan.is_template == True)
    result = await db.execute(q)
    plans = result.scalars().all()
    return [_to_response(p) for p in plans]


@router.post("", response_model=TrainingPlanResponse, status_code=201)
async def create_training_plan(
    data: TrainingPlanCreate,
    db: DbSession,
    user_id: str = Depends(get_current_user_id_required),
):
    """Trainingsplan anlegen."""
    plan = TrainingPlan(
        patient_id=data.patient_id,
        title=data.title,
        description=data.description,
        content=data.content,
        exercises_json=data.exercises_json,
        is_template=data.is_template,
        created_by=user_id,
    )
    db.add(plan)
    await db.flush()
    await db.refresh(plan)
    return _to_response(plan)


@router.get("/{plan_id}", response_model=TrainingPlanResponse)
async def get_training_plan(
    plan_id: str,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Trainingsplan abrufen."""
    result = await db.execute(select(TrainingPlan).where(TrainingPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Trainingsplan nicht gefunden")
    return _to_response(plan)


@router.patch("/{plan_id}", response_model=TrainingPlanResponse)
async def update_training_plan(
    plan_id: str,
    data: TrainingPlanUpdate,
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Trainingsplan aktualisieren."""
    result = await db.execute(select(TrainingPlan).where(TrainingPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Trainingsplan nicht gefunden")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(plan, k, v)
    await db.flush()
    await db.refresh(plan)
    return _to_response(plan)


@router.delete("/{plan_id}", status_code=204)
async def delete_training_plan(
    plan_id: str,
    db: DbSession,
    _user_id: RequireDeleteRole,
):
    """Trainingsplan löschen."""
    result = await db.execute(select(TrainingPlan).where(TrainingPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "Trainingsplan nicht gefunden")
    await db.delete(plan)
    return None
