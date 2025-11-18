# --- CONFIG ---
$root = "$PSScriptRoot"
$composeFile = "$root\docker-compose.yml"

# --- START COMPOSE ---
Write-Host "Starting Docker Compose..."
docker compose -f $composeFile up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker compose failed."
    exit 1
}

Write-Host "Containers starting..."

# --- WAIT FOR API ---
Write-Host "Waiting for API (localhost:3001)..."
while (-not (Test-NetConnection -ComputerName "localhost" -Port 3001 -InformationLevel Quiet)) {
    Start-Sleep -Seconds 1
}

# --- WAIT FOR WEB ---
Write-Host "Waiting for WEB (localhost:3000)..."
while (-not (Test-NetConnection -ComputerName "localhost" -Port 3000 -InformationLevel Quiet)) {
    Start-Sleep -Seconds 1
}

Write-Host "Services are up."

# --- OPEN BROWSERS ---
Write-Host "Opening browser tabs..."

Start-Process "http://localhost:3000"      # web
Start-Process "http://localhost:3001"      # api
Start-Process "http://localhost:15672"     # rabbit
Start-Process "http://localhost:3003"      # dbgate

Write-Host "All opened. Ready."
