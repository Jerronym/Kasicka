# UI Reference

## Sections & Navigation
HTML sections: `section-dashboard`, `section-transactions`, `section-accounts`, `section-investments`, `section-budget`, `section-categories`, `section-links`. Navigation via `showSection(id)`.

## Modals
`openModal(name)` / `closeModal(name)` — names: `txn`, `transfer`, `acc`, `inv`, `inv-group`, `inv-update`, `cat`, `bud`, `profile`, `friend`, `group`. In HTML as `#modal-{name}`.

## Period System (ui.js)
Each section has its own period state: `activePeriod`+`periodOffset` (transactions), `dashPeriod`+`dashOffset` (dashboard), `accPeriod`+`accOffset`, `invPeriod`+`invOffset`.
Period values: `'dnes'`, `'tyden'`, `'mesic'`, `'rok'`, `'vlastni'` (custom date range).

## Theme System
6 themes (default, light, ocean, forest, sunset, cyberpunk) via `data-theme` attribute on `<html>`. Preference stored in `localStorage('kasicka_theme')` — per-device, NOT synced to cloud. CSS variables in `style.css`, logic in `ui.js` (`setTheme`/`loadTheme`). Neutral colors (borders, hover, shadow) use CSS variables (`--border-subtle`, `--hover-bg`, `--tag-bg`, `--progress-bg`, `--toggle-off`, `--scrim`, `--shadow` etc.) — light theme inverts them.
