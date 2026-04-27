if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host '.env created from .env.example'
  Write-Host 'Default OCR_PROVIDER=mock, so no Google Cloud OCR calls happen yet.'
  Write-Host 'Open .env only when you want real OCR, then set OCR_PROVIDER=google and GOOGLE_CLOUD_VISION_API_KEY.'
}

docker compose up -d --build

Select-String -Path .env -Pattern '^OCR_PROVIDER=' | ForEach-Object { Write-Host ('OCR mode: ' + ($_.Line -replace '^OCR_PROVIDER=', '')) }
