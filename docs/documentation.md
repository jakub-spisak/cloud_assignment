# Noteworthy — Dokumentácia projektu
**Cloudové technológie — semestrálne zadanie**

## Základné informácie

| Položka | Hodnota |
|---|---|
| Tím | 3-členný tím |
| Členovia tímu | Ľubomír Švec, Daniel Zemančík, Jakub Spišák |
| Repozitár | `https://github.com/jakub-spisak/cloud_assignment` |
| Produkčná URL frontend | `https://noteworthyfespisak1848.z1.web.core.windows.net` |
| Produkčná URL backend | `https://noteworthy-api-spisak-cmf4hwfchcbybgat.swedencentral-01.azurewebsites.net/` |

## 1. Rozbor a analýza úlohy

### 1.1 Riešená problematika
Študenti, profesionáli aj bežní používatelia si bežne fotia tabule počas prednášok, stránky skrípt, ručne písané poznámky alebo whiteboard schémy z meetingov. Tieto fotky následne končia v pamäti telefónu alebo v cloudovom úložisku ako neorganizované obrázky bez možnosti vyhľadávania v ich obsahu. Ak chce používateľ neskôr vyhľadať konkrétny pojem, musí každú fotku otvoriť a vizuálne ju prejsť.

### 1.2 Cieľ aplikácie Noteworthy
Aplikácia rieši premenu obrázkových poznámok na digitálne, indexovateľné a prehľadávateľné textové záznamy. Používateľ si vytvorí účet, nahrá fotku a aplikácia ju automaticky:

1. Pošle obrázok do služby OCR (Optical Character Recognition), ktorá z neho extrahuje textovú reprezentáciu.
2. Vygeneruje krátke summary kľúčových viet.
3. Uloží zápis do databázy pod jeho účet.

Používateľ má následne k dispozícii zoznam svojich poznámok, detail s celým extrahovaným textom, summary a metadáta. Dáta sú izolované per účet — žiaden používateľ nevidí poznámky iného.

## 2. Architektúra riešenia

### 2.1 Diagram nasadenia
Architektúra aplikácie pozostáva z piatich hlavných komponentov, ktoré spolu komunikujú nasledovne:

- **Klientská vrstva** — Browser (prehliadač používateľa) sťahuje statický React bundle z Azure Blob Storage Static Website a následne komunikuje cez HTTPS s REST API.
- **Aplikačná vrstva** — Azure App Service (Linux, Node 22, Basic B1 plan) hostuje Express REST API. Aplikácia validuje JWT tokeny pri každom chránenom endpointe, hashuje heslá pomocou bcrypt a uplatňuje strict CORS politiku iba na URL frontendu.
- **Dátová vrstva** — Azure SQL Database (serverless, Free offer) ukladá tri tabuľky: Users, Notes, OcrUsageEvents. Backend sa pripája cez mssql driver s povinným šifrovaním.
- **Externá AI vrstva** — Google Cloud Vision API poskytuje OCR rozpoznávanie textu z obrázkov v `DOCUMENT_TEXT_DETECTION` móde. Backend autentifikuje volania pomocou service account credentials uložených v Application Settings ako Base64-zakódovaný JSON.
- **Monitorovacia vrstva** — Azure Application Insights automaticky zachytáva requesty, exceptions, performance metriky a custom logy z App Service.

**Komunikácia medzi vrstvami:**

- Browser → Blob Storage: statický bundle (HTML/JS/CSS) cez HTTPS GET requesty
- Browser → App Service: REST API volania s `Authorization: Bearer <JWT>` header
- App Service → SQL Database: TLS-šifrované TDS pripojenie na port 1433 (firewall povoľuje „Azure services“)
- App Service → Google Vision: HTTPS volania s service account JWT autentifikáciou
- App Service → Application Insights: automatický telemetry stream

```text
Browser (React SPA)
 │
 ├── stiahnutie bundla ─> Azure Blob Storage Static Website (Sweden Central)
 │
 └── REST API + JWT ─> Azure App Service (Sweden Central)
                         │
                         ├── mssql ──> Azure SQL Database
                         ├── HTTPS + service account ─> Google Cloud Vision API
                         └── telemetry ──> Azure Application Insights
```

### 2.2 Použité cloud služby — prehľad

