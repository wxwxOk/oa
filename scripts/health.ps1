$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

$envVars = @{}
Get-Content (Join-Path $ProjectDir ".env") | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) { $envVars[$parts[0].Trim()] = $parts[1].Trim() }
    }
}

$backendPort = if ($envVars["BACKEND_PORT"]) { $envVars["BACKEND_PORT"] } else { "3000" }
$frontendPort = if ($envVars["FRONTEND_PORT"]) { $envVars["FRONTEND_PORT"] } else { "9000" }
$pgUser = if ($envVars["POSTGRES_USER"]) { $envVars["POSTGRES_USER"] } else { "oa" }

$errors = 0

# Postgres
try {
    $null = docker exec oa-postgres pg_isready -U $pgUser 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Host "[OK] PostgreSQL" }
    else { Write-Host "[FAIL] PostgreSQL"; $errors++ }
} catch { Write-Host "[FAIL] PostgreSQL"; $errors++ }

# Backend
try {
    $null = Invoke-WebRequest -Uri "http://localhost:$backendPort/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Backend"
} catch { Write-Host "[FAIL] Backend"; $errors++ }

# Frontend
try {
    $null = Invoke-WebRequest -Uri "http://localhost:$frontendPort/" -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Frontend"
} catch { Write-Host "[FAIL] Frontend"; $errors++ }

if ($errors -gt 0) {
    Write-Host "Some services are unhealthy!"
    exit 1
}
Write-Host "All services healthy."
