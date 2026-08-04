-- ============================================================
-- INVENTORY-CLOUD — Schema completo para PostgreSQL puro
-- Ejecutar en orden, en una base de datos vacía llamada "inventory"
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. EXTENSIONES
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- para gen_random_uuid()

-- ─────────────────────────────────────────────
-- 2. CATÁLOGOS (sin dependencias externas)
-- ─────────────────────────────────────────────

CREATE TABLE clasificacion (
    id_clasificacion SERIAL PRIMARY KEY,
    clasificacion    VARCHAR(200),
    estatus          SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE consignas (
    id_consigna INTEGER PRIMARY KEY,
    consigna    VARCHAR(300),
    estatus     SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE ctas_contables (
    id_ctacontable       INTEGER PRIMARY KEY,
    cta_contable         VARCHAR(50),
    descripcion          VARCHAR(300),
    estatus              SMALLINT NOT NULL DEFAULT 1,
    id_clasificacion_cta INTEGER
);

CREATE TABLE tipos_inmueble (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Datos iniciales de tipos de inmueble
INSERT INTO tipos_inmueble (nombre) VALUES
    ('Edificio Administrativo'),
    ('Centro Comunitario'),
    ('Mercado Municipal'),
    ('Bodega'),
    ('Terreno'),
    ('Estacionamiento'),
    ('Parque'),
    ('Unidad Deportiva'),
    ('Escuela'),
    ('Clínica/Centro de Salud');

-- ─────────────────────────────────────────────
-- 3. USUARIOS
-- ─────────────────────────────────────────────

CREATE TABLE usuarios (
    id_usuario    SERIAL PRIMARY KEY,
    nombre        VARCHAR(200),
    usuario       VARCHAR(100),
    password      TEXT,         -- campo legacy (se migra a hash automáticamente en login)
    password_hash TEXT,         -- bcrypt hash
    permisos      SMALLINT      -- 1=SuperAdmin, 2=Editor, 3=Consulta
);

-- ─────────────────────────────────────────────
-- 4. ACTIVOS (bienes muebles + enseres)
-- ─────────────────────────────────────────────

CREATE TABLE activos (
    id_consecutivo   SERIAL PRIMARY KEY,
    numero_inventario VARCHAR(50),
    descripcion      TEXT,
    marca            VARCHAR(100),
    modelo           VARCHAR(100),
    numero_serie     VARCHAR(100),
    clasificacion    INTEGER REFERENCES clasificacion(id_clasificacion),
    id_cta_contable  INTEGER REFERENCES ctas_contables(id_ctacontable),
    costo            NUMERIC(14, 2),
    f_alta           TIMESTAMPTZ,
    f_factura        DATE,
    folio_factura    VARCHAR(100),
    estatus          SMALLINT DEFAULT 1,  -- 0=BAJA, 1=ACTIVO, 2=MANT, 3=PRE-BAJA
    tipo             SMALLINT,            -- 1=Bien Mueble, 2=Enser
    ultimo_nomina    VARCHAR(30),
    observaciones    TEXT
);

-- Índice único parcial: número de inventario único solo en activos NO dados de baja
CREATE UNIQUE INDEX idx_activos_numero_inventario_unique
    ON activos(numero_inventario)
    WHERE numero_inventario IS NOT NULL AND estatus != 0;

-- ─────────────────────────────────────────────
-- 5. ACTIVOS_STG (tabla de staging para importación masiva)
--    Todas las columnas son TEXT para aceptar cualquier dato crudo
-- ─────────────────────────────────────────────

CREATE TABLE activos_stg (
    id_consecutivo    TEXT,
    numero_inventario TEXT,
    descripcion       TEXT,
    marca             TEXT,
    modelo            TEXT,
    numero_serie      TEXT,
    clasificacion     TEXT,
    id_cta_contable   TEXT,
    costo             TEXT,
    f_alta            TEXT,
    f_factura         TEXT,
    folio_factura     TEXT,
    estatus           TEXT,
    tipo              TEXT,
    ultimo_nomina     TEXT,
    observaciones     TEXT
);

-- ─────────────────────────────────────────────
-- 6. RESGUARDOS (custodia de activos)
-- ─────────────────────────────────────────────

CREATE TABLE resguardos (
    id_resguardo     SERIAL PRIMARY KEY,
    folio            VARCHAR(50),
    nomina           VARCHAR(30),
    numero_inventario VARCHAR(50) NOT NULL,
    fecha            TIMESTAMPTZ DEFAULT NOW(),
    estatus          BOOLEAN DEFAULT TRUE,
    id_usuario       INTEGER
);

-- ─────────────────────────────────────────────
-- 7. BIENES INMUEBLES
-- ─────────────────────────────────────────────

CREATE TABLE bienes_inmuebles (
    id                       SERIAL PRIMARY KEY,
    numero_inventario        VARCHAR(50) UNIQUE NOT NULL,
    nombre                   VARCHAR(200),
    descripcion              TEXT,
    id_tipo_inmueble         INTEGER REFERENCES tipos_inmueble(id),
    direccion                TEXT NOT NULL,
    colonia                  VARCHAR(100),
    codigo_postal            VARCHAR(10),
    municipio                VARCHAR(100) DEFAULT 'San Juan del Río',
    estado                   VARCHAR(100) DEFAULT 'Querétaro',
    latitud                  DECIMAL(10, 8),
    longitud                 DECIMAL(11, 8),
    superficie_terreno       DECIMAL(12, 2),
    superficie_construccion  DECIMAL(12, 2),
    niveles                  SMALLINT,
    uso_actual               VARCHAR(100),
    numero_escritura         VARCHAR(50),
    fecha_escritura          DATE,
    notaria                  VARCHAR(200),
    volumen_libro            VARCHAR(50),
    folio_registro           VARCHAR(50),
    clave_catastral          VARCHAR(50),
    valor_catastral          DECIMAL(14, 2),
    valor_comercial          DECIMAL(14, 2),
    costo_adquisicion        DECIMAL(14, 2),
    fecha_adquisicion        DATE,
    id_cta_contable          SMALLINT REFERENCES ctas_contables(id_ctacontable),
    responsable_nomina       VARCHAR(20),
    estatus                  SMALLINT DEFAULT 1,
    observaciones            TEXT,
    escritura_url            TEXT,
    fecha_registro           TIMESTAMPTZ DEFAULT NOW(),
    fecha_modificacion       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inmuebles_inventario ON bienes_inmuebles(numero_inventario);
CREATE INDEX idx_inmuebles_direccion  ON bienes_inmuebles(direccion);
CREATE INDEX idx_inmuebles_tipo       ON bienes_inmuebles(id_tipo_inmueble);
CREATE INDEX idx_inmuebles_estatus    ON bienes_inmuebles(estatus);

-- Trigger: actualiza fecha_modificacion automáticamente al hacer UPDATE
CREATE OR REPLACE FUNCTION update_inmueble_modified()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_modificacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inmueble_modified
    BEFORE UPDATE ON bienes_inmuebles
    FOR EACH ROW
    EXECUTE FUNCTION update_inmueble_modified();

-- ─────────────────────────────────────────────
-- 8. REVISION_SESIONES (levantamiento físico de inventario)
-- ─────────────────────────────────────────────

CREATE TABLE revision_sesiones (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario         SMALLINT NOT NULL,
    mode               VARCHAR(50) NOT NULL DEFAULT 'responsable',
    responsable_id     VARCHAR(255),
    responsable_nombre VARCHAR(500),
    responsable_tipo   VARCHAR(50),
    expected           JSONB NOT NULL DEFAULT '[]'::jsonb,
    scans              JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes              TEXT,
    estatus            VARCHAR(20) NOT NULL DEFAULT 'activa',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revision_sesiones_usuario_estatus
    ON revision_sesiones(id_usuario, estatus);

-- Trigger: actualiza updated_at automáticamente al hacer UPDATE
CREATE OR REPLACE FUNCTION update_revision_sesion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_revision_sesiones_updated_at
    BEFORE UPDATE ON revision_sesiones
    FOR EACH ROW
    EXECUTE FUNCTION update_revision_sesion_updated_at();

-- ─────────────────────────────────────────────
-- 9. AUDIT_LOGS (registro de toda acción del sistema)
-- ─────────────────────────────────────────────

CREATE TABLE audit_logs (
    id             BIGSERIAL PRIMARY KEY,
    tabla          VARCHAR(100)  NOT NULL,
    registro_id    VARCHAR(100)  NOT NULL,
    accion         VARCHAR(20)   NOT NULL,  -- CREATE | UPDATE | DELETE
    campo          VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo    TEXT,
    id_usuario     INT           NOT NULL,
    usuario        VARCHAR(100)  NOT NULL,
    nombre_usuario VARCHAR(255),
    ip_address     VARCHAR(50),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tabla_registro ON audit_logs(tabla, registro_id);
CREATE INDEX idx_audit_logs_created_at     ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_usuario        ON audit_logs(id_usuario);

-- ─────────────────────────────────────────────
-- FIN DEL SCHEMA
-- ─────────────────────────────────────────────
-- Tablas creadas: clasificacion, consignas, ctas_contables, tipos_inmueble,
--                 usuarios, activos, activos_stg, resguardos,
--                 bienes_inmuebles, revision_sesiones, audit_logs
-- Triggers: trigger_update_inmueble_modified, trg_revision_sesiones_updated_at
-- Índices: 9 índices (1 UNIQUE parcial en activos, 8 normales)
