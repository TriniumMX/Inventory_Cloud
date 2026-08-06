-- Cierre de RLS abierta en modulos y consignas (Etapa 6).
--
-- "modulos" tenía el bug conocido (misma familia que empleados/consignas):
-- "Escritura modulos" solo cubría el rol authenticated, que esta app nunca
-- alcanza (login propio, no Supabase Auth). Pero además "Lectura modulos"
-- estaba abierta a anon — y ninguno de los dos hacía falta ya: el catálogo de
-- módulos y las asignaciones de usuario_modulos se sirven server-side desde
-- Express (server/src/routes/permisos.ts, solo SuperAdmin) con la migración
-- de src/lib/apiPermisos.ts.
--
-- "consignas" (Instituciones) tenía SELECT abierto a {anon,authenticated} y
-- una policy de escritura ("Escritura autenticada consignas") que en su
-- momento se abrió a anon a propósito (20260804160000_consignas_crud_fix.sql)
-- porque la app no alcanza el rol authenticated — mismo patrón que
-- usuarios/activos/etc. antes de esta ronda de seguridad. Ya migrado a
-- Express (server/src/routes/consignas.ts).

drop policy if exists "Escritura modulos" on public.modulos;
drop policy if exists "Lectura modulos" on public.modulos;
alter table public.modulos enable row level security;

drop policy if exists "Allow read consignas" on public.consignas;
drop policy if exists "Escritura autenticada consignas" on public.consignas;
alter table public.consignas enable row level security;
