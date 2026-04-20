$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "=== OA Init ==="

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    $global:LASTEXITCODE = 0
    & $Command
    if (-not $?) {
        Write-Host $FailureMessage
        exit 1
    }
    if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        Write-Host $FailureMessage
        exit $LASTEXITCODE
    }
}

$envFile = Join-Path $ProjectDir ".env"
$envExample = Join-Path $ProjectDir ".env.example"

function GeneratePassword($bytes) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buf = New-Object byte[] $bytes
    $rng.GetBytes($buf)
    return [Convert]::ToBase64String($buf)
}

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "Created .env from .env.example"
} else {
    Write-Host ".env already exists"
}

$content = Get-Content $envFile -Raw
$updatedEnv = $false

if ($content.Contains("please-change-this-to-a-long-random-string")) {
    $jwtSecret = GeneratePassword 32
    $content = $content -replace "please-change-this-to-a-long-random-string", $jwtSecret
    $updatedEnv = $true
}

if ($content.Contains("oa_pass_change_me")) {
    $pgPass = GeneratePassword 16
    $content = $content -replace "oa_pass_change_me", $pgPass
    $updatedEnv = $true
}

if ($updatedEnv) {
    Set-Content $envFile $content -NoNewline
    Write-Host "Updated .env default secrets with random values"
}

Invoke-CheckedCommand -Command { & "$ScriptDir/check-env.ps1" } -FailureMessage "Environment check failed."

Invoke-CheckedCommand -Command { docker compose -f (Join-Path $ProjectDir "docker-compose.yml") up -d --build } -FailureMessage "Docker Compose deployment failed."
Write-Host "Waiting for services..."
Start-Sleep -Seconds 15
Invoke-CheckedCommand -Command { & "$ScriptDir/health.ps1" } -FailureMessage "Health check failed."
Write-Host "=== Init complete ==="
