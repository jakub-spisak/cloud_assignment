# Deployment plán: Azure + Google Cloud

## Cloud rozdelenie
### Azure
- frontend: Azure Blob Storage Static Website
- backend: Azure App Service
- databáza: Azure SQL Database

### Google Cloud
- OCR: Cloud Vision API

## Backend App Settings
- `PORT=3000`
- `NODE_ENV=production`
- `ALLOWED_ORIGIN=<tvoja Blob Static Website URL>`
- `GOOGLE_CLOUD_AUTH_MODE=service_account`
- `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=<google-project-id>`
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64 service account json>`
- `JWT_SECRET=<silný secret>`
- `JWT_EXPIRES_IN=7d`
- `DB_SERVER=<azure-sql-server>.database.windows.net`
- `DB_PORT=1433`
- `DB_USER=<db-user>`
- `DB_PASSWORD=<db-password>`
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