| Komponent | Provider | Služba | Tier | Región |
|---|---|---|---|---|
| Frontend hosting | Microsoft Azure | Blob Storage Static Website | Standard LRS | Sweden Central |
| Backend hosting | Microsoft Azure | App Service (Linux) | Basic B1 | Sweden Central |
| Databáza | Microsoft Azure | SQL Database (serverless) | Free offer | Germany West Central |
| Monitoring | Microsoft Azure | Application Insights | Pay-as-you-go (do 5 GB free) | Sweden Central |
| OCR | Google Cloud | Cloud Vision API | Free tier (1000 req/mes) | global |

## 3. Odôvodnenie zvolených technológií

### 3.1 Frontend: React 18 + Vite
React patrí medzi najpoužívanejšie technológie na tvorbu Single Page Applications. Component-based architektúra umožňuje rozdeliť UI na samostatné jednotky (`AuthPanel`, `UploadForm`, `NotesList`, `NoteDetail`), ktoré sa dajú nezávisle vyvíjať a testovať.

Vite ako build nástroj sme zvolili kvôli rýchlosti — produkčný build trvá pod 10 sekúnd a vývojový dev server má hot module replacement. Vite navyše prirodzene podporuje environment variables s prefixom `VITE_`, čo umožňuje ľahko meniť backend URL pri builde pre rôzne prostredia (lokál vs Azure).

Pre stav používame `useState` a `useEffect` hooks — projekt nemá takú zložitosť, aby vyžadoval external state management ako Redux.

### 3.2 Backend: Node.js + Express
Node.js s Express je osvedčená kombinácia pre REST API. Má veľkú komunitu, množstvo balíkov a JavaScript runtime ladí so stejným jazykom v frontende — čo zjednodušuje onboarding.

Backend používa tieto kľúčové knižnice:

- `express` — HTTP server a routing
- `mssql` — driver pre Microsoft SQL Server / Azure SQL
- `@google-cloud/vision` — oficiálny SDK pre Google Vision API (service account auth)
- `@azure/storage-blob` — SDK pre prácu s Azure Blob Storage
- `bcryptjs` — hashovanie hesiel s adaptívnou náročnosťou (cost factor 12)
- `jsonwebtoken` — vystavovanie a overovanie JWT tokenov
- `multer` — middleware na prácu s upload formulármi (memory storage)
- `helmet` — bezpečnostné HTTP hlavičky
- `cors` — CORS politika (strict allowed origin)

### 3.3 Frontend hosting: Azure Blob Storage Static Website
Pôvodný plán bol využiť Azure Static Web Apps, no kvôli regionálnym obmedzeniam Azure for Students subskripcie nebola služba v žiadnom z povolených regiónov dostupná.

Blob Storage Static Website poskytuje pre potreby tohto projektu prakticky ekvivalentné riešenie pre statický hosting:

- Špeciálny container `$web` slúži ako root webu
- Azure Edge automaticky CDN-cache-uje obsah
- HTTPS endpoint je dostupný okamžite po vytvorení
- Index a 404 dokumenty sú konfigurovateľné

### 3.4 Backend hosting: Azure App Service (Linux, Node 22, B1)
App Service je PaaS riešenie pre web aplikácie — Microsoft sa stará o OS patche, runtime, scaling. My iba nahráme kód.

**Konkrétne nastavenia:**

- Linux namiesto Windows — natívnejšie pre Node.js, lacnejšie tier-y
- Node 22 LTS — aktuálny LTS s podporou do 2027 (Node 20 LTS prešlo do maintenance v apríli 2026)
- Basic B1 (~13 USD/mesiac) namiesto Free F1 — F1 má limit 60 minút CPU denne a podlieha `QuotaExceeded` pri viacerých neúspešných deployoch. B1 je always-on a bez tohto limitu, čo umožňuje stabilné demo

Application Insights bol pridaný pri vytváraní App Service. Zachytáva requesty, metriky, exceptions a performance dáta; počas vývoja slúžil najmä na kontrolu requestov a chybových stavov backendu.

### 3.5 Databáza: Azure SQL Database (serverless, free offer)
Pôvodne bolo zvažované MongoDB Atlas alebo PostgreSQL na Azure, no pre tento projekt sme zvolili Azure SQL Database z týchto dôvodov:

