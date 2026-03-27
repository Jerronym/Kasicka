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

### Recurring transakce (nove)
Recurring je vlastnost primo na transakci (ne separatni entita):
```
recurring: {
  interval: 'weekly' | 'monthly' | 'yearly',
  nextDate: 'YYYY-MM-DD',
  endDate: '' | 'YYYY-MM-DD',
  enabled: true | false,
  dayOfMonth: number | 'last' | null   // <-- PLANOVANO, zatim neni
}
```
- Transakce s `recurring` = sablona, ktera generuje kopie pri startu (`processRecurringTxns`)
- Generovane kopie maji `recurringGenerated: true`
- Badge 🔁 v seznamu transakcí u sablon

## Klicove funkce
- `markDirty(...sections)` — dirty-flag system, renderuje jen viditelnou sekci
- `buildExportPayload()` / `applyImport(d)` — serializace/deserializace vsech dat
- `migrateImport(d)` — migrace starych formatu (v0-v5)
- `processRecurringTxns()` — generovani opakovanych transakci
- `advanceDate(dateStr, interval)` — posun data o interval
- `saveToStorage()` — uklada lokalne + cloud (debounce 1.5s)
- `toCZK(amount, cur)` — prevod na CZK dle kurzu CNB

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

## Aktualni stav (2026-03-27)
- Zakladni funkcionalita kompletni (transakce, ucty, investice, rozpocty, kategorie, sdileni)
- Recurring transakce: kompletni
  - [x] Presunout recurring sekci nahoru v modalu
  - [x] Skryt hlavni datum v recurring rezimu
  - [x] Pridat hint "vzdy k X. dni v mesici" / "vzdy k poslednimu dni v mesici"
  - [x] Pridat `dayOfMonth` pole + opravit `advanceDate` pro konce mesicu
  - [x] Opravit bug: otevreni modalniho okna "nova klasicka transakce" po predchozim otevreni "nova opakovana transakce" nespravne zobrazovalo modal opakovane transakce
    - Pricina: `recurringMode` zustavalo `true` jako globalni stav
    - Reseni: `openTxnModal(idx, recurring=false)` — novy parametr explicitne predava stav; `openRecurringTxnModal()` vola `openTxnModal(-1, true)`
- Duplikovat transakci (2026-03-27)
  - [x] Tlačítko ⧉ v řádku transakce (desktop i mobil) — skryto u převodů
  - [x] `duplicateTxn(idx)` otevře modal předvyplněný daty (desc, typ, částka, měna, kat, účet, štítky), datum = dnešek
- Analytika & grafy na dashboardu (2026-03-27)
  - [x] Graf "Výdaje po kategoriích" — doughnut chart reagující na vybrané období, barvy dle kategorií, top 5 list
  - [x] Graf "Trend — posledních 12 měsíců" — skupinový bar chart příjmy vs výdaje, nezávislý na výběru období
  - Nové funkce: `renderCategoryChart()`, `renderTrendChart()` v dashboard.js; volány z `renderDashboard()`
  - Nové globální proměnné: `chartCategories`, `chartTrend` v config.js
  - Nové canvas elementy: `#chartCategories`, `#chartTrend` v kasicka.html
- Oprava bugu tyden v nedeli (2026-03-27)
  - [x] Opravit bug: tydenni filtry (rozpocty, grafy, dashboard, transakce) zobrazovaly 0/prazdno v nedeli
    - Pricina: `getDay()` vraci 0 pro nedeli; formule `-getDay()+1` dala +1 = zitrejsi pondeli → zadne transakce nespadaly do rozsahu
    - Reseni: `(getDay()||7)` konvertuje nedeli na 7, ostatni dny beze zmeny — opraveno na 7 mistech (budget.js, ui.js)
  - [x] Opravit: badge 🔁 se nezobrazoval u automaticky generovanych opakovanych transakci
    - Reseni: `t.recurring||t.recurringGenerated` v podmince pro zobrazeni badge (transactions.js, 2 mista)
