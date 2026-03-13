"""
BroPhysio – SOAP-Strukturierung via LLM
=======================================
Extrahiert S/O/A/P aus Rohtext (z.B. Transkript eines Patientengesprächs).
"""

import json
import logging
import re
from typing import Any

from app.services.ai.router import get_llm_provider

logger = logging.getLogger(__name__)

SOAP_SYSTEM_PROMPT = """Du bist ein medizinischer Dokumentations-Assistent für Physiotherapie.

Strukturiere den Rohtext in SOAP-Kategorien. Antworte AUSSCHLIESSLICH mit einem JSON-Objekt – keine Erklärungen, kein Markdown, kein anderer Text.

Format (exakt diese Keys verwenden):
{"subjective":"...","objective":"...","assessment":"...","plan":"..."}

- subjective: Was der Patient berichtet (Beschwerden, Schmerzen, Alltagsbeeinträchtigung)
- objective: Objektive Befunde (Untersuchung, Messungen, Beobachtungen)
- assessment: Bewertung/Befund (Diagnose, Einordnung)
- plan: Plan (Therapieziele, geplante Maßnahmen, Übungen)

Leere Kategorien als "". Extrahiere alle aus dem Text ableitbaren Informationen."""


def _fallback_rule_based(text: str) -> dict[str, str]:
    """Regelbasierter Fallback wenn LLM nicht verfügbar oder Antwort leer."""
    text = (text or "").strip()
    if not text:
        return {"subjective": "", "objective": "", "assessment": "", "plan": ""}
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    s, o, a, p = [], [], [], []
    current = s
    for ln in lines:
        ln_low = ln.lower()
        if any(x in ln_low for x in ("untersuchung", "lasègue", "beweglichkeit", "messung", "palpation", "druckschmerz")) and len(o) < 5:
            current = o
        elif any(x in ln_low for x in ("diagnose", "verdacht", "befund", "einordnung", "lumboischialgie")) and len(a) < 5:
            current = a
        elif any(x in ln_low for x in ("plan", "therapie", "maßnahme", "übung", "ziel")) and len(p) < 3:
            current = p
        elif not s and any(x in ln_low for x in ("klagt", "schmerzen", "berichtet", "patient")):
            current = s
        current.append(ln)
    return {
        "subjective": " ".join(s) if s else (lines[0] if lines else ""),
        "objective": " ".join(o) if o else "",
        "assessment": " ".join(a) if a else "",
        "plan": " ".join(p) if p else "",
    }


async def structure_text_to_soap(
    raw_text: str,
    provider: str = "ollama",
    model: str | None = None,
    *,
    openai_api_key: str | None = None,
    nvidia_api_key: str | None = None,
) -> dict[str, Any]:
    """
    Strukturiert Rohtext in SOAP (Subjektiv, Objektiv, Assessment, Plan) via LLM.
    Fallback: regelbasiert wenn LLM fehlschlägt oder leere Antwort.
    """
    if not raw_text or not raw_text.strip():
        return {"subjective": "", "objective": "", "assessment": "", "plan": ""}

    try:
        llm = get_llm_provider(
            provider, model,
            openai_api_key=openai_api_key,
            nvidia_api_key=nvidia_api_key,
        )
        response = await llm.chat_completion(
            system_prompt=SOAP_SYSTEM_PROMPT,
            user_message=raw_text[:8000],
            temperature=0.2,
            max_tokens=1500,
        )
    except Exception as e:
        logger.warning("SOAP: LLM nicht erreichbar (%s), Fallback", e)
        return _fallback_rule_based(raw_text)

    text = response.strip()
    logger.info("SOAP LLM raw response (first 300 chars): %s", text[:300] if text else "(empty)")

    # LLM-Fehler (z.B. API-Key fehlt) als Exception weitergeben
    if text.startswith("OpenAI API-Key") or text.startswith("NVIDIA API-Key") or text.startswith("LLM-") or text.startswith("Provider"):
        raise ValueError(text)
    if "Modell" in text and "nicht gefunden" in text:
        logger.warning("SOAP: LLM Modell nicht verfügbar, Fallback. %s", text[:150])
        return _fallback_rule_based(raw_text)
    if "API-Key" in text and "nicht" in text:
        raise ValueError(text)

    # Markdown-Codeblock entfernen
    if "```" in text:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            text = match.group(1).strip()
        else:
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```\s*$", "", text)

    # JSON-Objekt aus Text extrahieren (falls Präambel/Suffix)
    json_str = _extract_json_object(text)
    if not json_str:
        logger.warning("SOAP: Kein JSON in Antwort gefunden, Fallback. Text: %s", text[:200])
        return _fallback_rule_based(raw_text)

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as e:
        # Versuch: trailing commas entfernen
        fixed = re.sub(r",\s*}", "}", re.sub(r",\s*]", "]", json_str))
        try:
            parsed = json.loads(fixed)
        except json.JSONDecodeError:
            logger.warning("SOAP: JSON parse error %s. Text: %s", e, json_str[:200])
            return _fallback_rule_based(raw_text)

    result = _normalize_soap(parsed)
    if not any(result.values()):
        logger.warning("SOAP: LLM lieferte leere Felder, Fallback")
        return _fallback_rule_based(raw_text)
    logger.info("SOAP normalized result: %s", {k: (v[:80] + "..." if len(v) > 80 else v) for k, v in result.items()})
    return result


def _extract_json_object(text: str) -> str | None:
    """Extrahiert das erste {...} aus dem Text (für flaches SOAP-JSON meist ausreichend)."""
    if not text or "{" not in text or "}" not in text:
        return None
    start = text.index("{")
    end = text.rindex("}") + 1
    if end <= start:
        return None
    return text[start:end]


def _to_str(val: Any) -> str:
    """Konvertiert LLM-Wert zu String (handhabt dict/list)."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, dict):
        return (val.get("text") or val.get("content") or val.get("value") or "").strip() or json.dumps(val, ensure_ascii=False)
    if isinstance(val, (list, tuple)):
        return " ".join(str(x) for x in val if x).strip()
    return str(val).strip()


def _normalize_soap(data: Any) -> dict[str, str]:
    """Normalisiert LLM-Output: verschiedene Schlüsselnamen → subjective/objective/assessment/plan."""
    if not isinstance(data, dict):
        return {"subjective": "", "objective": "", "assessment": "", "plan": ""}
    data_lower = {str(k).lower().strip(): v for k, v in data.items()}
    key_map = {
        "subjective": ["subjective", "subjektiv", "s", "subject"],
        "objective": ["objective", "objektiv", "o", "object"],
        "assessment": ["assessment", "bewertung", "a", "befund"],
        "plan": ["plan", "p", "maßnahmen", "massnahmen", "massnahme"],
    }
    result: dict[str, str] = {}
    for target, aliases in key_map.items():
        val = ""
        for alias in aliases:
            v = data_lower.get(alias)
            if v is not None:
                s = _to_str(v)
                if s:
                    val = s
                    break
        result[target] = val
    return result
