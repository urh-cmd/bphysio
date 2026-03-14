# BPyhsio im Internet veröffentlichen

## Schnellstart: Pi ohne Build

Wenn du die **Pull-Variante** nutzt (`docker-compose.pi-pull.yml`), musst du nie auf dem Pi bauen. Images werden per GitHub Actions gebaut, der Pi holt sie per `docker compose pull`. Details siehe [DEPLOY-PI.md](DEPLOY-PI.md).

## Übersicht der Optionen

| Option | Schwierigkeit | Port-Forward nötig? | HTTPS | Kosten |
|--------|---------------|---------------------|-------|--------|
| **Cloudflare Tunnel** | Einfach | Nein | Ja (kostenlos) | Kostenlos |
| **Port-Forward + Caddy** | Mittel | Ja | Ja (Let's Encrypt) | Kostenlos |
| **Port-Forward nur** | Einfach | Ja | Nein | Kostenlos |

---

## Option 1: Cloudflare Tunnel (empfohlen – kein Port-Forward)

**Vorteil:** Router muss nicht geändert werden, automatisches HTTPS.

### Voraussetzungen
- Kostenloses Cloudflare-Konto
- Eine Domain (kostenlos z.B. bei Freenom oder Cloudflare Registrar)

### Schritte

1. **Cloudflare Tunnel auf dem Pi installieren:**

```bash
# Als root oder mit sudo
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

2. **Bei Cloudflare anmelden:**
   - https://one.dash.cloudflare.com
   - Zero Trust → Access → Tunnels → Create tunnel
   - Name: `bpyhsio`
   - Connector: Docker oder `cloudflared` auf dem Pi

3. **Tunnel konfigurieren:**
   - Public Hostname: `bpyhsio.deine-domain.de` (oder Subdomain)
   - Service: `http://localhost:3001` (Frontend-Port auf dem Pi)
   - Save tunnel

4. **Token vom Dashboard kopieren** und auf dem Pi ausführen:

```bash
cloudflared service install <DEIN-TUNNEL-TOKEN>
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

5. **CORS setzen:** Damit das Backend die Anfragen von deiner Domain akzeptiert, in `.env` auf dem Pi:
   ```
   CORS_ORIGINS_EXTRA=https://bpyhsio.deine-domain.de
   ```
   Danach Backend-Container neu starten: `docker compose -f docker-compose.pi-pull.yml restart backend`

6. **Zugriff:** https://bpyhsio.deine-domain.de

---

## Option 2: Port-Forward + Let's Encrypt (Caddy)

**Vorteil:** Volle Kontrolle, keine Cloudflare-Abhängigkeit.

### Schritt 1: Router – Port-Weiterleitung

1. Router-Konfiguration öffnen (meist http://192.168.1.1 oder 192.168.0.1)
2. **Port-Forwarding** / **NAT** / **Virtuelle Server** suchen
3. Regel anlegen:
   - **Externer Port:** 80 (HTTP), 443 (HTTPS)
   - **Internes Ziel:** 192.168.188.34 (dein Pi)
   - **Interner Port:** 80 und 443

### Schritt 2: Dynamische IP – DDNS (falls nötig)

Wenn deine Internet-IP sich ändert:
- Bei Cloudflare, No-IP, DuckDNS o.ä. kostenlosen DDNS einrichten
- Hostname z.B. `mein-praxis.ddns.net` → zeigt auf deine aktuelle IP

### Schritt 3: Caddy als Reverse-Proxy auf dem Pi

```bash
# Caddy installieren
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# Caddyfile erstellen (Domain ersetzen!)
echo 'bpyhsio.deine-domain.de {
    reverse_proxy localhost:3001
}' | sudo tee /etc/caddy/Caddyfile

sudo systemctl reload caddy
```

Caddy holt automatisch ein Let's-Encrypt-Zertifikat.

### Zugriff
https://bpyhsio.deine-domain.de

---

## Option 3: Nur Port-Forward (ohne HTTPS)

**Nur für Tests** – unsicher, da unverschlüsselt.

1. Router: Port 3000 → 192.168.188.34:3000 weiterleiten
2. Deine öffentliche IP ermitteln: https://whatismyip.com
3. Zugriff: http://DEINE-OEFFENTLICHE-IP:3000

**Nachteil:** Kein HTTPS, viele Browser zeigen Warnungen.

---

## Sicherheits-Checkliste vor Veröffentlichung

- [ ] **Datenbank-Passwort** in `.env` ändern (nicht `bpyhsio_local`)
- [ ] **CORS_ORIGINS_EXTRA** in `.env` auf deine öffentliche Domain setzen (z.B. `https://bpyhsio.deine-domain.de`)
- [ ] **Neuen Admin-Benutzer** in der App anlegen, Test-Accounts löschen
- [ ] **NVIDIA/OpenAI API-Keys** nicht im Frontend exponiert (Backend-only ✓)
- [ ] **Regelmäßige Backups** der DB und Uploads einplanen

---

## Empfehlung

Für den Start: **Cloudflare Tunnel** – kein Port-Forward, automatisches HTTPS, gut abgesichert.
