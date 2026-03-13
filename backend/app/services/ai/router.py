"""
LLM Provider Router – liefert ein Client-Objekt für den konfigurierten Provider.
"""

from typing import Optional

from app.core.config import settings


class _LLMClient:
    """Wrapper mit async chat_completion für Terminbuchung etc."""

    def __init__(
        self,
        provider: str,
        model: str,
        *,
        openai_api_key: str | None = None,
        nvidia_api_key: str | None = None,
    ):
        self.provider = provider
        self.model = model
        self._openai_key = openai_api_key
        self._nvidia_key = nvidia_api_key

    def _resolve_openai_key(self) -> str | None:
        return self._openai_key if self._openai_key else settings.OPENAI_API_KEY

    def _resolve_nvidia_key(self) -> str | None:
        return self._nvidia_key if self._nvidia_key else settings.NVIDIA_API_KEY

    async def chat_completion(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.7,
        max_tokens: int = 300,
    ) -> str:
        """Generiert eine Chat-Antwort via konfigurierten LLM-Provider."""
        try:
            from openai import AsyncOpenAI
        except ImportError:
            return "LLM-Service nicht verfügbar. Bitte installieren Sie das openai-Paket."

        if self.provider == "ollama":
            client = AsyncOpenAI(
                base_url=f"{settings.OLLAMA_BASE_URL}/v1",
                api_key="ollama",
            )
        elif self.provider == "openai":
            key = self._resolve_openai_key()
            if not key:
                return "OpenAI API-Key nicht konfiguriert. In Einstellungen hinterlegen."
            client = AsyncOpenAI(api_key=key)
        elif self.provider == "nvidia":
            key = self._resolve_nvidia_key()
            if not key:
                return "NVIDIA API-Key nicht konfiguriert. In Einstellungen hinterlegen."
            client = AsyncOpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=key,
            )
        else:
            return f"Provider '{self.provider}' wird noch nicht unterstützt."

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_message})

        try:
            resp = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as e:
            err_str = str(e).lower()
            if "404" in err_str or "not found" in err_str or "page not found" in err_str:
                if self.provider == "ollama":
                    return (
                        f"Modell '{self.model}' nicht gefunden. "
                        f"Bitte zuerst mit 'ollama pull {self.model}' installieren. "
                        f"Ollama muss laufen (http://localhost:11434)."
                    )
                elif self.provider == "nvidia":
                    return (
                        f"NVIDIA-Modell '{self.model}' nicht gefunden. "
                        f"Modell-ID in den Einstellungen prüfen."
                    )
                return f"Modell '{self.model}' nicht gefunden. Bitte Modell-Auswahl prüfen."
            return f"LLM-Fehler: {e}"


# NVIDIA NIM erwartet "moonshotai/kimi-k2.5" (Punkt). Alias "kimi-k2-5" (Bindestrich) wird intern umgewandelt.
_NVIDIA_MODEL_ALIASES = {"moonshotai/kimi-k2-5": "moonshotai/kimi-k2.5"}

_PROVIDER_MODELS: dict[str, list[str]] = {
    "ollama": ["llama3.2", "llama3.1", "mistral", "codellama", "gemma2"],
    "openai": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
    "nvidia": ["moonshotai/kimi-k2.5"],
}


def _default_model(provider: str) -> str:
    return _PROVIDER_MODELS.get(provider, ["llama3.2"])[0]


def get_llm_provider(
    provider: str = "ollama",
    model: Optional[str] = None,
    *,
    openai_api_key: str | None = None,
    nvidia_api_key: str | None = None,
) -> _LLMClient:
    """Gibt einen LLM-Client für den angegebenen Provider zurück."""
    prov = provider or "ollama"
    chosen = model or _default_model(prov)
    if prov == "nvidia" and chosen in _NVIDIA_MODEL_ALIASES:
        chosen = _NVIDIA_MODEL_ALIASES[chosen]
    return _LLMClient(
        provider=prov,
        model=chosen,
        openai_api_key=openai_api_key,
        nvidia_api_key=nvidia_api_key,
    )


def get_available_providers(
    openai_configured: bool = False,
    nvidia_configured: bool = False,
) -> list[dict]:
    """Liefert verfügbare Provider und Modelle für die UI."""
    openai_ok = openai_configured or bool(settings.OPENAI_API_KEY)
    nvidia_ok = nvidia_configured or bool(settings.NVIDIA_API_KEY)
    return [
        {"id": "ollama", "label": "Ollama", "models": _PROVIDER_MODELS["ollama"], "available": bool(settings.OLLAMA_BASE_URL)},
        {"id": "openai", "label": "OpenAI", "models": _PROVIDER_MODELS["openai"], "available": openai_ok},
        {"id": "nvidia", "label": "NVIDIA Kimi K2.5", "models": _PROVIDER_MODELS["nvidia"], "available": nvidia_ok},
    ]
