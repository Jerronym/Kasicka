# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Popis projektu
Webova single-page aplikace pro spravu osobnich financi. Bez frameworku — ciste HTML/CSS/JS. Backend: Supabase (auth, cloud sync, sdileni).

## Vyvoj
Zadny build, bundler, testy, ani package.json. Staci otevrit `kasicka.html` v prohlizeci. `index.html` je redirect na `kasicka.html`.

## Architektura

### Script loading order (kasicka.html, radky ~872-882)
Soubory se nacitaji primo `<script src>` v presnem poradi — zavislosti jsou implicitni:
1. **config.js** — globalni stav, konstanty, utility (escHtml, fmt, toCZK), dirty-flag system
2. **ui.js** — modaly, navigace, toast, tema, theme prepinac (6 barevnych temat)
3. **categories.js** → 4. **sharing.js** → 5. **transactions.js** → 6. **accounts.js** → 7. **investments.js** → 8. **budget.js** → 9. **dashboard.js**
10. **storage.js** — localStorage, JSON export/import, migrace dat
11. **auth.js** — Supabase auth, cloud sync, app init

### Globalni stav (config.js)
Vsechna data jsou globalni promenne: `transactions[]`, `accounts[]`, `investments[]`, `budgets[]`, `categories[]`, `invGroups[]`. Zadne moduly/importy — vsechny soubory sdili jeden scope.

### Dirty-flag + RAF render pipeline (config.js:125-159)
`markDirty(...sections)` oznaci sekce jako dirty a naplánuje `requestAnimationFrame`. Callback `_renderVisible()` renderuje **jen aktualne viditelnou sekci** — zabraňuje cascade renderum. Po kazde zmene dat volat `markDirty('dashboard','transactions')` atd.

Platne sekce: `dashboard`, `transactions`, `accounts`, `investments`, `budget`, `categories`, `links`. Volani bez argumentu oznaci prvnich 5 (bez categories a links).

### App lifecycle
1. HTML parse + CSS load
2. Inline `<script>` nacte tema z localStorage pred paintem (flash prevention)
3. config.js inicializuje prazdny globalni stav
4. Scripty 2-9 definuji UI + feature moduly
5. storage.js definuje persistence funkce
6. auth.js: `onAuthStateChange` → prihlaseny? `showApp()` → `loadFromCloud()` → `applyImport()` → `initCategories()` → `processRecurringTxns()` → `markDirty()` → render. Offline? `loadFromStorage()` jako fallback.

### Data persistence flow
1. **localStorage** — `saveToStorage()` uklada okamzite (klic: `kasicka_v1_<userId>`)
2. **Cloud sync** — `saveToCloud()` pres debounce 1.5s (auth.js), uklada cely JSON snapshot do Supabase `user_data` tabulky. Offline-safe: pending-sync flag v localStorage (`kasicka_pending_<userId>`), resync pres `online` listener. Pred zapisem kontroluje `updated_at` proti `_lastCloudSave` (auth.js) — pokud cloud zmenilo jine zarizeni, misto slepeho prepsani se zepta uzivatele (`confirmDialog`). Po uspesnem ulozeni nastavi `_lastCloudSave`.
   - **Auto-sync mezi zarizenimi** — `checkCloudFreshness()` overuje `updated_at` a pri zmene (`!== _lastCloudSave`) vola `reloadFromCloud()`. Spousteni: `visibilitychange` (navrat na kartu), `focus`, `online`, a periodicky kazdych 30s. Hlidano tak, aby neobnovovalo pri otevrenem modalu (`[id^="modal-"].open`) ani pri `hasPendingSync()` (neulozene offline zmeny). Resi problem stale otevrene karty pracujici se zastaralym snapshotem — diky nemu nevznikne konflikt pri ulozeni.
3. **Service worker (PWA)** — `sw.js`, cache `kasicka-v{N}`. Network-first pro navigaci, cache-first pro app shell, network-only pro Supabase/zive kurzy. **POZOR: pri kazde zmene shell souboru zvysit `CACHE` verzi v sw.js** (jinak prohlizec servíruje stary nakesovany kod). Registrace v `kasicka.html`.
4. **Import/Export** — `buildExportPayload()` serializuje vse s `_version: 5`, `applyImport(d)` deserializuje + `migrateImport(d)` upgraduje stare verze (v0→v1→v2→v3→v4→v5)

