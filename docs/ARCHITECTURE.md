# Architektúra projektu Noteworthy

## Cieľ aplikácie
Aplikácia umožňuje používateľovi odfotiť tabuľu alebo skriptá, získať z obrázka text pomocou OCR, uložiť ho do databázy a zobraziť stručný prehľad poznámky.

## Komponenty
### 1. Frontend
- Technológia: React + Vite
- Lokálne: NGINX kontajner
- Cloud: Azure Blob Storage Static Website
- Funkcia: registrácia, prihlásenie, nahratie obrázka, zoznam poznámok, detail poznámky

### 2. Backend
- Technológia: Node.js + Express
- Lokálne: Node.js kontajner
- Cloud: Azure App Service
- Funkcia: autentifikácia, JWT, volanie OCR služby, práca s databázou, REST API

### 3. Databáza
- Lokálne: SQL Server 2022 kontajner
- Cloud: Azure SQL Database
- Funkcia: ukladanie používateľov a ich poznámok

### 4. Externá cloud služba
- Google Cloud Vision OCR
- Provider odlišný od Azure
- Funkcia: extrakcia textu z obrázkov


## Obmedzenia aktuálnej verzie
- vstupom sú iba obrázky (JPEG, PNG, WebP a podobné formáty)
- PDF dokumenty aktuálne nie sú podporované
- summary je jednoduchý interný algoritmus, nie veľký jazykový model