- Free offer pre Azure subskripcie — 100 000 vCore-sekúnd a 32 GB úložiska mesačne navždy zadarmo
- Serverless tier — DB sa po hodine nečinnosti auto-pauzne, čo šetrí kvótu
- Auto-pause until next month behavior — ak by sa kvóta vyčerpala, DB sa pauzne, namiesto aby účtovala
- Plne kompatibilné s SQL Serverom — vývoj v Docker MSSQL kontajneri, deploy na Azure SQL bez zmien v aplikačnej vrstve

Kompromis: prvý request po pauze môže trvať 60–90 sekúnd kvôli „wake up“ procesu.

Schéma obsahuje tri tabuľky:

- `Users` — registrované účty (`Id`, `Name`, `Email UNIQUE`, `PasswordHash bcrypt`, `CreatedAt`)
- `Notes` — poznámky viazané na používateľa cez foreign key, s `ON DELETE CASCADE`
- `OcrUsageEvents` — audit log OCR volaní pre denné limity nákladov

### 3.6 OCR: Google Cloud Vision API
Pre AI/cloud službu mimo Azure sme mali možnosti ako AWS Textract, Google Cloud Vision.

Google Vision sme zvolili preto, lebo:

- Free tier: 1000 requestov mesačne navždy zdarma — pre semestrálny projekt absolútne dostatočné
- V praxi dosahuje veľmi dobré výsledky aj pri rukou písanom texte v stredoeurópskych jazykoch (slovenčina, čeština, angličtina), čo bolo pre náš projekt dôležité
- Service account autentifikácia je bezpečnejšia ako API key (najmenšie privilégiá, dá sa rotovať bez zmeny kódu)
- `DOCUMENT_TEXT_DETECTION` mode je optimalizovaný pre stránky textu (skriptá, tabule), nie iba krátky text

Backend volá Vision cez oficiálny `@google-cloud/vision` SDK so service account credentials prenesenými cez Base64-zakódovanú environment premennú v Azure App Service.

### 3.7 Bezpečnosť
Aplikácia implementuje viacero vrstiev bezpečnosti.

**Autentifikácia a autorizácia:**

- bcrypt hash hesiel s cost factor 12 (cca 250 ms hash time)
- JWT tokeny s 7-dňovou expiráciou, podpísané HMAC-SHA256
- Server-side overovanie tokenu pri každom chránenom endpointe (`requireAuth` middleware)

**Izolácia dát:**

- Každý SQL query je viazaný na `userId` z JWT — používateľ nemôže pristupovať k cudzím poznámkam ani prostredníctvom upravenej URL

**Network bezpečnosť:**

- HTTPS enforcing na všetkých koncových bodoch
- CORS strict origin (iba URL frontend Blob Storage)
- Helmet middleware pre security HTTP headers (`X-Content-Type-Options`, `X-Frame-Options`, atď.)

**Secrets management:**

- Žiadne secrets v Git repozitári (`.gitignore` vylučuje `.env`, `*service-account*.json`)
- `JWT_SECRET`, DB heslo a Google credentials sú iba v Azure App Service Application Settings (šifrované at rest)
- Frontend bundle obsahuje iba `VITE_API_BASE_URL` (URL backendu, ktorá nie je tajomstvo)

**Cost protection:**

- Hard limity na cloud OCR volania: 3 requesty per user per deň, 12 per projekt per deň
- Limity sú vynucované DB countom v `OcrUsageEvents` tabuľke pred volaním Vision API
- Free-safe default: `OCR_PROVIDER=mock` v `.env.example` — bez vedomého zapnutia nedochádza k cloud volaniam

## 4. Príspevok jednotlivých členov tímu

### Ľubomír Švec — Frontend
**Hlavné oblasti:**

- Návrh a implementácia React komponentov
- Štýlovanie (CSS, dark glassmorphism dizajn)
- Integrácia frontendu na backend REST API
- Konfigurácia Google Cloud projektu a service accountu pre OCR

**Konkrétne súbory a moduly:**

