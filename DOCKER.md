# BPyhsio – Docker Setup

## Schnellstart

```bash
# Alle Services starten (DB, Backend, Frontend)
docker compose up --build -d

# Logs anzeigen
docker compose logs -f
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8001
- **PostgreSQL:** localhost:5432 (User: bpyhsio, Pass: bpyhsio_local, DB: bpyhsio)

## Services

| Service  | Port | Beschreibung                        |
|----------|------|-------------------------------------|
| frontend | 3000 | Next.js Dashboard                   |
| backend  | 8001 | FastAPI + Ganganalyse + KI-Bericht  |
| db       | 5432 | PostgreSQL 16                       |

## KI-Bericht (Ollama)

Ollama läuft typischerweise auf dem Host. Im Container ist `localhost` der Container selbst.

**Option A – Ollama auf Host:**  
Ollama unter Windows/Mac starten. Im Backend-Container `localhost` erreicht den Host nicht. Für Docker Desktop: `OLLAMA_BASE_URL=http://host.docker.internal:11434` als Env beim Backend setzen (optional, wenn du Ollama nutzt).

**Option B – Ollama in Docker:**  
Eigenen Ollama-Service in docker-compose ergänzen.

## Daten

- Uploads und verarbeitete Videos: persistente Volumes `bpyhsio_uploads`, `bpyhsio_processed`
- Datenbank: Volume `bpyhsio_data`

## Nur Datenbank

```bash
docker compose up -d db
# Backend und Frontend lokal starten (siehe README)
```
