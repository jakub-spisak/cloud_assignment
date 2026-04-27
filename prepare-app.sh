#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env created from .env.example"
fi

jwt_secret=$(python3 - <<'PY2'
import secrets
print(secrets.token_hex(32))
PY2
)

sa_password=$(python3 - <<'PY2'
import secrets, string
alphabet = string.ascii_letters + string.digits
middle = ''.join(secrets.choice(alphabet) for _ in range(10))
print(f'Nw!{middle}2026Aa')
PY2
)

python3 - <<PY2
from pathlib import Path
path = Path('.env')
text = path.read_text(encoding='utf-8')
text = text.replace('JWT_SECRET=replace_this_with_a_long_random_secret', 'JWT_SECRET=${jwt_secret}')
text = text.replace('SA_PASSWORD=ChangeMe2026!Strong', 'SA_PASSWORD=${sa_password}')
text = text.replace('DB_PASSWORD=ChangeMe2026!Strong', 'DB_PASSWORD=${sa_password}')
path.write_text(text, encoding='utf-8')
PY2

echo "Secrets prepared. Default OCR_PROVIDER=mock, so no Google Cloud OCR calls happen yet."
echo "Open .env only when you want real OCR, then set OCR_PROVIDER=google and GOOGLE_CLOUD_VISION_API_KEY."
