-- Crear tabla revision_sesiones para persistir sesiones de revisión cross-device
CREATE TABLE public.revision_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario smallint NOT NULL,
  mode varchar(50) NOT NULL DEFAULT 'responsable',
  responsable_id varchar(255),
  responsable_nombre varchar(500),
  responsable_tipo varchar(50),
  expected jsonb NOT NULL DEFAULT '[]'::jsonb,
  scans jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  estatus varchar(20) NOT NULL DEFAULT 'activa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para buscar sesiones activas por usuario eficientemente
CREATE INDEX idx_revision_sesiones_usuario_estatus
  ON public.revision_sesiones (id_usuario, estatus);

-- Enable RLS
ALTER TABLE public.revision_sesiones ENABLE ROW LEVEL SECURITY;

-- RLS permisiva siguiendo el patrón del proyecto
CREATE POLICY "Allow read revision_sesiones"
  ON public.revision_sesiones FOR SELECT USING (true);

CREATE POLICY "Allow insert revision_sesiones"
  ON public.revision_sesiones FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update revision_sesiones"
  ON public.revision_sesiones FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete revision_sesiones"
  ON public.revision_sesiones FOR DELETE USING (true);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_revision_sesion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_revision_sesiones_updated_at
  BEFORE UPDATE ON public.revision_sesiones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_revision_sesion_updated_at();
