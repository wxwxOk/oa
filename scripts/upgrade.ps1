$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "=== OA Upgrade ==="
Write-Host "Pulling latest images..."
docker compose -f (Join-Path $ProjectDir "docker-compose.yml") pull
Write-Host "Rebuilding and restarting..."
docker compose -f (Join-Path $ProjectDir "docker-compose.yml") up -d --build
Write-Host "Waiting for services..."
Start-Sleep -Seconds 15
& "$ScriptDir/health.ps1"
Write-Host "=== Upgrade complete ==="
