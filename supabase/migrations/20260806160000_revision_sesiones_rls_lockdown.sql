-- Cierre de RLS abierta en revision_sesiones (Etapa 5).
--
-- Tenía políticas SELECT/INSERT/UPDATE/DELETE abiertas a {public} con
-- USING(true) — cualquiera con el anon key podía leer/crear/editar sesiones
-- de revisión de inventario sin login.
--
-- El frontend ya no llama a esta tabla directo: src/lib/revisionStore.ts se
-- migró a la API de Express (server/src/routes/revision.ts), protegida con
-- requireAuth + requireModulo("revisiones"). El backend sigue funcionando
-- porque se conecta con el rol `postgres` de Supabase, que bypassea RLS.

drop policy if exists "Allow delete revision_sesiones" on public.revision_sesiones;
drop policy if exists "Allow insert revision_sesiones" on public.revision_sesiones;
drop policy if exists "Allow read revision_sesiones" on public.revision_sesiones;
drop policy if exists "Allow update revision_sesiones" on public.revision_sesiones;

alter table public.revision_sesiones enable row level security;
