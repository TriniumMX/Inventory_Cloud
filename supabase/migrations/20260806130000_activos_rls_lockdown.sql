-- Cierre de RLS abierta en activos y clasificacion (Etapa 2).
--
-- "activos" tenía políticas SELECT/INSERT/UPDATE/DELETE abiertas a
-- {anon,authenticated} con USING(true) — cualquiera con el anon key podía
-- leer/editar/borrar los 17,831+ registros de inventario (bienes muebles y
-- enseres) sin login. "clasificacion" tenía lectura abierta igual.
--
-- El frontend ya no llama a estas tablas directo: src/lib/api/activos.ts y
-- src/lib/api/dashboard.ts se migraron a la API de Express
-- (server/src/routes/activos.ts, server/src/routes/dashboard.ts), protegida
-- con requireAuth + requireActivoModulo (bienes-muebles / enseres según el
-- campo `tipo`). El backend sigue funcionando porque se conecta con el rol
-- `postgres` de Supabase, que bypassea RLS.
--
-- Nota: "ctas_contables" NO se toca aquí — src/lib/api/inmuebles.ts todavía
-- la lee directo desde el navegador (pendiente de la Etapa 4).

drop policy if exists "Allow delete activos" on public.activos;
drop policy if exists "Allow insert activos" on public.activos;
drop policy if exists "Allow read activos" on public.activos;
drop policy if exists "Allow update activos" on public.activos;

drop policy if exists "Allow read clasificacion" on public.clasificacion;

alter table public.activos enable row level security;
alter table public.clasificacion enable row level security;
