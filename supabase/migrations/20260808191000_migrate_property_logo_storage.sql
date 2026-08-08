-- Property branding belongs to the real project and its own public bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pg-logos', 'pg-logos', TRUE, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users upload PG logos" ON storage.objects;
CREATE POLICY "Authenticated users upload PG logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pg-logos');

DROP POLICY IF EXISTS "Users update their PG logos" ON storage.objects;
CREATE POLICY "Users update their PG logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pg-logos' AND owner_id = auth.uid()::TEXT)
WITH CHECK (bucket_id = 'pg-logos' AND owner_id = auth.uid()::TEXT);

DROP POLICY IF EXISTS "Users delete their PG logos" ON storage.objects;
CREATE POLICY "Users delete their PG logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pg-logos' AND owner_id = auth.uid()::TEXT);

UPDATE public.pgs
SET logo_url = replace(
  logo_url,
  'https://mbawqixtfxfjrliudbwy.supabase.co/storage/v1/object/public/receipts/',
  'https://gyindhdxkfzkqlnfwkyb.supabase.co/storage/v1/object/public/pg-logos/'
)
WHERE logo_url LIKE 'https://mbawqixtfxfjrliudbwy.supabase.co/storage/v1/object/public/receipts/%';
