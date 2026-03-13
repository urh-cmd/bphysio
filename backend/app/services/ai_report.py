"""
BroPhysio - KI-Bericht Service
==============================
Generiert klinische Befundberichte aus Ganganalyse-Daten mittels LLM.
"""

import os
from typing import Optional


def _build_prompt(patient_id: str, clinical_summary: str, metrics: dict) -> str:
    """Baut den Prompt für die KI."""
    metrics_text = "\n".join(
        f"- {k}: {v}" for k, v in sorted(metrics.items()) if v is not None
    ) if metrics else "Keine Metriken verfügbar."

    return f"""Du bist ein erfahrener Physiotherapeut und Bewegungswissenschaftler, spezialisiert auf instrumentelle Ganganalyse.

Erstelle einen professionellen, klinischen Befundbericht basierend auf folgenden Daten:

**Patient:** {patient_id}

**Automatische Zusammenfassung der Ganganalyse:**
{clinical_summary or "Keine Zusammenfassung verfügbar."}

**Detaillierte Metriken:**
{metrics_text}

Erstelle einen strukturierten Befundbericht mit folgenden Abschnitten:

1. ZUSAMMENFASSUNG
   - Kurze Übersicht der wichtigsten Befunde
   - Gesamtbewertung des Gangbildes

2. BEWERTUNG DER GANGPARAMETER
   - Temporale Parameter (Cadenz, Schrittzeit, Phasen)
   - Räumliche Parameter (Schrittlänge, Symmetrie)
   - Kinematische Parameter (Gelenkwinkel)

3. AUFFÄLLIGKEITEN
   - Liste aller pathologischen Befunde
   - Einordnung nach klinischer Relevanz

4. EMPFEHLUNGEN
   - Weiterführende Diagnostik
   - Therapeutische Maßnahmen

Antworte in professionellem klinischem Deutsch. Verwende Fachbegriffe wo angemessen, aber bleibe verständlich.
"""


def _call_ollama(prompt: str, system: str, model: str, base_url: str) -> str:
    """Ruft Ollama (lokal) auf."""
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError("openai package benötigt: pip install openai")

    client = OpenAI(base_url=f"{base_url}/v1", api_key="ollama")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=4096,
    )
    return resp.choices[0].message.content or ""


def _call_openai(prompt: str, system: str, model: str, api_key: str) -> str:
    """Ruft OpenAI API auf."""
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError("openai package benötigt: pip install openai")

    client = OpenAI(api_key=api_key)
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=4096,
    )
    return resp.choices[0].message.content or ""


def _call_nvidia(prompt: str, system: str, model: str, api_key: str) -> str:
    """Ruft NVIDIA NIM API auf (z. B. Kimi K2.5 kostenlos)."""
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError("openai package benötigt: pip install openai")

    client = OpenAI(
        api_key=api_key,
        base_url="https://integrate.api.nvidia.com/v1",
    )
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.3,
        max_tokens=4096,
    )
    return resp.choices[0].message.content or ""


def generate_ai_report(
    patient_id: str,
    clinical_summary: Optional[str],
    metrics: dict,
    provider: str = "ollama",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    ollama_base_url: str = "http://localhost:11434",
) -> str:
    """
    Generiert einen KI-Befundbericht.

    Args:
        patient_id: Patient-ID
        clinical_summary: Automatische Zusammenfassung
        metrics: Metriken-Dict
        provider: "ollama" | "openai" | "nvidia"
        api_key: API-Key (für openai/nvidia)
        model: Modellname (optional)
        ollama_base_url: Ollama-URL (default localhost:11434)

    Returns:
        Generierter Berichtstext
    """
    prompt = _build_prompt(patient_id, clinical_summary or "", metrics)
    system = """Du bist ein erfahrener klinischer Spezialist für Ganganalyse.
Erstelle professionelle, evidenzbasierte Befundberichte.
Verwende korrekte medizinische Fachterminologie.
Bleibe objektiv und vermeide Übertreibungen."""

    provider = provider.lower()
    if provider == "ollama":
        model = model or os.environ.get("OLLAMA_MODEL", "llama3.2")
        return _call_ollama(prompt, system, model, ollama_base_url)
    if provider == "openai":
        key = api_key or os.environ.get("OPENAI_API_KEY")
        if not key:
            raise ValueError("OPENAI_API_KEY fehlt. Bitte in .env setzen oder als Parameter übergeben.")
        model = model or os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        return _call_openai(prompt, system, model, key)
    if provider == "nvidia":
        key = api_key or os.environ.get("NVIDIA_API_KEY")
        if not key:
            raise ValueError("NVIDIA_API_KEY fehlt. Bitte in .env setzen oder als Parameter übergeben.")
        model = model or os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")
        return _call_nvidia(prompt, system, model, key)

    raise ValueError(f"Unbekannter Provider: {provider}. Verfügbar: ollama, openai, nvidia")
