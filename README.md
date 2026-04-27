# Noteworthy

> Smart OCR poznámky — odfoť tabuľu, skriptá alebo ručné poznámky a získaj prehľadávateľný digitálny záznam.

Semestrálny projekt z predmetu **Cloudové technológie**. Aplikácia premieňa fotky textových poznámok na štruktúrované digitálne záznamy s OCR výstupom a automatickým summary, viazané na používateľský účet.

## Architektúra

```
React (Vite)        →   Azure Blob Storage Static Website
Node.js + Express   →   Azure App Service (Linux, Node 24)
SQL Server          →   Azure SQL Database (serverless)
OCR                 →   Google Cloud Vision API
Monitoring          →   Azure Application Insights
```

Hosting na **Microsoft Azure**, OCR funkcionalitu zabezpečuje **Google Cloud Vision API**, čím je splnená podmienka cloud služby u iného poskytovateľa.

## Funkcionalita

- Registrácia a prihlásenie používateľa s JWT autentifikáciou
- Upload obrázka (tabuľa, skriptá, ručne písané poznámky)
- OCR extrakcia textu cez Google Cloud Vision (DOCUMENT_TEXT_DETECTION mode)
- Automatické summary — výber 3 najreprezentatívnejších viet (TF-frequency)
- Per-user izolácia dát — používateľ vidí iba svoje poznámky
- Voliteľné ukladanie zdrojových obrázkov do Azure Blob Storage
- Cost protection — denné limity OCR volaní per user a per projekt

## Technológie

**Frontend:** React 19, Vite 8, vanilla CSS

**Backend:** Node.js 24, Express 5, mssql, @google-cloud/vision, @azure/storage-blob, bcryptjs, jsonwebtoken, multer, helmet

**Databáza:** Microsoft SQL Server 2022 (lokálne) / Azure SQL Database (cloud)

**Orchestrácia:** Docker Compose (lokálny vývoj)

## Lokálne spustenie

### Predpoklady

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Voľné porty 8080, 3000, 1433

### Krok 1 — vytvor `.env`

