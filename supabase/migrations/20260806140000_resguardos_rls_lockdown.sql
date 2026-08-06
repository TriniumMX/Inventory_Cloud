-- Cierre de RLS abierta en resguardos (Etapa 3).
--
-- Tenía políticas SELECT/INSERT/UPDATE/DELETE abiertas a {anon,authenticated}
-- con USING(true) — cualquiera con el anon key podía leer/crear/reasignar
-- resguardos de inventario sin login.
--
-- El frontend ya no llama a esta tabla directo: src/lib/api/resguardos.ts se
-- migró a la API de Express (server/src/routes/resguardos.ts), protegida con
-- requireAuth + requireModulo("resguardos"). El backend sigue funcionando
-- porque se conecta con el rol `postgres` de Supabase, que bypassea RLS.

drop policy if exists "Allow delete resguardos" on public.resguardos;
drop policy if exists "Allow insert resguardos" on public.resguardos;
drop policy if exists "Allow read resguardos" on public.resguardos;
drop policy if exists "Allow update resguardos" on public.resguardos;

alter table public.resguardos enable row level security;