- `frontend/src/App.jsx` — root komponent, state management, routing logika
- `frontend/src/components/AuthPanel.jsx` — formuláre prihlásenia a registrácie
- `frontend/src/components/UploadForm.jsx` — upload obrázka pre OCR
- `frontend/src/components/NotesList.jsx` — zoznam poznámok
- `frontend/src/components/NoteDetail.jsx` — detail poznámky s OCR výstupom
- `frontend/src/api.js` — fetch wrapper pre backend volania
- `frontend/src/auth.js` — localStorage správa JWT tokenu
- `frontend/src/styles.css` — globálne štýly
- `frontend/vite.config.js` — Vite build konfigurácia
- `.env / .env.example` — testovanie a overenie konfigurácie Google Cloud Vision OCR cez service account
- Google Cloud Console — konfigurácia projektu, zapnutie Cloud Vision API a vytvorenie service account credentials

### Daniel Zemančík — Backend a aplikačná logika
**Hlavné oblasti:**

- Implementácia Express REST API
- JWT autentifikácia a autorizácia
- Integrácia s Google Cloud Vision OCR
- Implementácia text summarizéra a denných limitov nákladov
- Schéma databázy (DDL pre `Users`, `Notes`, `OcrUsageEvents`)
- Lokálna Docker Compose orchestrácia (Frontend, Backend, MSSQL)

**Konkrétne súbory a moduly:**

- `backend/src/index.js` — entry point, Express app, middleware, error handler
- `backend/src/config.js` — načítavanie a validácia env premenných
- `backend/src/routes/auth.js` — `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- `backend/src/routes/notes.js` — `/api/notes`, `/api/notes/process`, `/api/notes/:id`
- `backend/src/middleware/auth.js` — `requireAuth` JWT validačný middleware
- `backend/src/db.js` — SQL driver, schema migration, retry connection logic
- `backend/src/services/ocrService.js` — Google Vision client + mock režim
- `backend/src/services/storageService.js` — Azure Blob Storage abstrakcia
- `backend/src/services/summarizer.js` — TF-frequency text summarizer
- `docker-compose.yml` — orchestrácia troch lokálnych kontajnerov
- `backend/Dockerfile` — multi-stage build pre Node.js
- `frontend/Dockerfile` — Vite build + nginx serve
- `.env.example` — šablóna pre lokálnu konfiguráciu
- `prepare-app.sh`, `start-app.sh`, `end-app.sh` (a PowerShell verzie) — automatizačné skripty
- `check-free-safe.sh` — diagnostický skript stavu OCR limitov

### Jakub Spišák — Cloud, DevOps a dokumentácia
**Hlavné oblasti:**

- Návrh cloud architektúry a výber služieb
- Nasadenie na Azure (App Service, SQL Database, Blob Storage)
- Dokumentácia projektu (`README.md` a `DOKUMENTACIA.docx`)
- Bezpečnostné poistky proti nákladom (denné OCR limity, free-safe defaults)

**Konkrétne súbory a moduly:**

- Dokumentačné súbory v `docs/` priečinku
- Nasadenie všetkých Azure resources cez Azure Portal a Azure CLI

## 5. Dokumentácia k používaniu aplikácie

### 5.1 Setup pre lokálny vývoj (Docker Desktop)
**Predpoklady:**

- Docker Desktop nainštalovaný a bežiaci
- Voľný port 8080 (frontend), 3000 (backend), 1433 (MSSQL)

**Kroky:**

1. **Klonovanie repozitára**
   - `git clone https://github.com/jakub-spisak/cloud_assignment.git`
   - `cd cloud_assignment`

2. **Vytvorenie `.env` súboru**
   - Linux / macOS / Git Bash:
     - `./prepare-app.sh`
   - Windows PowerShell:
   - Je potrebné si nastaviť ručne.

3. **Spustenie aplikácie**
   - `./start-app.sh`  *(Linux / macOS / Git Bash)*
   - `./start-app.ps1`  *(Windows PowerShell)*
   - Alebo priamo:
     - `docker compose up -d --build`

4. **Otvorenie**
   - Frontend: `http://localhost:8080`
   - Backend health: `http://localhost:3000/api/health`

5. **Zastavenie**
   - `./end-app.sh` alebo `docker compose down`

### 5.2 Používanie aplikácie
1. Otvor frontend URL.
2. Zaregistruj si účet (meno, email, heslo min. 8 znakov).
3. Prihlás sa.
4. Klikni „Nahraj novú poznámku“ → vyber obrázok s textom (tabuľa, skripty, poznámky).
5. Voliteľne vyplň názov a predmet.
6. Klikni „Spracovať a uložiť“.
7. Po pár sekundách (5–90 s podľa toho, či bola DB pauznutá) sa objaví detail poznámky s OCR textom a summary.
8. V zozname vľavo vidíš všetky svoje poznámky; ich detail otvoríš kliknutím.

