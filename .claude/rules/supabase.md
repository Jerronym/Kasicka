# Supabase Infrastructure Reference

## Database & Migrations
- `supabase_migration_shared.sql` — tables for sharing (user_profiles, friendships, shared_groups, shared_transactions) + RLS policies

## Proxy for CORS Bypass
- `supabase_proxy.sql` — server-side `proxy_fetch(url)` for CORS bypass
- `supabase_edge_proxy.ts` — Edge Function proxy with domain whitelist (cnb.cz, stooq.com, yahoo finance, coingecko)

## Cloud Data Storage
- User data stored as full JSON snapshot in `user_data` table
- Sync via `saveToCloud()` with 1.5s debounce (auth.js)
- Key format: one row per user
