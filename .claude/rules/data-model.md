# Data Model Reference

## Data Structures
- `transactions[]` — {desc, tags[], amount, date, type(prijem/vydaj/prevod), cat, cur, accIdx, toAccIdx?, convertedAmount?, toCur?, invIdx?, sharedGroupId?, sharedTxnId?, recurring?, recurringGenerated?}
- `accounts[]` — {name, initialBalance, currency, type, includeInTotal, startDate}
- `investments[]` — {ticker, apiSymbol, shares, lastPrice, lastPriceDate, type, invested, value, startDate, history[], groupIdx}
- `budgets[]` — {name, limit, color, budType, period, cats[], trackMode, trackTags[], flowMode}
- `categories[]` — {name, color, icon}
- `invGroups[]` — {name, color, note}

## Recurring Transactions
Property directly on the transaction object: `recurring: {interval, nextDate, endDate, enabled, dayOfMonth}`
- Template generates copies at startup (`processRecurringTxns`), copies have `recurringGenerated: true`
- `openTxnModal(idx, recurring=false)` — parameter passes state, `openRecurringTxnModal()` calls `openTxnModal(-1, true)`
