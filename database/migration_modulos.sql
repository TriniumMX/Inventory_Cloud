-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Sistema granular de permisos por módulo
-- Ejecutar UNA VEZ sobre la base de datos existente (no toca tablas existentes)
-- ─────────────────────────────────────────────────────────────────────────────

-- Catálogo de módulos (uno por opción del sidebar)
CREATE TABLE IF NOT EXISTS modulos (
    id_modulo SERIAL      PRIMARY KEY,
    clave     VARCHAR(50) NOT NULL UNIQUE,   -- igual al slug de la URL, ej. 'almacen'
    nombre    VARCHAR(100) NOT NULL,
    grupo     VARCHAR(50) NOT NULL,           -- 'INVENTARIO' | 'GESTIÓN' | 'SISTEMA'
    orden     SMALLINT    NOT NULL DEFAULT 0  -- orden dentro del grupo
);

-- Asignación M:N usuario ↔ módulo
CREATE TABLE IF NOT EXISTS usuario_modulos (
    id_usuario   INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_modulo    INTEGER NOT NULL REFERENCES modulos(id_modulo)   ON DELETE CASCADE,
    puede_ver    BOOLEAN NOT NULL DEFAULT TRUE,
    puede_editar BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id_usuario, id_modulo)
);

CREATE INDEX IF NOT EXISTS idx_usuario_modulos_usuario ON usuario_modulos(id_usuario);

-- ── Seed: catálogo completo de módulos ────────────────────────────────────────
INSERT INTO modulos (clave, nombre, grupo, orden) VALUES
  -- INVENTARIO
  ('bienes-muebles',   'Bienes Muebles',    'INVENTARIO', 1),
  ('bienes-inmuebles', 'Bienes Inmuebles',  'INVENTARIO', 2),
  ('enseres',          'Enseres',           'INVENTARIO', 3),
  -- GESTIÓN
  ('almacen',          'Almacén',           'GESTIÓN',    1),
  ('resguardos',       'Resguardos',        'GESTIÓN',    2),
  ('pre-baja',         'Pre-Baja',          'GESTIÓN',    3),
  ('empleados-baja',   'Empleados de Baja', 'GESTIÓN',    4),
  ('revisiones',       'Revisiones',        'GESTIÓN',    5),
  ('reportes',         'Reportes',          'GESTIÓN',    6),
  -- SISTEMA
  ('usuarios',         'Usuarios',          'SISTEMA',    1),
  ('auditoria',        'Bitácora',          'SISTEMA',    2),
  ('configuracion',    'Configuración',     'SISTEMA',    3),
  ('permisos',         'Permisos',          'SISTEMA',    4)
ON CONFLICT (clave) DO NOTHING;
