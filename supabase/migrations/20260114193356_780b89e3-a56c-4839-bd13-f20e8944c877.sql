-- Eliminar políticas RESTRICTIVE existentes
DROP POLICY IF EXISTS "Permitir insertar bienes_inmuebles" ON bienes_inmuebles;
DROP POLICY IF EXISTS "Permitir actualizar bienes_inmuebles" ON bienes_inmuebles;
DROP POLICY IF EXISTS "Permitir eliminar bienes_inmuebles" ON bienes_inmuebles;
DROP POLICY IF EXISTS "Permitir lectura de bienes_inmuebles" ON bienes_inmuebles;

-- Crear nuevas políticas PERMISSIVE (acceso público temporal)
CREATE POLICY "Permitir lectura bienes_inmuebles" 
  ON bienes_inmuebles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Permitir insertar bienes_inmuebles" 
  ON bienes_inmuebles 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar bienes_inmuebles" 
  ON bienes_inmuebles 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir eliminar bienes_inmuebles" 
  ON bienes_inmuebles 
  FOR DELETE 
  USING (true);