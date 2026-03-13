"""LLM-Provider-API – verfügbare Provider/Modelle für UI."""

from fastapi import APIRouter, Depends

from app.core.dependencies import DbSession, get_current_user_id_required
from app.services.ai.router import get_available_providers
from app.services.settings_service import get_app_settings_for_llm

router = APIRouter()


@router.get("/providers")
async def list_llm_providers(
    db: DbSession,
    _user_id: str = Depends(get_current_user_id_required),
):
    """Liefert verfügbare LLM-Provider und Modelle (inkl. DB-Einstellungen)."""
    app_settings = await get_app_settings_for_llm(db)
    providers = get_available_providers(
        openai_configured=bool(app_settings["openai_api_key"]),
        nvidia_configured=bool(app_settings["nvidia_api_key"]),
    )
    return {
        "providers": providers,
        "default_provider": app_settings["llm_provider"],
        "default_model": app_settings["llm_model"],
    }
