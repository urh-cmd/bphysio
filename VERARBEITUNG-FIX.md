# Ganganalyse-Verarbeitung – Gait-Analysis Pipeline

## Lösung
Die **funktionierende Streamlit-App** (C:\Users\Nutzer\Desktop\Projekte\gait-analysis) wird als Subprocess aufgerufen.
→ Gleicher Code wie in der Streamlit-App, garantierte Funktionalität.

## Ablauf
1. User klickt "Verarbeiten"
2. Backend ruft `python run_pipeline.py <video> <temp_dir>` auf
3. Wartet auf Abschluss (max. 5 Min)
4. Konvertiert die JSON-Ausgabe ins BPyhsio-Format
5. Speichert in der Datenbank

## Konfiguration
- **GAIT_ANALYSIS_PATH** (optional): Pfad zur Gait-Analysis Pipeline
- Standard: `C:\Users\Nutzer\Desktop\Projekte\gait-analysis`

## Voraussetzungen
- Gait-Analysis Projekt muss am konfigurierten Pfad liegen
- `run_pipeline.py` und Abhängigkeiten (ultralytics, opencv, etc.) müssen dort funktionieren

## Starten
```powershell
.\start-dev.ps1
```

Frontend ruft Backend direkt auf (NEXT_PUBLIC_API_URL), kein Proxy-Timeout.