### Supabase infrastruktura
- `supabase_migration_shared.sql` — tabulky pro sdileni (user_profiles, friendships, shared_groups, shared_transactions) + RLS politiky
- `supabase_proxy.sql` — server-side `proxy_fetch(url)` pro CORS bypass
- `supabase_edge_proxy.ts` — Edge Function proxy s whitelistem domen (cnb.cz, stooq.com, yahoo finance, coingecko)

### UI sekce a modaly
HTML sekce: `section-dashboard`, `section-transactions`, `section-accounts`, `section-investments`, `section-budget`, `section-categories`, `section-links`. Navigace pres `showSection(id)`.

Modaly: `openModal(name)` / `closeModal(name)` — jmena: `txn`, `transfer`, `acc`, `inv`, `inv-group`, `inv-update`, `cat`, `bud`, `profile`, `friend`, `group`. V HTML jako `#modal-{name}`.

### Period system (ui.js)
Kazda sekce ma vlastni period stav: `activePeriod`+`periodOffset` (transactions), `dashPeriod`+`dashOffset` (dashboard), `accPeriod`+`accOffset`, `invPeriod`+`invOffset`.
Hodnoty periody: `'dnes'`, `'tyden'`, `'mesic'`, `'rok'`, `'vlastni'` (custom date range).

## Datovy model
- `transactions[]` — {desc, tags[], amount, date, type(prijem/vydaj/prevod), cat, cur, accIdx, toAccIdx?, convertedAmount?, toCur?, invIdx?, sharedGroupId?, sharedTxnId?, recurring?, recurringGenerated?}
- `accounts[]` — {name, initialBalance, currency, type, includeInTotal, startDate}
- `investments[]` — {ticker, apiSymbol, shares, lastPrice, lastPriceDate, type, invested, value, startDate, history[], groupIdx}
- `budgets[]` — {name, limit, color, budType, period, cats[], trackMode, trackTags[], flowMode}
- `categories[]` — {name, color, icon}
- `invGroups[]` — {name, color, note}

### Recurring transakce
Vlastnost primo na transakci: `recurring: {interval, nextDate, endDate, enabled, dayOfMonth}`
- Sablona generuje kopie pri startu (`processRecurringTxns`), kopie maji `recurringGenerated: true`
- `openTxnModal(idx, recurring=false)` — parametr predava stav, `openRecurringTxnModal()` vola `openTxnModal(-1, true)`

## Externi sluzby
- **Supabase** — auth, cloud ukladani (user_data tabulka), sdilene skupiny/transakce
- **Frankfurter API** — denni kurzy EUR/USD (s localStorage cache, klic `fx_rates_YYYY-MM-DD`)
- **Twelve Data API** — ceny akcii/ETF (free tier 800 req/den, klic v config.js)
- **Stooq / Yahoo Finance / CoinGecko** — fallback zdroje cen investic (pres Supabase Edge proxy kvuli CORS)
- **Chart.js 4.4.1** — grafy (nacteny z CDN)

## Konvence
- Jazyk kodu: anglictina (nazvy funkci, promennych)
- Jazyk UI: cestina
- Zadne frameworky, zadny bundler — vse primo v prohlizeci
- XSS ochrana: `escHtml()` / `escAttr()` pro **vsechny** uzivatelske vstupy v DOM
- Datovy format verze: `DATA_VERSION = 5` v storage.js, migrace v `applyImport()`
- Po kazde zmene dat: volat `markDirty()` s relevantnimi sekcemi + `saveToStorage()`
- Toast notifikace: `toast(msg, type, duration)` — typy: `'info'`, `'success'`, `'warn'`, `'error'`
- Barevna temata: 6 temat (default, light, ocean, forest, sunset, cyberpunk) pres `data-theme` atribut na `<html>`. Preference v `localStorage('kasicka_theme')` — per-device, nesyncuje se do cloudu. CSS promenne v `style.css`, logika v `ui.js` (`setTheme`/`loadTheme`). Neutralni barvy (borders, hover, shadow) pouzivaji CSS promenne (`--border-subtle`, `--hover-bg`, `--tag-bg`, `--progress-bg`, `--toggle-off`, `--scrim`, `--shadow` atd.) — light theme je invertuje.
- Responsive breakpoint: mobile ≤680px, desktop ≥681px. Mobile ma bottom nav + hamburger menu.
- **Po kazde zmene vzdy commitnout a pushnout na GitHub** (`git push origin master`)
