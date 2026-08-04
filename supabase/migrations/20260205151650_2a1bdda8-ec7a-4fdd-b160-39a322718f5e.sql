-- Agregar columna para URL de escritura
ALTER TABLE bienes_inmuebles 
ADD COLUMN IF NOT EXISTS escritura_url TEXT;

-- Crear bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('escrituras', 'escrituras', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket
CREATE POLICY "Permitir lectura escrituras" ON storage.objects
FOR SELECT USING (bucket_id = 'escrituras');

CREATE POLICY "Permitir subir escrituras" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'escrituras');

CREATE POLICY "Permitir eliminar escrituras" ON storage.objects
FOR DELETE USING (bucket_id = 'escrituras');