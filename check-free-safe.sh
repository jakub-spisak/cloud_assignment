#!/usr/bin/env bash
set -euo pipefail
[ -f .env ] || { echo ".env not found"; exit 1; }

echo "=== Noteworthy free-safe check ==="
grep -E '^(OCR_PROVIDER|OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY|OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY|GOOGLE_CLOUD_VISION_API_KEY)=' .env | while IFS= read -r line; do
  key="${line%%=*}"
  value="${line#*=}"
  if [ "$key" = "GOOGLE_CLOUD_VISION_API_KEY" ]; then
    if [ -n "$value" ]; then
      echo "$key=SET"
    else
      echo "$key=EMPTY"
    fi
  else
    echo "$line"
  fi
done

provider=$(grep '^OCR_PROVIDER=' .env | cut -d= -f2)
key=$(grep '^GOOGLE_CLOUD_VISION_API_KEY=' .env | cut -d= -f2-)

if [ "$provider" = "mock" ]; then
  echo "Result: Google OCR charges cannot happen from this app until you switch OCR_PROVIDER=google."
elif [ -z "$key" ]; then
  echo "Result: OCR_PROVIDER=google but API key is empty, so real OCR calls will fail instead of being billed."
else
  echo "Result: Real Google OCR is enabled. Daily hard limits still apply."
fi
