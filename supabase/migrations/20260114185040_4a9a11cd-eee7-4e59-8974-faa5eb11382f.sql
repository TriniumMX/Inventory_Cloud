-- Agregar índice único para numero_inventario
CREATE UNIQUE INDEX idx_activos_numero_inventario_unique 
ON activos(numero_inventario) 
WHERE numero_inventario IS NOT NULL AND estatus != 0;