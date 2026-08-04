CREATE POLICY "Allow read usuarios"
  ON public.usuarios FOR SELECT
  USING (true);

CREATE POLICY "Allow insert usuarios"
  ON public.usuarios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update usuarios"
  ON public.usuarios FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete usuarios"
  ON public.usuarios FOR DELETE
  USING (true);