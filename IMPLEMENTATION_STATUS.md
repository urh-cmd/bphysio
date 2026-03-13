# BPyhsio – Implementierungsstatus

Stand: 2026-03-11 (aus gait-analysis-plan.md)

---

## ✅ Phase 1 MVP – Erledigt

| Plan | Status | Umsetzung |
|------|--------|-----------|
| Woche 1: Setup | ✅ | Next.js + FastAPI, YOLOv8-pose |
| Woche 2: Pose-Estimation | ✅ | pose_2d.py: Video→Keypoints |
| Woche 3: Metrik-Berechnung | ✅ | gait_2d.py: Schritte, Cadenz, Symmetrie, Phasen |
| Woche 4: One Euro Filter | ✅ | one_euro_filter.py integriert |
| Woche 5: UI | ✅ | Next.js Dashboard (7 Tabs) statt Streamlit |
| Woche 6: Polish | ✅ | Fehlerbehandlung, Video-Player, Tests |

**Features:**
- Video-Upload, Verarbeitung (Thread-Pool)
- Keypoint-Verlauf (Plotly)
- Pose-Video mit Overlay (professionelles Farbschema, 60fps)
- Statistiken, Ganganalyse, Symmetrie
- KI-Bericht (Ollama/NVIDIA/OpenAI, vollständig angebunden)
- Export (JSON Keypoints, JSON Analyse, CSV Metriken)

---

## ✅ Phase 2 – Transkription, Akten, Trainingspläne (Neu)

| Modul | Status | Umsetzung |
|-------|--------|-----------|
| Akten (Records) | ✅ | CRUD, SOAP-Struktur, Filter nach Patient |
| Transkription | ✅ | Audio-Upload, Whisper (OpenAI API), Prozess-Endpoint |
| Trainingspläne | ✅ | CRUD, Vorlagen, Markdown-Inhalt, Patientenzuordnung |

**Backend:** `records.py`, `transcripts.py`, `training_plans.py`, Models + Migration  
**Frontend:** Dashboard-Seiten für Akten, Transkription, Trainingspläne; Sidebar-Links; Patient-Detail-Schnellzugriff

**Transkription:** Zwei Provider:
- **faster_whisper** (Standard): Lokal, kostenlos, kein Abo. Modell-Download beim ersten Aufruf.
- **openai**: Cloud-API, `OPENAI_API_KEY` in `.env` + Abo.
- Konfiguration: `TRANSCRIPTION_PROVIDER=faster_whisper|openai`, optional `FASTER_WHISPER_MODEL=base|small|medium`

---

## ✅ Phase 2 (Erweiterung) – Zuweiser, Recall, Behandlungsprotokoll

| Modul | Status | Umsetzung |
|-------|--------|-----------|
| Zuweiser (Ärzte) | ✅ | CRUD, Suche, Sidebar |
| Recall (Wiedervorstellung) | ✅ | CRUD, Patient-Filter, erledigt/benachrichtigt |
| Behandlungsprotokoll | ✅ | CRUD, Patient-Filter, Leistung/Dauer/Notiz |

**Backend:** `zuweiser.py`, `recall.py`, `treatment_log.py` – Models, Migration `b2c3d4e5f6a7`  
**Frontend:** Dashboard-Seiten für Zuweiser, Wiedervorstellung, Behandlungsprotokoll; Schnellzugriff auf Patient-Detail

---

## 🔜 Nächste Schritte (priorisiert)

### 1. PDF-Report ✅
- **Was:** PDF-Bericht aus Ganganalyse-Daten
- **Umsetzung:** Backend `pdf_report.py` + Endpoint `GET /sessions/{id}/pdf-report`; Button im Export-Tab

### 2. Docker-Setup (Deployment) ✅
- **Was:** docker-compose für PostgreSQL + Backend + Frontend
- **Nutzen:** Einfachere Installation und Nutzung
- **Umsetzung:** `docker compose up --build` – db, backend, frontend laufen

