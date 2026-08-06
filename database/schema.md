# Schema de la base de datos — referencia

Documentación de `database/schema.sql` (+ `database/migration_modulos.sql` para el seed de módulos), pensada como punto de partida al levantar un Postgres self-hosted para un cliente nuevo (ej. CECCQ). Sin RLS ni roles/GRANTs de Supabase — el único cliente de la base es el backend Express, que ya filtra permisos por módulo/usuario en su propia capa (`requireModulo`/`requireActivoModulo`), así que no hace falta reproducir eso a nivel de base de datos.

Orden de ejecución: `database/schema.sql` primero, luego `database/migration_modulos.sql` (idempotente, usa `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`).

## Índice de tablas

- [`clasificacion`](#clasificacion) · [`consignas`](#consignas) · [`ctas_contables`](#ctas_contables) · [`tipos_inmueble`](#tipos_inmueble)
- [`usuarios`](#usuarios) · [`auth_login_attempts`](#auth_login_attempts)
- [`activos`](#activos) · [`activos_stg`](#activos_stg)
- [`resguardos`](#resguardos)
- [`bienes_inmuebles`](#bienes_inmuebles)
- [`revision_sesiones`](#revision_sesiones)
- [`audit_logs`](#audit_logs)
- [`empleados`](#empleados)
- [`modulos`](#modulos) · [`usuario_modulos`](#usuario_modulos)

## `clasificacion`
Catálogo de clasificaciones de activos.

| Columna | Tipo | Notas |
|---|---|---|
| **id_clasificacion** 🔑 | SERIAL | |
| clasificacion | VARCHAR(200) | |
| estatus | SMALLINT | default 1 |

## `consignas`
Catálogo de instituciones en comodato (pantalla "Instituciones").

| Columna | Tipo | Notas |
|---|---|---|
| **id_consigna** 🔑 | INTEGER | sin autoincrement — el id se asigna a mano al insertar |
| consigna | VARCHAR(300) | |
| estatus | SMALLINT | default 1 |

## `ctas_contables`
Catálogo de cuentas contables.

| Columna | Tipo | Notas |
|---|---|---|
| **id_ctacontable** 🔑 | INTEGER | sin autoincrement |
| cta_contable | VARCHAR(50) | |
| descripcion | VARCHAR(300) | |
| id_clasificacion_cta | INTEGER | sin FK declarada |
| estatus | SMALLINT | default 1 |

## `tipos_inmueble`
Catálogo de tipos de bien inmueble. Trae seed data (10 tipos) en el propio `schema.sql`.

| Columna | Tipo | Notas |
|---|---|---|
| **id** 🔑 | SERIAL | |
| nombre | VARCHAR(100) | NOT NULL |
| descripcion | TEXT | |

## `usuarios`
Login del sistema. `password_hash` es bcrypt; `password` es un campo legacy en texto plano que el login migra automáticamente a hash la primera vez que alguien entra con esa cuenta.

| Columna | Tipo | Notas |
|---|---|---|
| **id_usuario** 🔑 | SERIAL | |
| nombre | VARCHAR(200) | |
| usuario | VARCHAR(100) | |
| password | TEXT | legacy, texto plano |
| password_hash | TEXT | bcrypt |
| permisos | SMALLINT | 1=SuperAdmin, 2=Editor, 3=Consulta |

## `auth_login_attempts`
Rate limiting anti fuerza bruta del login. Se guarda en la base (no en memoria del proceso) para funcionar igual detrás de balanceo o serverless.

| Columna | Tipo | Notas |
|---|---|---|
| **identifier** 🔑 | TEXT | usuario normalizado (lowercase/trim) |
| attempts | INTEGER | default 0 |
| first_attempt_at | TIMESTAMPTZ | default now() |
| locked_until | TIMESTAMPTZ | null = no bloqueado |

## `activos`
Bienes muebles y enseres (`tipo` los distingue). Núcleo del sistema.

| Columna | Tipo | Notas |
|---|---|---|
| **id_consecutivo** 🔑 | SERIAL | |
| numero_inventario | VARCHAR(50) | único solo entre activos NO dados de baja — ver índice abajo |
| descripcion, marca, modelo, numero_serie | texto | |
| clasificacion | INTEGER | FK → `clasificacion.id_clasificacion` |
| id_cta_contable | INTEGER | FK → `ctas_contables.id_ctacontable` |
| costo | NUMERIC(14,2) | |
| f_alta | TIMESTAMPTZ | |
| f_factura | DATE | |
| folio_factura | VARCHAR(100) | |
| estatus | SMALLINT | 0=BAJA, 1=ACTIVO, 2=MANT, 3=PRE-BAJA |
| tipo | SMALLINT | 1=Bien Mueble, 2=Enser |
| ultimo_nomina | VARCHAR(30) | última nómina responsable (referencia informal a `empleados.nomina`) |
| observaciones | TEXT | |

**Índice especial:** `idx_activos_numero_inventario_unique` — UNIQUE parcial, solo aplica `WHERE numero_inventario IS NOT NULL AND estatus != 0`. Permite reusar un número de inventario después de que el activo original se dio de baja.

## `activos_stg`
Tabla de staging para importación masiva — todas las columnas TEXT para aceptar datos crudos antes de limpiarlos/tipificarlos. **No la usa la app en producción**, solo herramientas de migración/carga (ver `server/scripts/migrate-sqlserver.js` en el repo original). Opcional para un cliente nuevo si no va a hacer una carga masiva inicial desde otro sistema.

## `resguardos`
Custodia de activos por empleado.

| Columna | Tipo | Notas |
|---|---|---|
| **id_resguardo** 🔑 | SERIAL | |
| folio | VARCHAR(50) | |
| nomina | VARCHAR(30) | referencia informal a `empleados.nomina`, sin FK |
| numero_inventario | VARCHAR(50) | NOT NULL, referencia informal a `activos.numero_inventario`, sin FK |
| fecha | TIMESTAMPTZ | default now() |
| estatus | BOOLEAN | default true |
| id_usuario | INTEGER | quién generó el resguardo, sin FK declarada |

## `bienes_inmuebles`
Patrimonio inmobiliario, incluye datos de escritura.

| Columna | Tipo | Notas |
|---|---|---|
| **id** 🔑 | SERIAL | |
| numero_inventario | VARCHAR(50) | UNIQUE, NOT NULL |
| nombre, descripcion | texto | |
| id_tipo_inmueble | INTEGER | FK → `tipos_inmueble.id` |
| direccion | TEXT | NOT NULL |
| colonia, codigo_postal | texto | |
| municipio | VARCHAR(100) | default `'San Juan del Río'` — **cambiar para otro cliente** |
| estado | VARCHAR(100) | default `'Querétaro'` — **cambiar para otro cliente** |
| latitud, longitud | DECIMAL | |
| superficie_terreno, superficie_construccion | DECIMAL(12,2) | |
| niveles | SMALLINT | |
| uso_actual | VARCHAR(100) | |
| numero_escritura, notaria, volumen_libro, folio_registro, clave_catastral | texto | datos de escritura |
| fecha_escritura, fecha_adquisicion | DATE | |
| valor_catastral, valor_comercial, costo_adquisicion | DECIMAL(14,2) | |
| id_cta_contable | SMALLINT | FK → `ctas_contables.id_ctacontable` |
| responsable_nomina | VARCHAR(20) | referencia informal a `empleados.nomina` |
| estatus | SMALLINT | default 1 |
| observaciones | TEXT | |
| escritura_url | TEXT | ruta/URL del PDF — en la demo Trinium apunta a Supabase Storage; para self-hosted, cambia a lo que decida el cliente (disco local, S3, etc.) |
| fecha_registro, fecha_modificacion | TIMESTAMPTZ | `fecha_modificacion` se auto-actualiza con el trigger `trigger_update_inmueble_modified` |

## `revision_sesiones`
Sesiones de levantamiento físico de inventario (escaneo de códigos).

| Columna | Tipo | Notas |
|---|---|---|
| **id** 🔑 | UUID | default `gen_random_uuid()` (requiere extensión `pgcrypto`) |
| id_usuario | SMALLINT | NOT NULL, quién hace la revisión |
| mode | VARCHAR(50) | default `'responsable'` |
| responsable_id, responsable_nombre, responsable_tipo | texto | a quién/qué se revisa |
| expected | JSONB | lista esperada, default `[]` |
| scans | JSONB | lo escaneado, default `[]` |
| notes | TEXT | |
| estatus | VARCHAR(20) | default `'activa'` |
| created_at, updated_at | TIMESTAMPTZ | `updated_at` se auto-actualiza con el trigger `trg_revision_sesiones_updated_at` |

## `audit_logs`
Bitácora de toda acción del sistema (quién cambió qué, cuándo).

| Columna | Tipo | Notas |
|---|---|---|
| **id** 🔑 | BIGSERIAL | |
| tabla | VARCHAR(100) | NOT NULL — nombre de la tabla afectada |
| registro_id | VARCHAR(100) | NOT NULL |
| accion | VARCHAR(20) | NOT NULL — CREATE / UPDATE / DELETE |
| campo, valor_anterior, valor_nuevo | texto | detalle del cambio |
| id_usuario | INTEGER | NOT NULL, sin FK declarada |
| usuario, nombre_usuario | texto | copia desnormalizada, no depende de que el usuario siga existiendo |
| ip_address | VARCHAR(50) | |
| created_at | TIMESTAMPTZ | default now() |

## `empleados`
Catálogo de nómina. En la demo Trinium convive con un webservice SOAP legado (`SOAP_EMPLEADOS_URL`) — decidir para el cliente nuevo cuál es la fuente real.

| Columna | Tipo | Notas |
|---|---|---|
| **nomina** 🔑 | TEXT | número de nómina, es la PK (no hay id numérico separado) |
| nombre | TEXT | NOT NULL |
| departamento, puesto | TEXT | |
| activo | TEXT | default `'A'` — 'A'=Activo, 'B'=Baja |

## `modulos`
Catálogo de módulos del sidebar, para el sistema de permisos granular. Seed completo (13 filas) en `database/migration_modulos.sql`.

| Columna | Tipo | Notas |
|---|---|---|
| **id_modulo** 🔑 | SERIAL | |
| clave | VARCHAR(50) | UNIQUE, NOT NULL — igual al slug de la URL, ej. `'almacen'` |
| nombre | VARCHAR(100) | NOT NULL |
| grupo | VARCHAR(50) | NOT NULL — 'INVENTARIO' \| 'GESTIÓN' \| 'SISTEMA' |
| orden | SMALLINT | default 0 |

## `usuario_modulos`
Asignación M:N usuario ↔ módulo, con permiso de ver/editar por separado.

| Columna | Tipo | Notas |
|---|---|---|
| id_usuario | INTEGER | FK → `usuarios.id_usuario` ON DELETE CASCADE — parte de la PK compuesta |
| id_modulo | INTEGER | FK → `modulos.id_modulo` ON DELETE CASCADE — parte de la PK compuesta |
| puede_ver | BOOLEAN | default true |
| puede_editar | BOOLEAN | default false |

**PK compuesta:** (`id_usuario`, `id_modulo`).

## Relaciones (FK reales en la base)

```
activos.clasificacion        → clasificacion.id_clasificacion
activos.id_cta_contable       → ctas_contables.id_ctacontable
bienes_inmuebles.id_tipo_inmueble  → tipos_inmueble.id
bienes_inmuebles.id_cta_contable   → ctas_contables.id_ctacontable
usuario_modulos.id_usuario    → usuarios.id_usuario  (CASCADE)
usuario_modulos.id_modulo     → modulos.id_modulo    (CASCADE)
```

Todo lo demás que "parece" relación (`resguardos.nomina`/`activos.ultimo_nomina` → `empleados.nomina`, `resguardos.numero_inventario` → `activos.numero_inventario`, `audit_logs.id_usuario` → `usuarios.id_usuario`) es una relación de **aplicación**, no de base de datos — no hay FK declarada. Así está hoy en la base real (verificado por introspección); si para un cliente nuevo se prefiere reforzarlo con FKs de verdad, es una decisión a tomar aparte, no algo que este schema asuma.