### 5.3 Vstupy a výstupy
**Vstup:**

- Obrázok (JPEG, PNG, WebP, atď.) max 10 MB
- Najlepšie tlačený alebo dobre čitateľný rukopisný text v slovenčine, češtine alebo angličtine
- Voliteľne: názov poznámky, predmet/tag

**Výstup:**

- Plný extrahovaný text z obrázka (zobrazený v detaili poznámky)
- Automaticky vygenerované summary (3 najreprezentatívnejšie vety podľa TF-frequency skóringu)
- Metadáta: dátum vytvorenia, názov originálneho súboru, predmet
- Voliteľne: URL na uložený zdrojový obrázok v Azure Blob Storage (ak je `STORAGE_PROVIDER=azure_blob`)

**Obmedzenia aktuálnej verzie:**

- Aktuálna verzia aplikácie spracúva obrázky; podpora PDF dokumentov nie je súčasťou tejto verzie.
- Kvalita OCR výsledku závisí od ostrosti, kontrastu a čitateľnosti nahraného obrázka.
- Summary je tvorené jednoduchým interným algoritmom na základe frekvencie slov; nejde o generovanie cez veľký jazykový model.

### 5.4 Konfiguračné prepínače
V `.env` súbore (lokálne) alebo Azure App Service Application Settings (cloud):

| Premenná | Možnosti | Default | Význam |
|---|---|---|---|
| `OCR_PROVIDER` | `mock`, `google` | `mock` | Použiť mock OCR (nulové náklady) alebo reálny Google Vision |
| `GOOGLE_CLOUD_AUTH_MODE` | `service_account`, `api_key` | `service_account` | Spôsob autentifikácie do Google Cloud |
| `STORAGE_PROVIDER` | `local`, `azure_blob` | `local` | Ukladanie zdrojových obrázkov |
| `OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY` | celé číslo | `3` | Hard limit OCR volaní per user per deň |
| `OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY` | celé číslo | `12` | Hard limit OCR volaní pre celý projekt per deň |

### 5.5 Cloud nasadenie — prehľad krokov
Detailný postup je v repozitári v súbore `DEPLOYMENT_AZURE_GCP.md`. Súhrn:

1. **Google Cloud** — vytvor projekt, zapni Vision API, vytvor service account s rolou Cloud Vision API User, stiahni JSON kľúč a zakóduj ho do Base64.
2. **Azure SQL Database** — vytvor s „Free offer“ nastavením, „Auto-pause until next month“ behavior a povoľ „Allow Azure services and resources to access this server“.
3. **Azure App Service (B1, Linux, Node 22)** — vytvor, nastav Application Settings podľa `.env.example` (s upravenými hodnotami pre Azure), zapni `SCM_DO_BUILD_DURING_DEPLOYMENT=true` a deployni cez `az webapp deploy`.
4. **Azure Storage Account + Static Website** — vytvor storage account, zapni static website feature (`az storage blob service-properties update --static-website`), urob build frontendu cez `npm run build` s `VITE_API_BASE_URL` odkazujúcim na URL backendu a uploadni `dist/` do `$web` containeru.
5. **CORS prepojenie** — v App Service nastav `ALLOWED_ORIGIN` na URL frontendu (bez trailing slash).

## 6. Zhrnutie
Projekt Noteworthy spĺňa všetky podmienky zadania:

- Webová aplikácia s frontendom (React) a backendom (Node.js)
- Hosting na PaaS úrovni (žiadne IaaS VM)
- Štyri cloud služby celkovo
- AI prvok cez Google Cloud Vision OCR
- Cloud služba u iného providera než hostuje aplikácia (Google vs Microsoft)
- Tímová práca s rozdelením úloh do troch oblastí (frontend / backend / cloud-devops-doc)
- Dokumentácia, README, deployment guide
- Bezpečnostné poistky proti nákladom (denné limity, free-safe defaults)

Aplikácia je end-to-end funkčná: používateľ sa zaregistruje, prihlási, nahrá obrázok poznámky, dostane OCR výstup a má svoju digitálnu knižnicu prehľadávateľných záznamov.
