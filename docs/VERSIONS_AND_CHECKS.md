# Verzie a kde ich kontrolovať

## Node.js
- `backend/Dockerfile` → `node:24-alpine`
- `frontend/Dockerfile` → `node:24-bookworm-slim`
- `backend/package.json` → `engines.node` = `>=24.0.0`

## Frontend knižnice
V `frontend/package.json`:
- `react`: `19.2.0`
- `react-dom`: `19.2.0`
- `vite`: `8.0.10`
- `@vitejs/plugin-react`: `6.0.0`

## Backend knižnice
V `backend/package.json`:
- `bcryptjs`: `3.0.3`
- `cors`: `2.8.5`
- `dotenv`: `16.6.1`
- `express`: `5.2.1`
- `helmet`: `8.1.0`
- `jsonwebtoken`: `9.0.3`
- `morgan`: `1.10.1`
- `mssql`: `12.2.1`
- `multer`: `2.1.1`
- `@google-cloud/vision`: `5.3.5`
- `@azure/storage-blob`: `12.31.0`


## Docker obrazy
- `docker-compose.yml` → `mcr.microsoft.com/mssql/server:2022-latest`
- `frontend/Dockerfile` → runtime `nginx:1.28-alpine`

## Nastavenia, ktoré kontrolujú náklady
V `.env.example` a v `docker-compose.yml`:
- `OCR_PROVIDER`
- `GOOGLE_CLOUD_AUTH_MODE`
- `GOOGLE_CLOUD_VISION_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`
- `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID`
- `OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY`
- `OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY`
- `STORAGE_PROVIDER`

V backend kóde:
- `backend/src/config.js`
- `backend/src/routes/notes.js`
- `backend/src/db.js`
