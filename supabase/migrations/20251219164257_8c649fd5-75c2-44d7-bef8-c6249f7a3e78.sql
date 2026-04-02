-- Criar bucket para assets de branding
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Política para upload (apenas admins autenticados)
CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding');

-- Política para atualização (apenas admins autenticados)
CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding');

-- Política para deleção (apenas admins autenticados)
CREATE POLICY "Admins can delete branding assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding');

-- Política para visualização pública
CREATE POLICY "Anyone can view branding assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'branding');