# BPyhsio – Online-Freigabe via Docker

## Schnellstart (lokal testen)

```bash
docker compose up -d --build
```

- Frontend: http://localhost:3000
- Backend-API: http://localhost:8001

## Production / Online-Freigabe

### 1. Voraussetzungen

- Server mit Docker & Docker Compose (z.B. VPS bei Hetzner, DigitalOcean)
- Öffentliche IP oder Domain

### 2. Sichere Umgebungsvariablen

Erstellen Sie `.env` im Projektordner:

```env
POSTGRES_PASSWORD=IhrSicheresPasswort123
```

### 3. Starten

```bash
# Neu bauen und starten (API-Calls laufen über gleiche Domain)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 4. Zugriff

- **Direkt via IP:** http://Ihre-Server-IP:3000
- **Mit Domain:** Nach Einrichtung von DNS (A-Record auf Server-IP) und ggf. Reverse-Proxy (nginx, Caddy) für HTTPS

### 5. Ports

| Port | Service  |
|------|----------|
| 3000 | Frontend (Web-App) |
| 8001 | Backend-API (optional extern, wenn nötig) |
| 5432 | PostgreSQL (nur intern, nicht exponieren) |

### 6. HTTPS (empfohlen für Produktion)

Für HTTPS z.B. **Caddy** als Reverse-Proxy vor Frontend:

```bash
# Caddyfile
 Ihre-Domain.de {
   reverse_proxy localhost:3000
 }
```

Oder **nginx** mit Let's Encrypt (certbot).

### 7. Updates

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### 8. Logs & Status

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```
