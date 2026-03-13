# BPyhsio – Workflow-Test-Checkliste

## Voraussetzung

```bash
# 1. DB starten
docker compose up -d db

# 2. Backend
cd backend && alembic upgrade head && python -m scripts.seed_admin
python -m uvicorn app.main:app --port 8001

# 3. Frontend
cd frontend && npm run dev
# Login: admin@example.com / admin123
```

## Workflow 1: Patient → Ganganalyse

1. [ ] Login unter http://localhost:3000/login
2. [ ] Dashboard → Patienten
3. [ ] Patient öffnen (oder neuen anlegen)
4. [ ] Button „Neue Ganganalyse“ klicken → Weiterleitung zu /dashboard/movement?patient_id=xxx
5. [ ] Patient ist vorausgewählt
6. [ ] Video wählen, hochladen
7. [ ] Session erscheint in der Liste (mit Patientennamen)
8. [ ] „Verarbeiten“ klicken
9. [ ] Nach Abschluss: „Ergebnis anzeigen“ → Session-Detail
10. [ ] InfoCard „Patient“ zeigt Link zum Patient

## Workflow 2: Ganganalyse ohne Patient

1. [ ] /dashboard/movement (ohne patient_id)
2. [ ] Patient-Auswahl „— Kein Patient —“
3. [ ] Upload, Verarbeiten, Ergebnis

## Workflow 3: Patient-Detail – Sessions

1. [ ] Patient mit mindestens einer Session öffnen
2. [ ] Abschnitt „Ganganalyse“ mit Sessions-Liste
3. [ ] Pending: „Verarbeiten“-Button
4. [ ] Completed: Link „Ergebnis“
5. [ ] Failed: Link zu Detail (Retry-Banner)

## Workflow 4: Fehlgeschlagene Session

1. [ ] Session mit Status „failed“ öffnen
2. [ ] Banner „Verarbeitung fehlgeschlagen“ mit Fehlermeldung
3. [ ] „Erneut verarbeiten“ funktioniert

## API-Tests (automatisch)

```bash
cd backend && python -m pytest
# 15 Tests inkl. Movement-API
```
