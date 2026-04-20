#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -z "${1:-}" ]; then
  echo "Usage: restore.sh <backup-file.sql>"
  exit 1
fi
BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi
set -a; source "$PROJECT_DIR/.env"; set +a
cat "$BACKUP_FILE" | docker exec -i oa-postgres psql -U "${POSTGRES_USER:-oa}" "${POSTGRES_DB:-oa_db}"
echo "Restore complete from: $BACKUP_FILE"
