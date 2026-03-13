"""App-Einstellungen API – LLM-Provider, API-Keys."""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.dependencies import DbSession, get_current_user_id_required
from app.services.settings_service import get_app_settings_for_ui, update_app_settings

router = APIRouter()


class SettingsResponse(BaseModel):
    llm_provider: str
    llm_model: str
    openai_api_key: str
    nvidia_api_key: str
    openai_configured: bool
    nvidia_configured: bool


class SettingsUpdateRequest(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    openai_api_key: Optional[str] = None
    nvidia_api_key: Optional[str] = None


@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Einstellungen abrufen (API-Keys maskiert)."""
    data = await get_app_settings_for_ui(db)
    return SettingsResponse(**data)


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    db: DbSession,
    body: SettingsUpdateRequest,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Einstellungen aktualisieren."""
    data = body.model_dump(exclude_unset=True)
    updated = await update_app_settings(db, data)
    return SettingsResponse(**updated)
