-- Rate limiting para el login (auth-login Edge Function).
--
-- No había ninguna protección contra fuerza bruta/credential stuffing en el
-- login. Como auth-login corre en Deno/Supabase Edge Functions (serverless,
-- sin estado en memoria confiable entre invocaciones), el conteo de intentos
-- se guarda en esta tabla en vez de en memoria del proceso.
--
-- Solo la Edge Function (via service_role, que bypassea RLS) debe tocar esta
-- tabla — no se declara ninguna policy para anon/authenticated a propósito.

create table if not exists public.auth_login_attempts (
  identifier text primary key,
  attempts int not null default 0,
  first_attempt_at timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.auth_login_attempts enable row level security;
