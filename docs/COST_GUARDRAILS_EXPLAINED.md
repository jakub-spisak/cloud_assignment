# Vysvetlenie ochranných nastavení proti nákladom

## Súbor `.env.example`

### `OCR_PROVIDER=mock`
Kým to nezmeníš na `google`, backend nikdy neposiela obrázky do Google Cloud Vision.

### `GOOGLE_CLOUD_AUTH_MODE` a Google credentials
Projekt podporuje dva režimy autentifikácie do Google Cloud Vision:
- `service_account`
- `api_key`

V bezpečnom predvolenom stave sú Google credentials zámerne prázdne. Bez ich doplnenia sa reálne OCR nepošle.

### `OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY=3`
Jeden používateľ môže v režime `google` spraviť najviac 3 cloud OCR requesty denne.

### `OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY=12`
Celý projekt môže v režime `google` spraviť najviac 12 cloud OCR requestov denne.

## Súbor `backend/src/routes/notes.js`

Tu sa pred OCR requestom kontrolujú denné limity.
Keď sa limit prekročí, backend vráti chybu a OCR request sa neposiela.

## Súbor `backend/src/db.js`

Tu sa vytvára tabuľka:
- `dbo.OcrUsageEvents`

Do nej sa ukladá každý reálny cloud OCR request.
Vďaka tomu sa limity počítajú korektne aj po reštarte kontajnerov.

## Súbor `backend/src/index.js`

Health endpoint:
- `/api/health`

Na tomto endpointe si vieš skontrolovať:
- aký OCR provider je aktívny
- aké sú momentálne nakonfigurované limity

## Súbor `docker-compose.yml`

Sem som doplnil OCR environment variables, aby boli rovnaké v Dockeri ako v `.env`.
To znamená, že Docker Desktop pobeží presne s tými guardrails, ktoré vidíš v projekte.

## Najbezpečnejšie pravidlo

Kým neprepneš:
- `OCR_PROVIDER=google`

a zároveň nedoplníš:
- `GOOGLE_CLOUD_AUTH_MODE`
- `GOOGLE_CLOUD_VISION_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
- `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID`

tak projekt síce funguje, ale **nemôže robiť spoplatnené OCR volania**.
