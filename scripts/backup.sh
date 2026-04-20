#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
mkdir -p "$BACKUP_DIR"
FILENAME="$BACKUP_DIR/$(date +%Y-%m-%d_%H%M%S).sql"
set -a; source "$PROJECT_DIR/.env"; set +a
docker exec oa-postgres pg_dump -U "${POSTGRES_USER:-oa}" "${POSTGRES_DB:-oa_db}" > "$FILENAME"
echo "Backup saved: $FILENAME"
