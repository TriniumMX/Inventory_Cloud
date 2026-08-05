-- La migración 20260804120000_empleados.sql restringió la escritura de
-- `empleados` al rol "authenticated" de Postgres, pero esta app no usa
-- Supabase Auth (login propio contra la tabla `usuarios`), así que todas las
-- peticiones del cliente de Supabase llegan como "anon". El resultado es que
-- el CRUD de Empleados (creación, edición y borrado) falla con:
--   "new row violates row-level security policy for table empleados"
-- Mismo patrón ya corregido antes en audit_logs (ver
-- 20260804130000_audit_logs_reconcile.sql).

drop policy if exists "Escritura autenticada empleados" on public.empleados;
create policy "Escritura autenticada empleados" on public.empleados
  for all to anon, authenticated using (true) with check (true);
