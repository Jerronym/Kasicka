# Architecture Reference

## Script Loading Order (kasicka.html)
Scripts load via `<script src>` in exact order — dependencies are implicit:
1. **config.js** — global state, constants, utilities (escHtml, fmt, toCZK), dirty-flag system
2. **ui.js** — modals, navigation, toast, theme, theme switcher (6 color themes)
3. **categories.js** → 4. **sharing.js** → 5. **transactions.js** → 6. **accounts.js** → 7. **investments.js** → 8. **budget.js** → 9. **dashboard.js**
10. **storage.js** — localStorage, JSON export/import, data migration
11. **auth.js** — Supabase auth, cloud sync, app init

## Global State (config.js)
All data lives in global variables: `transactions[]`, `accounts[]`, `investments[]`, `budgets[]`, `categories[]`, `invGroups[]`. No modules/imports — all files share one scope.

## Dirty-flag + RAF Render Pipeline (config.js:125-159)
`markDirty(...sections)` marks sections as dirty and schedules `requestAnimationFrame`. Callback `_renderVisible()` renders **only the currently visible section** — prevents cascade renders.

Valid sections: `dashboard`, `transactions`, `accounts`, `investments`, `budget`, `categories`, `links`. Calling without arguments marks the first 5 (excludes categories and links).

## App Lifecycle
1. HTML parse + CSS load
2. Inline `<script>` loads theme from localStorage before paint (flash prevention)
3. config.js initializes empty global state
4. Scripts 2-9 define UI + feature modules
5. storage.js defines persistence functions
6. auth.js: `onAuthStateChange` → logged in? `showApp()` → `loadFromCloud()` → `applyImport()` → `initCategories()` → `processRecurringTxns()` → `markDirty()` → render. Offline? `loadFromStorage()` as fallback.

## Data Persistence Flow
1. **localStorage** — `saveToStorage()` saves immediately (key: `kasicka_v1_<userId>`)
2. **Cloud sync** — `saveToCloud()` via 1.5s debounce (auth.js), saves full JSON snapshot to Supabase `user_data` table
3. **Import/Export** — `buildExportPayload()` serializes with `_version: 5`, `applyImport(d)` deserializes + `migrateImport(d)` upgrades old versions (v0→v1→v2→v3→v4→v5)
