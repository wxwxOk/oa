#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
set -a; source "$PROJECT_DIR/.env"; set +a

ERRORS=0

# Postgres
if docker exec oa-postgres pg_isready -U "${POSTGRES_USER:-oa}" > /dev/null 2>&1; then
  echo "[OK] PostgreSQL"
else
  echo "[FAIL] PostgreSQL"
  ERRORS=1
fi

# Backend
if curl -sf "http://localhost:${BACKEND_PORT:-3000}/health" > /dev/null 2>&1; then
  echo "[OK] Backend"
else
  echo "[FAIL] Backend"
  ERRORS=1
fi

# Frontend
if curl -sf "http://localhost:${FRONTEND_PORT:-9000}/" > /dev/null 2>&1; then
  echo "[OK] Frontend"
else
  echo "[FAIL] Frontend"
  ERRORS=1
fi

if [ $ERRORS -ne 0 ]; then
  echo "Some services are unhealthy!"
  exit 1
fi
echo "All services healthy."
