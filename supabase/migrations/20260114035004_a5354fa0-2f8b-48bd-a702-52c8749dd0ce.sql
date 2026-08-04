-- Crear tabla de catálogo de tipos de inmueble
CREATE TABLE tipos_inmueble (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Insertar tipos comunes de inmuebles municipales
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

-- Crear tabla principal de bienes inmuebles
CREATE TABLE bienes_inmuebles (
    id SERIAL PRIMARY KEY,
    numero_inventario VARCHAR(50) UNIQUE NOT NULL,
    
    -- Identificación del inmueble
    nombre VARCHAR(200),
    descripcion TEXT,
    id_tipo_inmueble INTEGER REFERENCES tipos_inmueble(id),
    
    -- Ubicación
    direccion TEXT NOT NULL,
    colonia VARCHAR(100),
    codigo_postal VARCHAR(10),
    municipio VARCHAR(100) DEFAULT 'San Juan del Río',
    estado VARCHAR(100) DEFAULT 'Querétaro',
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    
    -- Características físicas
    superficie_terreno DECIMAL(12, 2),
    superficie_construccion DECIMAL(12, 2),
    niveles SMALLINT,
    uso_actual VARCHAR(100),
    
    -- Documentación legal
    numero_escritura VARCHAR(50),
    fecha_escritura DATE,
    notaria VARCHAR(200),
    volumen_libro VARCHAR(50),
    folio_registro VARCHAR(50),
    clave_catastral VARCHAR(50),
    
    -- Valor y contabilidad
    valor_catastral DECIMAL(14, 2),
    valor_comercial DECIMAL(14, 2),
    costo_adquisicion DECIMAL(14, 2),
    fecha_adquisicion DATE,
    id_cta_contable SMALLINT REFERENCES ctas_contables(id_ctacontable),
    
    -- Responsable
    responsable_nomina VARCHAR(20),
    
    -- Control
    estatus SMALLINT DEFAULT 1,
    observaciones TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    fecha_modificacion TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_inmuebles_inventario ON bienes_inmuebles(numero_inventario);
CREATE INDEX idx_inmuebles_direccion ON bienes_inmuebles(direccion);
CREATE INDEX idx_inmuebles_tipo ON bienes_inmuebles(id_tipo_inmueble);
CREATE INDEX idx_inmuebles_estatus ON bienes_inmuebles(estatus);

-- Habilitar RLS
ALTER TABLE tipos_inmueble ENABLE ROW LEVEL SECURITY;
ALTER TABLE bienes_inmuebles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tipos_inmueble (catálogo de solo lectura)
CREATE POLICY "Permitir lectura de tipos_inmueble"
ON tipos_inmueble FOR SELECT
TO authenticated
USING (true);

-- Políticas RLS para bienes_inmuebles
CREATE POLICY "Permitir lectura de bienes_inmuebles"
ON bienes_inmuebles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir insertar bienes_inmuebles"
ON bienes_inmuebles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir actualizar bienes_inmuebles"
ON bienes_inmuebles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir eliminar bienes_inmuebles"
ON bienes_inmuebles FOR DELETE
TO authenticated
USING (true);

-- Trigger para actualizar fecha_modificacion automáticamente
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