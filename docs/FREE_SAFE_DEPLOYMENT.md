# Free-safe deployment a ochrana pred nákladmi

Tento dokument je zámerne písaný tak, aby si vedel, **čo je v projekte technicky nastavené** a **čo ešte musíš nastaviť v Azure / Google Cloud účte**, ak chceš minimalizovať riziko platieb.

## 1. Čo je nastavené priamo v kóde

### Predvolený OCR režim
Súbor: `.env.example`

- `OCR_PROVIDER=mock`

Význam:
- aplikácia sa po prvom spustení **nepripája na Google Cloud Vision**
- upload stále funguje
- vytvorí sa ukážkový OCR text
- vieš demonštrovať appku bez cloud OCR nákladov

### Denné limity pre reálne OCR
Súbory:
- `.env.example`
- `backend/src/config.js`
- `backend/src/routes/notes.js`
- `backend/src/db.js`

Premenné:
- `OCR_MAX_CLOUD_REQUESTS_PER_USER_PER_DAY=3`
- `OCR_MAX_CLOUD_REQUESTS_PROJECT_PER_DAY=12`

Význam:
- ak prepneš `OCR_PROVIDER=google`, backend začne počítať cloud OCR volania do databázy
- po prekročení limitu backend ďalšie OCR requesty zámerne zastaví chybou `429`

### Health endpoint
Súbor: `backend/src/index.js`

Endpoint:
- `GET /api/health`

Zobrazí:
- OCR provider (`mock` alebo `google`)
- denný limit na používateľa
- denný limit na celý projekt

To je najjednoduchší spôsob, ako si overiť, že si projekt omylom neprepol do ostrejšieho režimu.

## 2. Čo to znamená prakticky

### Režim `mock`
- nulové volania na Google Cloud Vision
- nulové Google OCR náklady
- vhodné na vývoj, Docker demo a väčšinu prezentácie

### Režim `google`
- používa sa reálne OCR cez Google Cloud Vision
- potrebuješ platné Google credentials (`service_account` alebo `api_key`)
- spotreba ide do GCP free tier / trial / platenia podľa stavu tvojho účtu

## 3. Kde sa používajú študentské kredity

### Azure
Študentské kredity alebo free benefit sa používajú pri:
- Azure App Service
- Azure SQL Database
- prípadne ďalších Azure resource skupinách a sieťových resource

### Google Cloud
Tam sa nepoužívajú Azure študentské kredity.
Používaš:
- Google Cloud free tier
- alebo Google Cloud free trial kredit

## 4. Nastavenie, ktoré je najbezpečnejšie

Pre skoro nulové riziko:
1. lokálne používaj Docker Desktop
2. nechaj `OCR_PROVIDER=mock`
3. cloud deploy sprav len tesne pred obhajobou
4. v GCP zapni OCR len na krátky čas pre pár testov
5. po demo teste môžeš API key vymazať alebo billing odpojiť

## 5. Čo nevie garantovať samotný kód

Samotný projekt **nevie garantovať absolútnu nulu platieb**, ak:
- v Google Cloud vedome aktivuješ billing a prekročíš free limity
- v Azure odstrániš spending limit alebo vytvoríš platené resource
- zvolíš vyššie platené plány namiesto free / included limitov

Projekt však robí maximum pre bezpečný default:
- mock OCR je default
- Google API key je prázdny
- cloud OCR má denný hard cap
- nič sa nedeployuje automaticky
