#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== OA Init ==="

if [ ! -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  JWT_SECRET=$(openssl rand -base64 32)
  PG_PASS=$(openssl rand -base64 16)
  sed -i "s|please-change-this-to-a-long-random-string|$JWT_SECRET|" "$PROJECT_DIR/.env"
  sed -i "s|oa_pass_change_me|$PG_PASS|g" "$PROJECT_DIR/.env"
  sed -i "s|postgresql://oa:oa_pass_change_me@|postgresql://oa:$PG_PASS@|" "$PROJECT_DIR/.env"
  echo "Generated .env with random secrets"
else
  echo ".env already exists, skipping generation"
fi

bash "$SCRIPT_DIR/check-env.sh"

docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d --build
echo "Waiting for services..."
sleep 15
bash "$SCRIPT_DIR/health.sh"
echo "=== Init complete ==="
