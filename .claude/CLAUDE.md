# CLAUDE.md

## Project Overview
- Personal finance SPA, no framework — pure HTML/CSS/JS
- Backend: Supabase (auth, cloud sync, sharing)
- No build, bundler, tests, or package.json — open kasicka.html in browser

## Architecture Decisions
- Global scope, no modules — all scripts share one window scope
- markDirty() render pipeline: marks sections dirty, RAF renders only visible section
- Data persistence: localStorage (immediate) + Supabase cloud sync (1.5s debounce)
- Data format version: DATA_VERSION = 5 in storage.js, migration chain v0→v5

## Conventions
- Code language: English (function/variable names)
- UI language: Czech
- After EVERY data change: call markDirty(...sections) + saveToStorage()
- Commit and push to GitHub after every change (git push origin master)
- Responsive: mobile ≤680px, desktop ≥681px

## NEVER Rules (Non-Negotiable)
- **NEVER** insert user input into DOM without escHtml() / escAttr()
- **NEVER** change script load order in kasicka.html without understanding implicit dependencies
- **NEVER** modify DATA_VERSION without adding a migration step in applyImport()
- **NEVER** skip markDirty() or saveToStorage() after modifying global data arrays
- **NEVER** use frameworks, bundlers, or module imports — everything runs in global scope
- **NEVER** sync theme preference to cloud — it's per-device only (localStorage)

## External Services
- Supabase — auth + cloud storage + shared groups/transactions
- Frankfurter API — EUR/USD daily rates (cached in localStorage)
- Twelve Data API — stock/ETF prices (free tier: 800 req/day)
- Stooq / Yahoo / CoinGecko — investment price fallbacks via Supabase Edge proxy (CORS)
- Chart.js 4.4.1 — charts from CDN

## Verification
- Reload kasicka.html in browser, check console for errors
- Test the affected section (dashboard, transactions, accounts, investments, budget)
- Verify data persists after page reload

## Past Mistakes (Learn From These)
- **Graph ignored sales**: `renderInvChart()` filtered only `type==='vydaj'` transactions — sales (`type==='prijem'`) were invisible to the invested line. When adding new transaction types, always check graph/chart filters too.
- **Missing metadata on history entries**: `saveSellInv()` didn't store `investedReduction` on the sale history entry, making it impossible for the graph to reconstruct cost basis changes. When modifying data, store enough context for all consumers (graphs, portfolio, exports).
- **Currency regex instead of API metadata**: `buildInvHistoryFromAPI` used `isEur=/\.[A-Z]{2,3}$/.test(symbol)` to guess currency, ignoring the actual `resp.meta.currency` from Twelve Data. Multiple places hardcoded `rawCurrency='USD'` even though `fetchTwelvePriceAtDate` returns the real currency. When fetching data from an API that provides metadata, always use the metadata — never guess with regex.
- **Grep pattern missed diacritics variant**: When patching all `toLocaleString` bypasses for demo mode, searched for `toLocaleString.*Kč` but `investments.js` chart used `' Kc'` (ASCII, no háček) — pattern didn't match, bypass was missed. When grepping for string patterns that may have encoding or diacritics variants, always also search the ASCII fallback form (e.g. search both `Kč` and `Kc`).

## Reference
See .claude/rules/ for detailed reference:
- architecture.md — script order, boot sequence, render pipeline, persistence flow
- data-model.md — data structures, recurring transactions
- ui-reference.md — sections, modals, period system, themes
- supabase.md — infrastructure, migrations, edge proxy
