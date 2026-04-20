$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "=== OA Init ==="

$envFile = Join-Path $ProjectDir ".env"
$envExample = Join-Path $ProjectDir ".env.example"

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile

    function GeneratePassword($bytes) {
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $buf = New-Object byte[] $bytes
        $rng.GetBytes($buf)
        return [Convert]::ToBase64String($buf)
    }

    $jwtSecret = GeneratePassword 32
    $pgPass = GeneratePassword 16

    $content = Get-Content $envFile -Raw
    $content = $content -replace "please-change-this-to-a-long-random-string", $jwtSecret
    $content = $content -replace "oa_pass_change_me", $pgPass
    Set-Content $envFile $content -NoNewline

    Write-Host "Generated .env with random secrets"
} else {
    Write-Host ".env already exists, skipping generation"
}

& "$ScriptDir/check-env.ps1"

docker compose -f (Join-Path $ProjectDir "docker-compose.yml") up -d --build
Write-Host "Waiting for services..."
Start-Sleep -Seconds 15
& "$ScriptDir/health.ps1"
Write-Host "=== Init complete ==="
