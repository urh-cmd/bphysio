# BPyhsio – Testanleitung

## Voraussetzungen

- Docker (PostgreSQL)
- Python 3.11+
- Node.js 18+

## Start (2 Terminals)

### Terminal 1: Backend

```bash
cd c:\Users\Nutzer\BPyhsio
docker compose up -d
cd backend
alembic upgrade head          # falls nötig
python -m scripts.seed_admin  # falls nötig (admin@example.com / admin123)
uvicorn app.main:app --reload --port 8001
```

### Terminal 2: Frontend

```bash
cd c:\Users\Nutzer\BPyhsio\frontend
npm install   # erste Mal
npm run dev
```

Öffne http://localhost:3000 (oder den angezeigten Port).

## Test-Workflow

1. **Login:** admin@example.com / admin123
2. **Dashboard:** Willkommensseite mit Kacheln
3. **Patienten:** Neuen Patient anlegen, bearbeiten, löschen
4. **Ganganalyse:**
   - Video hochladen (MP4, AVI, MOV, MKV)
   - Auf „Verarbeiten“ klicken (dauert je nach Video 20–60 s)
   - „Ergebnis anzeigen“ – Metriken und Befund

## Testvideo

Minimales Grauvideo (keine Person, Metriken = 0):

```python
import cv2
import numpy as np
out = cv2.VideoWriter('test.mp4', cv2.VideoWriter_fourcc(*'mp4v'), 30, (640, 480))
for i in range(150):
    out.write(np.zeros((480, 640, 3), dtype=np.uint8))
out.release()
```

Für echte Metriken: Geh-Video von der Seite (10–30 s).
