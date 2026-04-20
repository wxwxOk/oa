#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== OA Upgrade ==="
echo "Pulling latest images..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" pull
echo "Rebuilding and restarting..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d --build
echo "Waiting for services..."
sleep 15
bash "$SCRIPT_DIR/health.sh"
echo "=== Upgrade complete ==="