**Linux / macOS / Git Bash:**
```bash
./prepare-app.sh
```

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
```

`prepare-app.sh` automaticky vygeneruje silný `JWT_SECRET` a heslo pre databázu. Predvolene je aplikácia v **free-safe** režime — žiadne cloud OCR volania, žiadny Azure Blob upload (`OCR_PROVIDER=mock`, `STORAGE_PROVIDER=local`).

### Krok 2 — spusti

```bash
./start-app.sh         # Linux / macOS / Git Bash
.\start-app.ps1         # Windows PowerShell
```

Alebo priamo:
```bash
docker compose up -d --build
```

### Krok 3 — otvor

- Frontend: http://localhost:8080
- Backend health endpoint: http://localhost:3000/api/health

### Krok 4 — zastavenie

```bash
./end-app.sh           # alebo docker compose down
```

Pre úplné vyčistenie vrátane databázových dát:
```bash
docker compose down -v
```

## Štruktúra repozitára

```
noteworthy/
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/        # AuthPanel, UploadForm, NotesList, NoteDetail
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── auth.js
│   ├── Dockerfile
│   └── package.json
│
├── backend/                   # Express REST API
│   ├── src/
│   │   ├── routes/            # auth.js, notes.js
│   │   ├── services/          # ocrService.js, storageService.js, summarizer.js
│   │   ├── middleware/        # auth.js (JWT validation)
│   │   ├── config.js
│   │   ├── db.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
│
├── docs/                      # Dokumentácia
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT_AZURE_GCP.md
│   ├── FREE_SAFE_DEPLOYMENT.md
│   ├── COST_GUARDRAILS_EXPLAINED.md
│   ├── BLOB_AND_SERVICE_ACCOUNT_UPGRADE.md
│   ├── VERSIONS_AND_CHECKS.md
│   └── documentation.md
│
├── docker-compose.yml
├── .env.example
├── prepare-app.sh / .ps1
├── start-app.sh / .ps1
└── end-app.sh / .ps1
```

## Konfigurácia

Všetky nastavenia sú v `.env` (lokálne) alebo Azure App Service Application Settings (cloud). Najdôležitejšie prepínače:

| Premenná | Možnosti | Default |
|---|---|---|
| `OCR_PROVIDER` | `mock`, `google` | `mock` |
| `GOOGLE_CLOUD_AUTH_MODE` | `service_account`, `api_key` | `service_account` |
| `STORAGE_PROVIDER` | `local`, `azure_blob` | `local` |
| `OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY` | int | `3` |
| `OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY` | int | `12` |

Pre podrobné popisy ostatných premenných pozri `.env.example` a `docs/COST_GUARDRAILS_EXPLAINED.md`.

## REST API

Všetky chránené endpointy očakávajú `Authorization: Bearer <jwt_token>` header.

### Verejné

- `GET /api/health` — stav backendu, OCR providera a storage konfigurácie
- `POST /api/auth/register` — registrácia (`{ name, email, password }`)
- `POST /api/auth/login` — prihlásenie (`{ email, password }`)

### Chránené

- `GET /api/auth/me` — vlastný profil
- `GET /api/notes` — zoznam vlastných poznámok
- `GET /api/notes/:id` — detail poznámky
- `POST /api/notes/process` — upload obrázka (multipart `file`, voliteľne `title`, `subject`)
- `DELETE /api/notes/:id` — zmazanie poznámky vrátane voliteľného blobu

## Cloud nasadenie

Detailný postup nasadenia na Azure + Google Cloud je v `docs/DEPLOYMENT_AZURE_GCP.md`. Súhrn:

1. **Google Cloud projekt** — zapnutie Cloud Vision API, vytvorenie service accountu, JSON kľúč → Base64
2. **Azure SQL Database** — serverless Free offer, povolený access pre Azure services
3. **Azure App Service** — Linux, Node 24 LTS, Basic B1, Application Settings podľa `.env.example`, deploy cez `az webapp deploy`
4. **Azure Blob Storage Static Website** — `$web` container, upload `dist/` po `npm run build` s `VITE_API_BASE_URL` smerujúcou na backend
5. **CORS** — `ALLOWED_ORIGIN` v backende nastavený na URL frontendu

## Bezpečnosť

- Hashovanie hesiel cez bcrypt (cost factor 12)
- JWT tokeny s 7-dňovou expiráciou (HMAC-SHA256)
- Per-user dátová izolácia na úrovni SQL queries (`WHERE userId = ?`)
- HTTPS na všetkých koncových bodoch
- Helmet middleware (X-Content-Type-Options, X-Frame-Options, atď.)
- CORS strict origin
- Žiadne secrets v repozitári (`.gitignore` vylučuje `.env`, service account JSON kľúče)
- Rate limiting cloud OCR volaní cez denné limity v DB

## Free-safe režim

Aplikácia má vstavané ochrany proti nečakaným cloud nákladom:

1. Default `OCR_PROVIDER=mock` — bez vedomého prepnutia nedochádza k Google Vision volaniam
2. Default `STORAGE_PROVIDER=local` — bez vedomého prepnutia nedochádza k Azure Blob uploadom
3. Hard cap na denné OCR volania (per user a per projekt) — vynucované v DB pred volaním Vision API
4. Audit log v `OcrUsageEvents` — kontrolovateľný stav spotreby

Detaily v `docs/FREE_SAFE_DEPLOYMENT.md` a `docs/COST_GUARDRAILS_EXPLAINED.md`.

## Tím

| Člen | Oblasť |
|---|---|
| Ľubomír Švec | Frontend (React komponenty, štýly, integrácia s API) + konfigurácia Google Cloud projektu a service accountu pre OCR |
| Daniel Zemančík | Backend (Express API, JWT, integrácia s Vision, summarizer, schéma DB, lokálna Docker Compose orchestrácia) |
| Jakub Spišák | Cloud architektúra, Azure nasadenie, DB/DevOps, dokumentácia |

## Dokumentácia

Hlavný dokument pre odovzdanie a obhajobu: `docs/documentation.md`

Doplňujúca dokumentácia v priečinku `docs/`:

- `ARCHITECTURE.md` — diagram a popis komponentov
- `DEPLOYMENT_AZURE_GCP.md` — kompletný deployment guide
- `FREE_SAFE_DEPLOYMENT.md` — popis ochrán proti nákladom
- `COST_GUARDRAILS_EXPLAINED.md` — vysvetlenie limitov v kóde
- `BLOB_AND_SERVICE_ACCOUNT_UPGRADE.md` — upgrade na Blob Storage a service account auth
- `VERSIONS_AND_CHECKS.md` — verzie technológií a kde ich kontrolovať
- `PRESENTATION_NOTES.md` — scenár pre obhajobu
