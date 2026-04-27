#!/usr/bin/env bash
set -euo pipefail
[ -f .env ] || ./prepare-app.sh
docker compose up -d --build

echo
printf 'Frontend: http://localhost:%s
' "$(grep '^FRONTEND_PORT=' .env | cut -d= -f2)"
printf 'Backend health: http://localhost:%s/api/health
' "$(grep '^BACKEND_PORT=' .env | cut -d= -f2)"

echo "OCR mode: $(grep '^OCR_PROVIDER=' .env | cut -d= -f2)"
