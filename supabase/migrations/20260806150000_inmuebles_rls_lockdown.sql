-- Cierre de RLS abierta en bienes_inmuebles y en el bucket de Storage
-- "escrituras" (Etapa 4).
--
-- "bienes_inmuebles" tenía políticas SELECT/INSERT/UPDATE/DELETE abiertas a
-- {public} (ni siquiera restringidas a anon/authenticated) con USING(true).
-- "escrituras" (Storage) estaba marcado public:false en el bucket, pero sus
-- políticas de storage.objects también eran {public} sin restricción real —
-- cualquiera con el anon key podía leer/subir/borrar los PDFs de escrituras
-- notariales sin login.
--
-- El frontend ya no llama a estas tablas ni a Storage directo: src/lib/api/
-- inmuebles.ts se migró a la API de Express (server/src/routes/inmuebles.ts),
-- protegida con requireAuth + requireModulo("bienes-inmuebles"). La subida/
-- descarga de escrituras ahora la hace Express con la service_role key
-- (server/src/supabaseAdmin.ts), que bypassea RLS de Storage igual que el
-- rol `postgres` bypassea RLS de la base de datos.

drop policy if exists "Permitir actualizar bienes_inmuebles" on public.bienes_inmuebles;
drop policy if exists "Permitir eliminar bienes_inmuebles" on public.bienes_inmuebles;
drop policy if exists "Permitir insertar bienes_inmuebles" on public.bienes_inmuebles;
drop policy if exists "Permitir lectura bienes_inmuebles" on public.bienes_inmuebles;

alter table public.bienes_inmuebles enable row level security;

drop policy if exists "Permitir eliminar escrituras" on storage.objects;
drop policy if exists "Permitir lectura escrituras" on storage.objects;
drop policy if exists "Permitir subir escrituras" on storage.objects;
