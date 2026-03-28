# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Popis projektu
Webova single-page aplikace pro spravu osobnich financi. Bez frameworku — ciste HTML/CSS/JS. Backend: Supabase (auth, cloud sync, sdileni).

## Vyvoj
Zadny build, bundler, testy, ani package.json. Staci otevrit `kasicka.html` v prohlizeci. `index.html` je redirect na `kasicka.html`.

## Architektura

### Script loading order (kasicka.html, radky ~849-859)
Soubory se nacitaji primo `<script src>` v presnem poradi — zavislosti jsou implicitni:
1. **config.js** — globalni stav, konstanty, utility (escHtml, fmt, toCZK), dirty-flag system
2. **ui.js** — modaly, navigace, toast, tema, theme prepinac (5 barevnych temat)
3. **categories.js** → 4. **sharing.js** → 5. **transactions.js** → 6. **accounts.js** → 7. **investments.js** → 8. **budget.js** → 9. **dashboard.js**
10. **storage.js** — localStorage, JSON export/import, migrace dat
11. **auth.js** — Supabase auth, cloud sync, app init

### Globalni stav (config.js)
Vsechna data jsou globalni promenne: `transactions[]`, `accounts[]`, `investments[]`, `budgets[]`, `categories[]`, `invGroups[]`. Zadne moduly/importy — vsechny soubory sdili jeden scope.

### Dirty-flag + RAF render pipeline (config.js:125-155)
`markDirty(...sections)` oznaci sekce jako dirty a naplánuje `requestAnimationFrame`. Callback `_renderVisible()` renderuje **jen aktualne viditelnou sekci** — zabraňuje cascade renderum. Po kazde zmene dat volat `markDirty('dashboard','transactions')` atd.

### Data persistence flow
1. **localStorage** — `saveToStorage()` uklada okamzite
2. **Cloud sync** — `saveToCloud()` pres debounce 1.5s (auth.js:120-135), uklada cely JSON snapshot do Supabase `user_data` tabulky
3. **Import/Export** — `buildExportPayload()` serializuje vse s `_version: 5`, `applyImport(d)` deserializuje + migruje stare verze

### Supabase infrastruktura
- `supabase_migration_shared.sql` — tabulky pro sdileni (user_profiles, friendships, shared_groups, shared_transactions) + RLS politiky
- `supabase_proxy.sql` — server-side `proxy_fetch(url)` pro CORS bypass
- `supabase_edge_proxy.ts` — Edge Function proxy s whitelistem domen (cnb.cz, stooq.com, yahoo finance, coingecko)

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

## Externi sluzby
- **Supabase** — auth, cloud ukladani (user_data tabulka), sdilene skupiny/transakce
- **Frankfurter API** — denni kurzy EUR/USD (s localStorage cache)
- **Twelve Data API** — ceny akcii/ETF (free tier 800 req/den, klic v config.js)

## Konvence
- Jazyk kodu: anglictina (nazvy funkci, promennych)
- Jazyk UI: cestina
- Zadne frameworky, zadny bundler — vse primo v prohlizeci
- XSS ochrana: `escHtml()` / `escAttr()` pro **vsechny** uzivatelske vstupy v DOM
- Datovy format verze: `DATA_VERSION = 5` v storage.js, migrace v `applyImport()`
- Po kazde zmene dat: volat `markDirty()` s relevatnimi sekcemi + `saveToStorage()`
- Barevna temata: 5 temat (default, ocean, forest, sunset, cyberpunk) pres `data-theme` atribut na `<html>`. Preference v `localStorage('kasicka_theme')` — per-device, nesyncuje se do cloudu. CSS promenne v `style.css`, logika v `ui.js` (`setTheme`/`loadTheme`).
- **Po kazde zmene vzdy commitnout a pushnout na GitHub** (`git push origin master`)
