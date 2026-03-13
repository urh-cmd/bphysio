#!/usr/bin/env python3
"""
Test SOAP-Strukturierung direkt (ohne API).
Usage: cd backend && python -m scripts.test_soap
"""
import asyncio
import os
import sys

# Backend-Root ins Path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.soap_structure import structure_text_to_soap


SAMPLE_TEXT = """
Der Patient klagt über starke Rückenschmerzen im LWS-Bereich seit zwei Wochen.
Die Schmerzen strahlen ins linke Bein aus. Beim Bücken wird es schlimmer.
Untersuchung: Lasègue links positiv bei 45 Grad. Druckschmerz L4/L5.
Beweglichkeit der LWS eingeschränkt. Muskeltonus erhöht in der Lumbalmuskulatur.
Befund: Verdacht auf Lumboischialgie links, Bandscheibenproblematik L4/L5.
Plan: Manuelle Therapie 2x pro Woche, Kräftigung Rumpfmuskulatur, Rückenschule.
"""


async def main():
    provider = os.environ.get("SOAP_PROVIDER", "ollama")
    model = os.environ.get("SOAP_MODEL", "llama3.2")
    print(f"Testing SOAP with provider={provider}, model={model}")
    print("Sample text:", SAMPLE_TEXT[:150], "...")
    print("-" * 60)
    try:
        result = await structure_text_to_soap(SAMPLE_TEXT, provider=provider, model=model)
        print("Result:")
        for k, v in result.items():
            print(f"  {k}: {v[:100]}..." if len(v) > 100 else f"  {k}: {v or '(leer)'}")
        has_content = any(result.values())
        print("-" * 60)
        print("OK - SOAP enthält Inhalte" if has_content else "WARNUNG - Alle Felder leer!")
        return 0 if has_content else 1
    except Exception as e:
        print(f"FEHLER: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
