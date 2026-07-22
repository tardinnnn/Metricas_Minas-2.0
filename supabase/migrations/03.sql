
CREATE POLICY "auth read notas" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notas-fiscais');
CREATE POLICY "auth upload notas" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas-fiscais');
CREATE POLICY "auth update notas" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'notas-fiscais');
CREATE POLICY "auth delete notas" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notas-fiscais' AND public.can_edit(auth.uid()));
