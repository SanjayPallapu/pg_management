-- Migration: Fix onboarding document storage access policies and owns_onboarding_upload_token
-- Allows signed URLs and public URL lookups for uploaded tenant onboarding documents.

CREATE OR REPLACE FUNCTION owns_onboarding_upload_token(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. Check if token matches active or historical link owned by user
  IF EXISTS (
    SELECT 1 FROM tenant_onboarding_links l
    WHERE (l.token = p_token OR l.id::text = p_token)
      AND l.owner_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check if path belongs to a document for a tenant in a PG owned by auth.uid()
  IF EXISTS (
    SELECT 1 FROM tenant_onboarding_documents d
    JOIN tenants t ON t.id = d.tenant_id
    JOIN pgs p ON p.id = t.pg_id
    WHERE p.owner_id = auth.uid()
      AND (d.file_url LIKE p_token || '/%' OR d.file_url = p_token)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Check if path belongs to an onboarding profile for a tenant in a PG owned by auth.uid()
  IF EXISTS (
    SELECT 1 FROM tenant_onboarding_profiles prof
    JOIN tenants t ON t.id = prof.tenant_id
    JOIN pgs p ON p.id = t.pg_id
    WHERE p.owner_id = auth.uid()
      AND (prof.id_proof_url LIKE p_token || '/%' OR prof.id_proof_url = p_token)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Fallback: check if auth.uid() is an active owner in pgs
  IF EXISTS (
    SELECT 1 FROM pgs p WHERE p.owner_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION owns_onboarding_upload_token(TEXT) TO authenticated, anon;

-- Drop existing storage SELECT policies to prevent conflicts
DROP POLICY IF EXISTS "Owners read their tenant onboarding documents" ON storage.objects;
DROP POLICY IF EXISTS "Public token-scoped onboarding downloads" ON storage.objects;

-- Create read policy for tenant-onboarding-docs bucket
CREATE POLICY "Allow read access to tenant onboarding documents" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'tenant-onboarding-docs');
