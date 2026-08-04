-- Enable RLS on all tables
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resguardos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clasificacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ctas_contables ENABLE ROW LEVEL SECURITY;

-- USUARIOS: No public policies - only edge functions with service role can access
-- This protects user credentials from direct access

-- CATALOG TABLES (read-only for all authenticated requests)
CREATE POLICY "Allow read clasificacion" ON public.clasificacion
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow read consignas" ON public.consignas
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow read ctas_contables" ON public.ctas_contables
  FOR SELECT TO anon, authenticated USING (true);

-- ACTIVOS: Full CRUD for authenticated app users
CREATE POLICY "Allow read activos" ON public.activos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow insert activos" ON public.activos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow update activos" ON public.activos
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete activos" ON public.activos
  FOR DELETE TO anon, authenticated USING (true);

-- RESGUARDOS: Full CRUD for authenticated app users
CREATE POLICY "Allow read resguardos" ON public.resguardos
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow insert resguardos" ON public.resguardos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow update resguardos" ON public.resguardos
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete resguardos" ON public.resguardos
  FOR DELETE TO anon, authenticated USING (true);