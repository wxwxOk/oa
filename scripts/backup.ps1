$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$BackupDir = Join-Path $ProjectDir "backups"

if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$filename = Join-Path $BackupDir "$timestamp.sql"

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

docker exec oa-postgres pg_dump -U $user $db | Out-File -Encoding utf8 $filename
Write-Host "Backup saved: $filename"
