-- Eliminar política existente que solo permite authenticated
DROP POLICY IF EXISTS "Permitir lectura de tipos_inmueble" ON tipos_inmueble;

-- Crear nueva política que permite lectura a todos (anon y authenticated)
CREATE POLICY "Permitir lectura pública de tipos_inmueble" 
ON tipos_inmueble
FOR SELECT
TO anon, authenticated
USING (true);