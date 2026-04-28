# Deployment plán: Azure + Google Cloud

## Cloud rozdelenie
### Azure
- frontend: Azure Blob Storage Static Website
- backend: Azure App Service
- databáza: Azure SQL Database

### Google Cloud
- OCR: Cloud Vision API

## Backend App Settings
V Azure App Service nastav tieto hodnoty v časti **Settings → Environment variables → Application settings**.

### Runtime

- `NODE_ENV=production`
- `PORT=3000`
- `ALLOWED_ORIGIN=https://<storage-account>.z1.web.core.windows.net`
- `JWT_SECRET=<dlhy-nahodny-secret>`
- `JWT_EXPIRES_IN=7d`

`ALLOWED_ORIGIN` musí byť presná URL frontendu bez trailing slash.  
`JWT_SECRET` musí byť dlhý náhodný reťazec a nesmie byť uložený v Gite.

### OCR / Google Cloud Vision

- `OCR_PROVIDER=google`
- `OCR_MOCK_TEXT=Ukážkový OCR výstup v mock režime. Tento režim negeneruje cloudové náklady.`
- `OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY=3`
- `OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY=12`
- `GOOGLE_CLOUD_AUTH_MODE=service_account`
- `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=<google-cloud-project-id>`
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64-zakodovany-service-account-json>`
- `GOOGLE_SERVICE_ACCOUNT_JSON=`
- `GOOGLE_CLOUD_VISION_API_KEY=`

Používame service account autentifikáciu, preto `GOOGLE_CLOUD_VISION_API_KEY` ostáva prázdny.  
`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` obsahuje celý Google service account JSON zakódovaný do Base64.

### Azure Blob Storage pre zdrojové obrázky

- `STORAGE_PROVIDER=azure_blob`
- `STORE_SOURCE_IMAGES=true`
- `AZURE_BLOB_CONNECTION_STRING=<azure-storage-connection-string>`
- `AZURE_BLOB_CONTAINER_NAME=note-images`
- `AZURE_BLOB_CREATE_CONTAINER_IF_MISSING=true`

Tieto hodnoty zapínajú ukladanie pôvodných nahraných obrázkov do Azure Blob Storage.  
Ak nechceme ukladať zdrojové obrázky, je možné použiť `STORAGE_PROVIDER=local`, ale v cloudovej produkčnej konfigurácii odporúčame `azure_blob`.

### Azure SQL Database

- `DB_SERVER=<azure-sql-server-name>.database.windows.net`
- `DB_PORT=1433`
- `DB_USER=<azure-sql-admin-user>`
- `DB_PASSWORD=<azure-sql-password>`
- `DB_NAME=NoteworthyDb`
- `DB_ENCRYPT=true`
- `DB_TRUST_SERVER_CERTIFICATE=false`


## Free-safe odporúčanie 

### Azure
- frontend hostuj cez Azure Blob Storage Static Website
- backend drž na čo najnižšom free / student-compatible pláne
- databázu vytvor ako Azure SQL Database v free offer / student-compatible limite
- v Azure zapni budget alerts a nechaj spending limit zapnutý, ak je na tvojej študentskej subskripcii dostupný

### Google Cloud
- Vision API použi len vtedy, keď chceš ukázať reálne OCR
- predvolene nechaj projekt v `OCR_PROVIDER=mock`
- po nastavení billing účtu hneď vytvor budget alerts
- po testovaní môžeš billing na projekte odpojiť, ale pozor: to zastaví billable služby

## Presný moment, kedy začneš robiť reálne OCR volania

Až keď je splnené:
1. `OCR_PROVIDER=google`
2. a zároveň sú doplnené platné Google credentials (service account alebo API key)

Dovtedy je appka cloud-cost-safe z pohľadu OCR.
