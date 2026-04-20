#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env not found. Run init script first."
  exit 1
fi

set -a; source "$ENV_FILE"; set +a

ERRORS=0
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "ERROR: JWT_SECRET must be >= 32 chars (current: ${#JWT_SECRET})"
  ERRORS=1
fi
if [ "$JWT_SECRET" = "please-change-this-to-a-long-random-string" ]; then
  echo "ERROR: JWT_SECRET is default value"
  ERRORS=1
fi
if [ "$POSTGRES_PASSWORD" = "oa_pass_change_me" ]; then
  echo "ERROR: POSTGRES_PASSWORD is default value"
  ERRORS=1
fi
if [ $ERRORS -ne 0 ]; then exit 1; fi
echo "Environment check passed."
