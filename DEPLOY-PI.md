# BPyhsio auf Raspberry Pi

## Voraussetzungen

- **Raspberry Pi 4 oder 5** (empfohlen 4 GB RAM oder mehr)
- **Raspberry Pi OS 64-Bit** (nicht 32-Bit)
- **Docker & Docker Compose** installiert

## Zwei Wege: Mit Build oder ohne (empfohlen)

| Weg | Start | Update | Dauer |
|-----|-------|--------|-------|
| **Ohne Build** (Pull) | `pull` + `up -d` | `pull` + `up -d` | Sekunden |
| **Mit Build** | `up -d --build` | `up -d --build` | 15–30 Min |

## 1. Raspberry Pi OS 64-Bit

Prüfen:
```bash
uname -m
```
Ausgabe sollte `aarch64` sein.

Falls 32-Bit (`armv7l`): [Raspberry Pi OS 64-Bit](https://www.raspberrypi.com/software/) installieren.

## 2. Docker installieren

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

Abmelden und neu anmelden (oder Neustart), damit die Gruppe aktiv wird.

```bash
sudo apt install docker-compose-plugin
```

## 3. Projekt auf den Pi bringen

**Option A – Git (für beide Varianten):**
```bash
git clone <Ihr-Repo> ~/BPyhsio
cd ~/BPyhsio
echo "GITHUB_OWNER=urh-cmd" >> .env   # für Pull-Variante (dein GitHub-Name)
```

**Option B – Dateien kopieren:**
Projektordner per SCP, USB-Stick oder Netzfreigabe auf den Pi kopieren, z.B. nach `~/BPyhsio`.

## 4. Starten

### Ohne Build (empfohlen – Sekunden statt Minuten)

Voraussetzung: GitHub Actions hat die ARM64-Images gebaut (Push auf main/master). Pakete unter ghcr.io müssen öffentlich sein oder du loggst dich ein.

```bash
cd ~/BPyhsio
docker compose -f docker-compose.pi-pull.yml pull
docker compose -f docker-compose.pi-pull.yml up -d
```

**Erstes Mal:**
1. Repository-Einstellungen → Actions → General → „Read and write permissions“ für Workflows aktivieren
2. Einmal auf main/master pushen – GitHub Actions baut die ARM64-Images
3. GitHub → dein Profil → Packages → `bpyhsio-backend` und `bpyhsio-frontend` → Package settings → **Public** setzen (damit der Pi ohne Login pullen kann)

**Private Repos / private Packages:** Vor dem Pull einloggen:
`echo DEIN_GITHUB_TOKEN | docker login ghcr.io -u DEIN_USERNAME --password-stdin`

### Mit Build (15–30 Min pro Update)

```bash
cd ~/BPyhsio
docker compose -f docker-compose.yml -f docker-compose.pi.yml up -d --build
```

## 5. Zugriff

- **Lokal auf dem Pi:** http://localhost:3001
- **Im Netzwerk:** http://<PI-IP>:3001 (z.B. http://192.168.188.34:3001)

## Einschränkungen auf dem Pi

| Aspekt | Hinweis |
|--------|---------|
| **Ganganalyse** | Deutlich langsamer als auf PC (mehrere Minuten pro Video) |
| **RAM** | 4 GB empfohlen; bei 2 GB evtl. Auslagerung/Swapping |
| **Wärme** | Kühlung empfohlen bei längerer Nutzung |

## Performance verbessern

Falls die Ganganalyse zu langsam ist, kann `max_frames` im Backend reduziert werden (z.B. in `backend/app/api/movement.py` von 180 auf 60). Weniger Frames = schneller, aber weniger Genauigkeit.

## Updates

**Pull-Variante (schnell):**
```bash
cd ~/BPyhsio
git pull
docker compose -f docker-compose.pi-pull.yml pull && docker compose -f docker-compose.pi-pull.yml up -d
```

**Build-Variante:**
```bash
cd ~/BPyhsio
git pull
docker compose -f docker-compose.yml -f docker-compose.pi.yml up -d --build
```
