-- Migration: Make tenant-onboarding-docs storage bucket public
-- Fixes "Bucket not found" / "NoSuchBucket" 404 errors on preview and public document loading.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tenant-onboarding-docs',
  'tenant-onboarding-docs',
  true,
  8388608,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 8388608,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow public SELECT access on tenant-onboarding-docs bucket
DROP POLICY IF EXISTS "Allow read access to tenant onboarding documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read tenant onboarding documents" ON storage.objects;

CREATE POLICY "Public read tenant onboarding documents" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'tenant-onboarding-docs');
