param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: File not found: $BackupFile"
    exit 1
}

$envVars = @{}
Get-Content (Join-Path $ProjectDir ".env") | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) { $envVars[$parts[0].Trim()] = $parts[1].Trim() }
    }
}

$user = if ($envVars["POSTGRES_USER"]) { $envVars["POSTGRES_USER"] } else { "oa" }
$db = if ($envVars["POSTGRES_DB"]) { $envVars["POSTGRES_DB"] } else { "oa_db" }

Get-Content $BackupFile -Raw | docker exec -i oa-postgres psql -U $user $db
Write-Host "Restore complete from: $BackupFile"
