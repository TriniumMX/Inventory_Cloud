-- Reconcilia audit_logs en Supabase: la migración previa (20260424000000_audit_logs.sql)
-- nunca se aplicó al proyecto real y además usaba id_log como PK en vez de id
-- (que es lo que espera el frontend y lo que usa database/schema.sql). Esta migración
-- crea la tabla correcta y agrega datos de prueba para que la pantalla de Bitácora
-- tenga algo que mostrar en la demo.

create table if not exists public.audit_logs (
  id             bigserial primary key,
  tabla          varchar(100)  not null,
  registro_id    varchar(100)  not null,
  accion         varchar(20)   not null, -- CREATE | UPDATE | DELETE | EXPORT | TRASPASAR | FINALIZAR
  campo          varchar(100),
  valor_anterior text,
  valor_nuevo    text,
  id_usuario     int           not null,
  usuario        varchar(100)  not null,
  nombre_usuario varchar(255),
  ip_address     varchar(50),
  created_at     timestamptz   not null default now()
);

create index if not exists idx_audit_logs_tabla_registro on public.audit_logs(tabla, registro_id);
create index if not exists idx_audit_logs_created_at     on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_usuario        on public.audit_logs(id_usuario);

alter table public.audit_logs enable row level security;

drop policy if exists "Lectura autenticada audit_logs" on public.audit_logs;
create policy "Lectura autenticada audit_logs" on public.audit_logs
  for select to anon, authenticated using (true);

drop policy if exists "Escritura autenticada audit_logs" on public.audit_logs;
create policy "Escritura autenticada audit_logs" on public.audit_logs
  for all to anon, authenticated using (true) with check (true);

-- Datos de prueba — referencian IDs reales existentes (activos, bienes_inmuebles, usuarios)
-- para que la columna "Bien:" (descripcion_registro) de la Bitácora resuelva correctamente.
insert into public.audit_logs
  (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, id_usuario, usuario, nombre_usuario, created_at) values
  ('activos', '17830', 'CREATE', null, null, '1002003000', 1, 'admin', 'Isra Basurto', now() - interval '2 hours'),
  ('activos', '17829', 'UPDATE', 'estatus', 'ALMACEN', 'ACTIVO', 1, 'admin', 'Isra Basurto', now() - interval '3 hours'),
  ('activos', '17828', 'UPDATE', 'costo', '8500', '9200', 1, 'admin', 'Isra Basurto', now() - interval '5 hours'),
  ('resguardos', 'RS-2026-00042', 'CREATE', 'asignacion', null, '1002003000 → 6021', 1, 'admin', 'Isra Basurto', now() - interval '6 hours'),
  ('resguardos', '8000400433', 'UPDATE', 'nomina', '6660', '6861', 4, 'Juan', 'Juan', now() - interval '1 day' - interval '1 hour'),
  ('bienes_inmuebles', '8', 'UPDATE', 'valor_comercial', '65000000', '68563414.31', 1, 'admin', 'Isra Basurto', now() - interval '1 day' - interval '3 hours'),
  ('bienes_inmuebles', '13', 'CREATE', null, null, 'INM-008-23', 1, 'admin', 'Isra Basurto', now() - interval '1 day' - interval '5 hours'),
  ('usuarios', '4', 'UPDATE', 'permisos', '2', '3', 1, 'admin', 'Isra Basurto', now() - interval '2 days' - interval '2 hours'),
  ('usuarios', '4', 'CREATE', null, null, 'Juan', 1, 'admin', 'Isra Basurto', now() - interval '2 days' - interval '4 hours'),
  ('activos', '17827', 'DELETE', null, '7000003062', null, 1, 'admin', 'Isra Basurto', now() - interval '2 days' - interval '6 hours'),
  ('activos', '17826', 'UPDATE', 'estatus', 'ACTIVO', 'PRE-BAJA', 1, 'admin', 'Isra Basurto', now() - interval '3 days' - interval '1 hour'),
  ('resguardos', 'TM-2026-00007', 'TRASPASAR', 'nomina', '6021', '6660', 1, 'admin', 'Isra Basurto', now() - interval '3 days' - interval '3 hours'),
  ('reportes', '-', 'EXPORT', null, null, 'Reporte de Bienes Muebles (PDF)', 1, 'admin', 'Isra Basurto', now() - interval '3 days' - interval '4 hours'),
  ('revisiones', '-', 'FINALIZAR', null, null, null, 1, 'admin', 'Isra Basurto', now() - interval '4 days' - interval '2 hours'),
  ('activos', '17825', 'UPDATE', 'descripcion', 'Bicicleta sin clasificar', 'BICICLETA TACTICA', 1, 'admin', 'Isra Basurto', now() - interval '4 days' - interval '5 hours')
on conflict do nothing;
