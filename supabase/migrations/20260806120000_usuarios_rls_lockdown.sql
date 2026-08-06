-- Cierre de RLS abierta en usuarios y usuario_modulos.
--
-- Antes de esto, "usuarios" tenía políticas SELECT/INSERT/UPDATE/DELETE para el
-- rol {public} con USING(true) — cualquiera con el anon key público podía leer
-- password_hash de todos los usuarios y auto-promoverse a SuperAdmin sin login.
-- "usuario_modulos" tenía escritura abierta a {anon,authenticated}, permitiendo
-- que cualquiera se otorgara permisos de edición sobre cualquier módulo.
--
-- El backend Express es ahora el único punto de acceso legítimo a estas tablas
-- (server/src/routes/usuarios.ts, protegido con requireAuth + requireModulo), y
-- se conecta con el rol `postgres` de Supabase, que bypassea RLS (rolbypassrls
-- confirmado). El frontend ya no llama a estas tablas directo (src/lib/apiUsers.ts,
-- src/lib/apiAuth.ts migrados a la API de Express; fetchModulosPermitidos movido
-- a los Edge Functions auth-login/auth-me, que usan la service role key).
--
-- RLS habilitada + sin políticas permisivas = deny-all para anon/authenticated;
-- el backend sigue funcionando por el bypass del rol postgres.

drop policy if exists "Allow select usuarios" on public.usuarios;
drop policy if exists "Allow read usuarios" on public.usuarios;
drop policy if exists "Allow insert usuarios" on public.usuarios;
drop policy if exists "Allow update usuarios" on public.usuarios;
drop policy if exists "Allow delete usuarios" on public.usuarios;

drop policy if exists "Lectura usuario_modulos" on public.usuario_modulos;
drop policy if exists "Escritura usuario_modulos" on public.usuario_modulos;

-- RLS ya estaba habilitada en ambas tablas; se deja explícito por si acaso.
alter table public.usuarios enable row level security;
alter table public.usuario_modulos enable row level security;
