$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectDir ".env"

if (-not (Test-Path $EnvFile)) {
    Write-Host "ERROR: .env not found. Run init script first."
    exit 1
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $envVars[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
}

$errors = 0
$jwtSecret = $envVars["JWT_SECRET"]
$pgPassword = $envVars["POSTGRES_PASSWORD"]

if (-not $jwtSecret -or $jwtSecret.Length -lt 32) {
    Write-Host "ERROR: JWT_SECRET must be >= 32 chars (current: $($jwtSecret.Length))"
    $errors++
}
if ($jwtSecret -eq "please-change-this-to-a-long-random-string") {
    Write-Host "ERROR: JWT_SECRET is default value"
    $errors++
}
if ($pgPassword -eq "oa_pass_change_me") {
    Write-Host "ERROR: POSTGRES_PASSWORD is default value"
    $errors++
}
if ($errors -gt 0) { exit 1 }
Write-Host "Environment check passed."
