# BroPhysio


## Stack

- **Backend:** FastAPI, SQLAlchemy, Alembic, Pydantic
- **Frontend:** Next.js 14, TypeScript, Tailwind, shadcn/ui
- **DB:** PostgreSQL 16
- **KI:** Multi-LLM (OpenAI, Claude, Ollama, NVIDIA NIM), Whisper (lokal)

## Start

```bash
# 1. PostgreSQL (Docker)
docker-compose up -d

# 2. Migrationen (erste Mal)
cd backend && alembic upgrade head

# 3. Admin-Benutzer (erste Mal)
cd backend && python -m scripts.seed_admin
# Login: admin@example.com / admin123

# 4. Backend starten (Terminal 1)
cd backend && uvicorn app.main:app --reload --port 8001

# 5. Frontend starten (Terminal 2)
cd frontend
npm install   # erste Mal
npm run dev
# z.B. http://localhost:3000 (nächster freier Port)
```

**Wichtig:** Beide Server müssen laufen. Das Frontend nutzt den Next.js-Proxy (`NEXT_PUBLIC_API_URL` leer in `.env.local`) – keine CORS-Probleme. Bei direkter API-URL: Backend-Port in `.env.local` anpassen.

**Ganganalyse:** Video hochladen → Verarbeiten starten (YOLOv8-Pose + Metriken). Beim ersten Mal lädt Ultralytics automatisch das Modell.

## Tests

```bash
# Backend (pytest)
cd backend && python -m pytest

# Frontend (vitest)
cd frontend && npm run test
```

## API

- `GET /health` – Health-Check (Backend: Port 8001)
- `POST /api/auth/login` – Login (email, password) → JWT
- `GET /api/auth/me` – Aktueller Benutzer (Bearer Token)
- `GET/POST /api/patients` – Patienten CRUD (Auth erforderlich)
- `POST /api/movement/upload` – Video hochladen (MP4, AVI, MOV, MKV)
- `POST /api/movement/process/{id}` – Session verarbeiten (YOLO + Ganganalyse)
- `GET /api/movement/sessions` – Sessions auflisten

## Projektplan

Siehe `.cursor/plans/` bzw. BPyhsio Full-Stack Plan.
