# Schema de la base de datos — referencia

Documentación generada por introspección de la base Postgres actual (Supabase), pensada como punto de partida al levantar una base Postgres self-hosted para un cliente nuevo (ej. CECCQ). El SQL ejecutable equivalente está en `db/schema.sql`.

No incluye RLS ni roles/GRANTs de Supabase — en un Postgres self-hosted el único cliente de la base es el backend Express, que ya filtra permisos por módulo/usuario en su propia capa (`requireModulo`/`requireActivoModulo`), así que no hace falta reproducir eso a nivel de base de datos.

## Índice de tablas

- [`clasificacion`](#clasificacion)
- [`ctas_contables`](#ctas_contables)
- [`activos`](#activos)
- [`audit_logs`](#audit_logs)
- [`auth_login_attempts`](#auth_login_attempts)
- [`tipos_inmueble`](#tipos_inmueble)
- [`bienes_inmuebles`](#bienes_inmuebles)
- [`consignas`](#consignas)
- [`empleados`](#empleados)
- [`modulos`](#modulos)
- [`resguardos`](#resguardos)
- [`revision_sesiones`](#revision_sesiones)
- [`usuarios`](#usuarios)
- [`usuario_modulos`](#usuario_modulos)

## `clasificacion`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_clasificacion** 🔑 | smallint | NOT NULL |  |
| clasificacion | varchar(50) | sí |  |
| estatus | smallint | NOT NULL | 1 |

**Índices adicionales:** idx_clasificacion_estatus

## `ctas_contables`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_ctacontable** 🔑 | smallint | NOT NULL |  |
| cta_contable | varchar(50) | sí |  |
| descripcion | text | sí |  |
| id_clasificacion_cta | smallint | sí |  |
| estatus | smallint | NOT NULL | 1 |

**Índices adicionales:** idx_ctas_contables_estatus

## `activos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_consecutivo** 🔑 | smallint | NOT NULL |  |
| numero_inventario | varchar(50) | sí |  |
| descripcion | text | sí |  |
| marca | varchar(50) | sí |  |
| modelo | varchar(50) | sí |  |
| numero_serie | varchar(50) | sí |  |
| f_factura | timestamp with time zone | sí |  |
| f_alta | timestamp with time zone | sí |  |
| costo | numeric(14,2) | sí |  |
| folio_factura | varchar(20) | sí |  |
| observaciones | text | sí |  |
| estatus | smallint | sí |  |
| clasificacion | smallint | sí |  |
| ultimo_nomina | varchar(50) | sí |  |
| id_cta_contable | smallint | sí |  |
| tipo | smallint | sí |  |

**Relaciones (FK):**
- `clasificacion` → `clasificacion`.`id_clasificacion`
- `id_cta_contable` → `ctas_contables`.`id_ctacontable`

## `audit_logs`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id** 🔑 | bigint | NOT NULL | autoincremental |
| tabla | varchar(100) | NOT NULL |  |
| registro_id | varchar(100) | NOT NULL |  |
| accion | varchar(20) | NOT NULL |  |
| campo | varchar(100) | sí |  |
| valor_anterior | text | sí |  |
| valor_nuevo | text | sí |  |
| id_usuario | integer | NOT NULL |  |
| usuario | varchar(100) | NOT NULL |  |
| nombre_usuario | varchar(255) | sí |  |
| ip_address | varchar(50) | sí |  |
| created_at | timestamp with time zone | NOT NULL | now() |

**Índices adicionales:** idx_audit_logs_tabla_registro, idx_audit_logs_created_at, idx_audit_logs_usuario

## `auth_login_attempts`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **identifier** 🔑 | text | NOT NULL |  |
| attempts | integer | NOT NULL | 0 |
| first_attempt_at | timestamp with time zone | NOT NULL | now() |
| locked_until | timestamp with time zone | sí |  |

## `tipos_inmueble`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id** 🔑 | integer | NOT NULL | autoincremental |
| nombre | varchar(100) | NOT NULL |  |
| descripcion | text | sí |  |

## `bienes_inmuebles`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id** 🔑 | integer | NOT NULL | autoincremental |
| numero_inventario | varchar(50) | NOT NULL |  |
| nombre | varchar(200) | sí |  |
| descripcion | text | sí |  |
| id_tipo_inmueble | integer | sí |  |
| direccion | text | NOT NULL |  |
| colonia | varchar(100) | sí |  |
| codigo_postal | varchar(10) | sí |  |
| municipio | varchar(100) | sí | 'San Juan del Río'::character varying |
| estado | varchar(100) | sí | 'Querétaro'::character varying |
| latitud | numeric(10,8) | sí |  |
| longitud | numeric(11,8) | sí |  |
| superficie_terreno | numeric(12,2) | sí |  |
| superficie_construccion | numeric(12,2) | sí |  |
| niveles | smallint | sí |  |
| uso_actual | varchar(100) | sí |  |
| numero_escritura | varchar(50) | sí |  |
| fecha_escritura | date | sí |  |
| notaria | varchar(200) | sí |  |
| volumen_libro | varchar(50) | sí |  |
| folio_registro | varchar(50) | sí |  |
| clave_catastral | varchar(50) | sí |  |
| valor_catastral | numeric(14,2) | sí |  |
| valor_comercial | numeric(14,2) | sí |  |
| costo_adquisicion | numeric(14,2) | sí |  |
| fecha_adquisicion | date | sí |  |
| id_cta_contable | smallint | sí |  |
| responsable_nomina | varchar(20) | sí |  |
| estatus | smallint | sí | 1 |
| observaciones | text | sí |  |
| fecha_registro | timestamp with time zone | sí | now() |
| fecha_modificacion | timestamp with time zone | sí | now() |
| escritura_url | text | sí |  |

**Únicas:** numero_inventario

**Relaciones (FK):**
- `id_cta_contable` → `ctas_contables`.`id_ctacontable`
- `id_tipo_inmueble` → `tipos_inmueble`.`id`

**Índices adicionales:** idx_inmuebles_inventario, idx_inmuebles_direccion, idx_inmuebles_tipo, idx_inmuebles_estatus

## `consignas`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_consigna** 🔑 | smallint | NOT NULL |  |
| consigna | varchar(50) | sí |  |
| estatus | smallint | NOT NULL | 1 |

**Índices adicionales:** idx_consignas_estatus

## `empleados`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **nomina** 🔑 | text | NOT NULL |  |
| nombre | text | NOT NULL |  |
| departamento | text | sí |  |
| puesto | text | sí |  |
| activo | text | NOT NULL | 'A'::text |

## `modulos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_modulo** 🔑 | integer | NOT NULL | autoincremental |
| clave | varchar(50) | NOT NULL |  |
| nombre | varchar(100) | NOT NULL |  |
| grupo | varchar(50) | NOT NULL |  |
| orden | smallint | NOT NULL | 0 |

**Únicas:** clave

## `resguardos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_resguardo** 🔑 | smallint | NOT NULL |  |
| folio | varchar(20) | sí |  |
| numero_inventario | varchar(50) | NOT NULL |  |
| nomina | varchar(60) | sí |  |
| estatus | boolean | sí |  |
| id_usuario | smallint | sí |  |
| fecha | timestamp with time zone | sí |  |

**Índices adicionales:** ix_res_inv_fecha, ix_res_folio, ix_res_nomina

## `revision_sesiones`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id** 🔑 | uuid | NOT NULL | gen_random_uuid() |
| id_usuario | smallint | NOT NULL |  |
| mode | varchar(50) | NOT NULL | 'responsable'::character varying |
| responsable_id | varchar(255) | sí |  |
| responsable_nombre | varchar(500) | sí |  |
| responsable_tipo | varchar(50) | sí |  |
| expected | jsonb | NOT NULL | '[]'::jsonb |
| scans | jsonb | NOT NULL | '[]'::jsonb |
| notes | text | sí |  |
| estatus | varchar(20) | NOT NULL | 'activa'::character varying |
| created_at | timestamp with time zone | NOT NULL | now() |
| updated_at | timestamp with time zone | NOT NULL | now() |

**Índices adicionales:** idx_revision_sesiones_usuario_estatus

## `usuarios`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_usuario** 🔑 | smallint | NOT NULL | autoincremental |
| nombre | varchar(50) | sí |  |
| usuario | varchar(50) | sí |  |
| password | varchar(15) | sí |  |
| password_hash | varchar(200) | sí |  |
| permisos | smallint | sí |  |

**Únicas:** usuario

## `usuario_modulos`

| Columna | Tipo | Nulo | Default |
|---|---|---|---|
| **id_usuario** 🔑 | integer | NOT NULL |  |
| **id_modulo** 🔑 | integer | NOT NULL |  |
| puede_ver | boolean | NOT NULL | true |
| puede_editar | boolean | NOT NULL | false |

**Relaciones (FK):**
- `id_modulo` → `modulos`.`id_modulo`
- `id_usuario` → `usuarios`.`id_usuario`

**Índices adicionales:** idx_usuario_modulos_usuario