### 3. Fehlerbehandlung & Robustheit (Woche 6) ✅
- **Was:** Klarere Fehlermeldungen, Timeout-Handling, Fallbacks
- **Umsetzung:** KI-Bericht 2-Min-Timeout; Failed-Session-Banner mit „Erneut verarbeiten“-Button

### 4. KI-Bericht ✅
- **Was:** Anbindung an Backend-API für KI-Befund
- **Umsetzung:** POST /api/movement/sessions/{id}/ai-report, Provider: Ollama, NVIDIA, OpenAI

### 5. Patient↔Session-Integration ✅
- **Was:** Sessions einem Patient zuordnen, von Patient-Seite aus starten
- **Umsetzung:** Upload mit patient_id (Form); Patient-Detail: „Neue Ganganalyse“ + Sessions-Liste; Movement mit ?patient_id= für Kontext

### 6. Phase 2 (später): SfM, Multi-Video, erweiterte Metriken
- Aufwändiger, kann separat geplant werden

---

## Tests

- **Backend:** pytest (13 Tests) – gait_2d, one_euro_filter, pdf_report, API health. Ausführen: `cd backend && python -m pytest`
- **Frontend:** vitest (2 Tests) – api helper. Ausführen: `cd frontend && npm run test`

---

## ✅ Termin-Verwaltung (Plan Phase 3)

| Modul | Status | Umsetzung |
|-------|--------|-----------|
| Termin-Verwaltung | ✅ | Dashboard-Seite `/dashboard/appointments`, Admin-API |
| Buchungen-Liste | ✅ | GET /api/appointments/admin/appointments |
| Slots-Liste | ✅ | GET /api/appointments/admin/slots |
| Slots generieren | ✅ | POST /api/appointments/admin/slots/generate |
| Therapeut anlegen | ✅ | POST /api/appointments/admin/therapists |

**Frontend:** Termine-Tab in Sidebar, Buchungen/Slots mit Datumsfilter, Slots generieren, Therapeut anlegen (wenn keine vorhanden)

---

---

## ✅ Phase 4 – Abrechnungsrelevante Themen & externe Schnittstellen

| Modul | Status | Umsetzung |
|-------|--------|-----------|
| Leistungskatalog (EBM/Heilmittel) | ✅ | ServiceCatalog-Modell, 10 Codes (KG, MT, PNF etc.), API GET /api/billing/services |
| Patient Versicherungsdaten | ✅ | insurance_type, insurance_name, insurance_number im Patient-Modell |
| Verordnungen | ✅ | Prescription + PrescriptionItem, CRUD-API, Verknüpfung Zuweiser/Patient |
| TreatmentLog ↔ Verordnung | ✅ | prescription_id optional, Behandlungen Verordnung zuordenbar |
| Abrechnungs-Export | ✅ | GET /api/billing/export?from=&to=&format=csv\|json – CSV (Excel), JSON für API |

**Frontend:**
- **Abrechnungs-Export:** Seite `/dashboard/billing` – Zeitraum wählen, CSV/JSON herunterladen
- **Verordnungen:** Liste, Neu, Detail – `/dashboard/prescriptions`
- **Behandlungsprotokoll:** Leistungs-Dropdown aus Katalog, Verordnungs-Auswahl
- **Patient:** Versicherungs-Bereich (Kassenart, Krankenkasse, Versicherungsnummer)

**Externe Schnittstellen:** Export enthält Patient, Versicherung, Leistungscode, Dauer, Verordnung-ID – geeignet für Anbindung an Abrechnungssoftware (Rehadat, MDP etc.).

---

## Offene Punkte

- **Auswertungen:** Detailverbesserungen wie besprochen später
- **Pixel→cm Kalibrierung:** Aktuell pixel_to_cm=1.0; Referenz/Marker optional
- **GDPR-Checkliste:** Noch nicht vollständig abgearbeitet
