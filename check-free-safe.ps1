if (-not (Test-Path .env)) {
  Write-Host '.env not found'
  exit 1
}

Write-Host '=== Noteworthy free-safe check ==='
$lines = Get-Content .env | Where-Object { $_ -match '^(OCR_PROVIDER|OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY|OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY|GOOGLE_CLOUD_VISION_API_KEY)=' }

foreach ($line in $lines) {
  if ($line -match '^GOOGLE_CLOUD_VISION_API_KEY=(.*)$') {
    if ($Matches[1]) { Write-Host 'GOOGLE_CLOUD_VISION_API_KEY=SET' } else { Write-Host 'GOOGLE_CLOUD_VISION_API_KEY=EMPTY' }
  } else {
    Write-Host $line
  }
}

$provider = ((Get-Content .env | Select-String '^OCR_PROVIDER=').Line -replace '^OCR_PROVIDER=', '')
$key = ((Get-Content .env | Select-String '^GOOGLE_CLOUD_VISION_API_KEY=').Line -replace '^GOOGLE_CLOUD_VISION_API_KEY=', '')

if ($provider -eq 'mock') {
  Write-Host 'Result: Google OCR charges cannot happen from this app until you switch OCR_PROVIDER=google.'
} elseif ([string]::IsNullOrWhiteSpace($key)) {
  Write-Host 'Result: OCR_PROVIDER=google but API key is empty, so real OCR calls will fail instead of being billed.'
} else {
  Write-Host 'Result: Real Google OCR is enabled. Daily hard limits still apply.'
}
