-- Sistema granular de permisos por módulo (pantalla de Permisos).
-- Faltaban modulos/usuario_modulos en Supabase (404) — la UI de Permisos
-- no podía cargar ni guardar nada.

create table if not exists public.modulos (
  id_modulo serial primary key,
  clave     varchar(50)  not null unique,
  nombre    varchar(100) not null,
  grupo     varchar(50)  not null, -- 'INVENTARIO' | 'GESTIÓN' | 'SISTEMA'
  orden     smallint     not null default 0
);

create table if not exists public.usuario_modulos (
  id_usuario   integer not null references public.usuarios(id_usuario) on delete cascade,
  id_modulo    integer not null references public.modulos(id_modulo)   on delete cascade,
  puede_ver    boolean not null default true,
  puede_editar boolean not null default false,
  primary key (id_usuario, id_modulo)
);

create index if not exists idx_usuario_modulos_usuario on public.usuario_modulos(id_usuario);

alter table public.modulos enable row level security;
alter table public.usuario_modulos enable row level security;

drop policy if exists "Lectura modulos" on public.modulos;
create policy "Lectura modulos" on public.modulos
  for select to anon, authenticated using (true);

drop policy if exists "Escritura modulos" on public.modulos;
create policy "Escritura modulos" on public.modulos
  for all to authenticated using (true) with check (true);

drop policy if exists "Lectura usuario_modulos" on public.usuario_modulos;
create policy "Lectura usuario_modulos" on public.usuario_modulos
  for select to anon, authenticated using (true);

drop policy if exists "Escritura usuario_modulos" on public.usuario_modulos;
create policy "Escritura usuario_modulos" on public.usuario_modulos
  for all to anon, authenticated using (true) with check (true);

-- Catálogo completo de módulos (uno por opción del sidebar)
insert into public.modulos (clave, nombre, grupo, orden) values
  ('bienes-muebles',   'Bienes Muebles',    'INVENTARIO', 1),
  ('bienes-inmuebles', 'Bienes Inmuebles',  'INVENTARIO', 2),
  ('enseres',          'Enseres',           'INVENTARIO', 3),
  ('almacen',          'Almacén',           'GESTIÓN',    1),
  ('resguardos',       'Resguardos',        'GESTIÓN',    2),
  ('pre-baja',         'Pre-Baja',          'GESTIÓN',    3),
  ('empleados-baja',   'Empleados de Baja', 'GESTIÓN',    4),
  ('revisiones',       'Revisiones',        'GESTIÓN',    5),
  ('reportes',         'Reportes',          'GESTIÓN',    6),
  ('usuarios',         'Usuarios',          'SISTEMA',    1),
  ('auditoria',        'Bitácora',          'SISTEMA',    2),
  ('configuracion',    'Configuración',     'SISTEMA',    3),
  ('permisos',         'Permisos',          'SISTEMA',    4)
on conflict (clave) do nothing;

-- Accesos por defecto para los roles no-SuperAdmin:
--   Editor   (permisos=2): ver + editar todo INVENTARIO y GESTIÓN, nada de SISTEMA
--   Consulta (permisos=3): solo ver INVENTARIO y GESTIÓN, nada de SISTEMA
-- Aplica a: editor.demo, consulta.demo (creados para pruebas) y Juan (usuario Consulta ya existente).

insert into public.usuario_modulos (id_usuario, id_modulo, puede_ver, puede_editar)
select u.id_usuario, m.id_modulo, true, true
from public.usuarios u
cross join public.modulos m
where u.usuario = 'editor.demo'
  and m.grupo in ('INVENTARIO', 'GESTIÓN')
on conflict (id_usuario, id_modulo) do update set puede_ver = true, puede_editar = true;

insert into public.usuario_modulos (id_usuario, id_modulo, puede_ver, puede_editar)
select u.id_usuario, m.id_modulo, true, false
from public.usuarios u
cross join public.modulos m
where u.usuario in ('consulta.demo', 'Juan')
  and m.grupo in ('INVENTARIO', 'GESTIÓN')
on conflict (id_usuario, id_modulo) do update set puede_ver = true, puede_editar = false;
