-- Restringe audit_logs a solo-INSERT desde el cliente (Etapa 6, barrido final).
--
-- Tenía una política "ALL" (cubre SELECT/INSERT/UPDATE/DELETE) abierta a
-- {anon,authenticated}, además de una política de SELECT redundante — es
-- decir, cualquiera con el anon key podía no solo leer la bitácora completa,
-- sino también editarla o borrarla, destruyendo evidencia de auditoría.
--
-- La lectura ya la sirve Express (/api/audit-logs, migrado en la Etapa 1).
-- Sigue habiendo escritura legítima directa desde el cliente en dos lugares
-- conscientemente fuera de esta ronda de migración: src/lib/employees.ts
-- (CRUD de empleados, tabla local de demo) y logClientEvent en
-- src/lib/api/auditLogs.ts (eventos de exportación/impresión). Por eso se
-- deja INSERT abierto, pero nada más — audit_logs debe ser de solo-append.

drop policy if exists "Escritura autenticada audit_logs" on public.audit_logs;
drop policy if exists "Lectura autenticada audit_logs" on public.audit_logs;

create policy "Insertar audit_logs" on public.audit_logs
  for insert to anon, authenticated with check (true);
