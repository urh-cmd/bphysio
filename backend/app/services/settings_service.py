"""
BroPhysio – App-Einstellungen Service
=====================================
Liest/speichert LLM-Provider, Modell und API-Keys in der DB.
Fallback auf .env wenn nicht gesetzt.
"""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.app_setting import AppSetting

KEYS = {
    "llm_provider",
    "llm_model",
    "openai_api_key",
    "nvidia_api_key",
}

SENSITIVE_KEYS = {"openai_api_key", "nvidia_api_key"}


def _mask(key: str, value: str | None) -> str | None:
    """API-Keys maskieren (nur für Anzeige)."""
    if not value or key not in SENSITIVE_KEYS:
        return value
    if len(value) <= 8:
        return "***"
    return value[:4] + "***" + value[-4:]


_DEFAULT_PROVIDER = "nvidia"
_DEFAULT_MODELS = {"ollama": "llama3.2", "nvidia": "moonshotai/kimi-k2.5", "openai": "gpt-4o-mini"}


async def get_app_settings(db: AsyncSession) -> dict[str, Any]:
    """Liest alle App-Einstellungen aus DB, Fallback auf env."""
    result = await db.execute(select(AppSetting).where(AppSetting.key.in_(KEYS)))
    rows = {r.key: r.value for r in result.scalars().all()}
    provider = rows.get("llm_provider") or _DEFAULT_PROVIDER
    model = rows.get("llm_model") or _DEFAULT_MODELS.get(provider, "llama3.2")

    return {
        "llm_provider": provider,
        "llm_model": model,
        "openai_api_key": rows.get("openai_api_key") or settings.OPENAI_API_KEY or "",
        "nvidia_api_key": rows.get("nvidia_api_key") or settings.NVIDIA_API_KEY or "",
    }


async def get_app_settings_for_llm(db: AsyncSession) -> dict[str, Any]:
    """Einstellungen für LLM-Router (echte Keys, nicht maskiert)."""
    result = await db.execute(select(AppSetting).where(AppSetting.key.in_(KEYS)))
    rows = {r.key: r.value for r in result.scalars().all()}
    provider = rows.get("llm_provider") or _DEFAULT_PROVIDER
    model = rows.get("llm_model") or _DEFAULT_MODELS.get(provider, "llama3.2")

    return {
        "llm_provider": provider,
        "llm_model": model,
        "openai_api_key": rows.get("openai_api_key") or settings.OPENAI_API_KEY or "",
        "nvidia_api_key": rows.get("nvidia_api_key") or settings.NVIDIA_API_KEY or "",
    }


async def get_app_settings_for_ui(db: AsyncSession) -> dict[str, Any]:
    """Einstellungen für UI – API-Keys maskiert."""
    raw = await get_app_settings(db)
    return {
        "llm_provider": raw["llm_provider"],
        "llm_model": raw["llm_model"],
        "openai_api_key": _mask("openai_api_key", raw["openai_api_key"]) if raw["openai_api_key"] else "",
        "nvidia_api_key": _mask("nvidia_api_key", raw["nvidia_api_key"]) if raw["nvidia_api_key"] else "",
        "openai_configured": bool(raw["openai_api_key"]),
        "nvidia_configured": bool(raw["nvidia_api_key"]),
    }


async def update_app_settings(db: AsyncSession, data: dict[str, Any]) -> dict[str, Any]:
    """Aktualisiert App-Einstellungen. Nur übergebene Keys werden geändert."""
    for key in KEYS:
        if key not in data:
            continue
        val = data[key]
        # Sensitive Keys: leer = nicht überschreiben (User will evtl. behalten)
        if key in SENSITIVE_KEYS and (val is None or (isinstance(val, str) and not val.strip())):
            continue
        str_val = str(val).strip() if val is not None else ""
        result = await db.execute(select(AppSetting).where(AppSetting.key == key))
        row = result.scalar_one_or_none()
        if row:
            row.value = str_val
        else:
            db.add(AppSetting(key=key, value=str_val))
    await db.flush()
    return await get_app_settings_for_ui(db)
