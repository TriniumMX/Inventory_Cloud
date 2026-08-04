-- Tabla local de empleados para pruebas/demo — reemplaza temporalmente al web service
-- SOAP externo (que es un sistema de producción) por privacidad de datos.
-- Los datos son ficticios; las nóminas coinciden con las ya referenciadas en
-- activos.ultimo_nomina / resguardos.nomina para que la demo enlace de verdad.

create table if not exists public.empleados (
  nomina text primary key,
  nombre text not null,
  departamento text,
  puesto text,
  activo text not null default 'A' -- 'A' = Activo, 'B' = Baja
);

alter table public.empleados enable row level security;

drop policy if exists "Lectura pública empleados" on public.empleados;
create policy "Lectura pública empleados" on public.empleados
  for select to anon, authenticated using (true);

drop policy if exists "Escritura autenticada empleados" on public.empleados;
create policy "Escritura autenticada empleados" on public.empleados
  for all to authenticated using (true) with check (true);

insert into public.empleados (nomina, nombre, departamento, puesto, activo) values
  ('6021', 'Laura Beatriz Mendoza Ríos',         'Tesorería',                        'Auxiliar Contable',            'A'),
  ('6660', 'Jorge Alberto Casillas Peña',        'Obras Públicas',                   'Supervisor de Obra',           'A'),
  ('6861', 'María Fernanda López Torres',        'Desarrollo Social',                'Coordinadora de Programas',    'A'),
  ('6840', 'Ricardo Iván Domínguez Salas',       'Sistemas',                         'Analista de TI',               'A'),
  ('7324', 'Ana Karen Villalobos Guerrero',      'Recursos Humanos',                 'Auxiliar Administrativo',      'A'),
  ('7012', 'Carlos Eduardo Rangel Ibarra',       'Seguridad Pública',                'Jefe de Turno',                'A'),
  ('7031', 'Diana Patricia Hernández Cruz',      'Servicios Públicos Municipales',   'Auxiliar de Campo',            'A'),
  ('8121', 'Fernando Josué Aguilar Ponce',       'Catastro',                         'Inspector',                    'A'),
  ('6887', 'Gabriela Alejandra Reyes Ortiz',     'DIF Municipal',                    'Trabajadora Social',           'A'),
  ('8226', 'Héctor Manuel Zavala Correa',        'Presidencia',                      'Asistente Ejecutivo',          'A'),
  ('6501', 'Itzel Guadalupe Navarro Campos',     'Tesorería',                        'Cajera',                       'B'),
  ('6533', 'Julio César Medina Espinoza',        'Obras Públicas',                   'Chofer',                       'A'),
  ('6590', 'Karla Vanessa Solís Marín',          'Desarrollo Social',                'Promotora Comunitaria',        'A'),
  ('6674', 'Luis Fernando Chávez Rocha',         'Sistemas',                         'Soporte Técnico',              'A'),
  ('6754', 'Mónica Isabel Gutiérrez Vega',       'Recursos Humanos',                 'Reclutadora',                  'A'),
  ('6800', 'Norberto Alejandro Cabrera Luna',    'Seguridad Pública',                'Elemento Operativo',           'A'),
  ('6899', 'Olga Lidia Ramírez Fonseca',         'Servicios Públicos Municipales',   'Encargada de Almacén',         'A'),
  ('6928', 'Pedro Antonio Villaseñor Duarte',    'Catastro',                         'Auxiliar Administrativo',      'B'),
  ('6947', 'Rosa Elena Bautista Nájera',         'DIF Municipal',                    'Psicóloga',                    'A'),
  ('7041', 'Sergio Iván Palacios Beltrán',       'Presidencia',                      'Chofer Ejecutivo',             'A'),
  ('7105', 'Tania Michelle Cordero Sandoval',    'Tesorería',                        'Auxiliar de Recaudación',      'A'),
  ('7136', 'Uriel Alejandro Montes de Oca',      'Obras Públicas',                   'Topógrafo',                    'A'),
  ('7217', 'Valeria Nicole Escobedo Trejo',      'Desarrollo Social',                'Auxiliar Administrativo',      'A'),
  ('7288', 'Wendy Carolina Robles Anaya',        'Sistemas',                         'Desarrolladora',               'A'),
  ('7328', 'Xavier Emmanuel Cortés Delgado',     'Recursos Humanos',                 'Auxiliar de Nómina',           'A')
on conflict (nomina) do nothing;
