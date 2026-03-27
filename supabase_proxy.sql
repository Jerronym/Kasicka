-- Spusť v Supabase Dashboard → SQL Editor
-- Vytvoří proxy funkci pro stahování cen (obejde CORS)

create extension if not exists http with schema extensions;

create or replace function proxy_fetch(target_url text)
returns text
language sql
security definer
as $$
  select content from extensions.http_get(target_url);
$$;

-- Povolit volání pro přihlášené uživatele
grant execute on function proxy_fetch(text) to authenticated;
