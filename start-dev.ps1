# BPyhsio - Dev-Server starten
# Beendet Prozesse, startet Docker-DB, Backend, Frontend

$ErrorActionPreference = "Continue"

Write-Host "=== BPyhsio Dev-Start ===" -ForegroundColor Cyan

# 1. Prozesse stoppen
Write-Host "`n[1/4] Stoppe bestehende Prozesse..." -ForegroundColor Yellow
$ports = @(3000, 3001, 8001)
$pids = @()
foreach ($port in $ports) {
    $found = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess } | Where-Object { $_ -gt 0 }
    $pids += $found
}
$pids = $pids | Sort-Object -Unique
foreach ($p in $pids) {
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    Write-Host "  Beendet PID $p"
}
if ($pids.Count -eq 0) { Write-Host "  Keine Prozesse zu beenden" }
Start-Sleep -Seconds 2

# 2. Docker PostgreSQL starten
Write-Host "`n[2/4] Starte PostgreSQL (Docker)..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
$dockerOk = $false
try {
    docker compose up db -d 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch { }
if (-not $dockerOk) {
    Write-Host "  Docker nicht verfuegbar - Starte Docker Desktop oder nutze lokale PostgreSQL" -ForegroundColor Yellow
} else {
    Write-Host "  Warte auf DB..."
    $tries = 0
    while ($tries -lt 30) {
        $ready = docker exec bpyhsio-db pg_isready -U bpyhsio 2>$null
        if ($ready -match "accepting") { break }
        Start-Sleep -Seconds 1
        $tries++
    }
    if ($tries -ge 30) { Write-Host "  Warnung: DB-Start evtl. noch nicht fertig" -ForegroundColor Yellow }
}

# 3. Backend starten
Write-Host "`n[3/4] Starte Backend (Port 8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; python -m uvicorn app.main:app --reload --port 8001 --host 127.0.0.1" -WindowStyle Normal
Start-Sleep -Seconds 4

# 4. Frontend starten
Write-Host "`n[4/4] Starte Frontend (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Write-Host "`n=== Fertig ===" -ForegroundColor Cyan
Write-Host "Backend: http://127.0.0.1:8001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Login: admin@example.com / admin123" -ForegroundColor Gray
Write-Host "`nGanganalyse: Video hochladen -> Verarbeiten (dauert ~10-30 Sek)" -ForegroundColor Gray
