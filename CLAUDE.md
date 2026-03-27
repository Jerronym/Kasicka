# Kasicka — osobni financni aplikace

## Popis projektu
Webova single-page aplikace pro spravu osobnich financi. Bez frameworku — ciste HTML/CSS/JS. Backend: Supabase (auth, cloud sync, sdileni).

## Architektura
- **kasicka.html** — jediny HTML soubor, vsechny sekce + modaly
- **css/style.css** — veskere styly, dark theme, responsivni (mobile cards vs desktop tabulky)
- **js/** — modularni JS soubory (bez bundleru, nacitane primo z HTML):
  - `config.js` — globalni promenne, konstanty, kurzy CNB, dirty-flag system pro render
  - `storage.js` — localStorage + JSON export/import, migrace dat (aktualne v5), buildExportPayload/applyImport
  - `auth.js` — Supabase autentizace, cloud sync, init logika
  - `transactions.js` — transakce (CRUD, prevody, stitky, filtry, recurring logika, renderTxns)
  - `accounts.js` — ucty (CRUD, zustatky, drag-and-drop razeni)
  - `investments.js` — investice (API Twelve Data, rucni aktualizace, skupiny, grafy)
  - `dashboard.js` — prehledovy dashboard s grafy (Chart.js)
  - `budget.js` — rozpocty (periodicke/celkove, sledovani dle kategorii nebo stitku)
  - `categories.js` — sprava kategorii (barvy, ikony)
  - `sharing.js` — sdileni skupin a transakci pres Supabase
  - `ui.js` — modaly, navigace, toast notifikace, tema, mobilni menu

## Datovy model
- `transactions[]` — {desc, tags[], amount, date, type(prijem/vydaj/prevod), cat, cur, accIdx, recurring?, recurringGenerated?}
- `accounts[]` — {name, initialBalance, currency, type, includeInTotal, startDate}
- `investments[]` — {ticker, apiSymbol, shares, type, invested, value, history[], groupIdx}
- `budgets[]` — {name, limit, color, budType, period, cats[], trackMode, trackTags[], flowMode}
- `categories[]` — {name, color, icon}
- `invGroups[]` — {name, color, note}

### Recurring transakce
Vlastnost primo na transakci: `recurring: {interval, nextDate, endDate, enabled, dayOfMonth}`
- Sablona generuje kopie pri startu (`processRecurringTxns`), kopie maji `recurringGenerated: true`
- `openTxnModal(idx, recurring=false)` — parametr predava stav, `openRecurringTxnModal()` vola `openTxnModal(-1, true)`

## Klicove funkce
- `markDirty(...sections)` — dirty-flag system, renderuje jen viditelnou sekci
- `buildExportPayload()` / `applyImport(d)` — serializace/deserializace vsech dat
- `processRecurringTxns()` / `advanceDate(dateStr, interval)` — opakujici se transakce
- `saveToStorage()` — uklada lokalne + cloud (debounce 1.5s)
- `duplicateTxn(idx)` — zkopiruje transakci do modalu (datum = dnes)
- `renderCategoryChart()`, `renderTrendChart()` — grafy na dashboardu (chart instance: `chartCategories`, `chartTrend`)
- `getSgDateRange()`, `setSgPeriod()`, `setSgCatFilter()` — filtry v detailu sdilene skupiny

## Externi sluzby
- **Supabase** — auth, cloud ukladani (user_data tabulka), sdilene skupiny/transakce
- **CNB API** — denni kurzy EUR/USD
- **Twelve Data API** — ceny akcii/ETF (free tier 800 req/den)

## Konvence
- Jazyk kodu: anglictina (nazvy funkci, promennych)
- Jazyk UI: cestina
- Zadne frameworky, zadny bundler — vse primo v prohlizeci
- XSS ochrana: `escHtml()` / `escAttr()` pro vsechny uzivatelske vstupy
- Datovy format verze: `DATA_VERSION = 5` v storage.js
