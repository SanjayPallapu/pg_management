-- Restrict sensitive onboarding operations to the owning authenticated user,
-- stop exposing the link table to anonymous SELECTs, and keep one Aadhaar
-- document record synchronized with the profile's single upload path.

DROP POLICY IF EXISTS "public_read_onboarding_links_by_token" ON public.tenant_onboarding_links;

CREATE OR REPLACE FUNCTION public.verify_tenant_onboarding(
  p_tenant_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL,
  p_verifier_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, verification_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.tenant_onboarding_profiles%ROWTYPE;
  v_new_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR p_verifier_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to review this onboarding profile'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.* INTO v_profile
  FROM public.tenant_onboarding_profiles p
  WHERE p.tenant_id = p_tenant_id
    AND p.owner_id = auth.uid();

  IF v_profile.id IS NULL THEN
    RAISE EXCEPTION 'Onboarding profile not found for this owner'
      USING ERRCODE = '42501';
  END IF;

  IF p_action = 'approve' THEN
    v_new_status := 'verified';
    UPDATE public.tenant_onboarding_profiles
    SET status = 'verified', verification_status = 'verified',
        verified_at = now(), verified_by = auth.uid()
    WHERE id = v_profile.id;

    UPDATE public.tenant_onboarding_documents
    SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = NULL
    WHERE onboarding_profile_id = v_profile.id;
  ELSIF p_action = 'reject' THEN
    IF NULLIF(btrim(p_rejection_reason), '') IS NULL THEN
      RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023';
    END IF;
    v_new_status := 'rejected';
    UPDATE public.tenant_onboarding_profiles
    SET status = 'rejected', verification_status = 'rejected'
    WHERE id = v_profile.id;

    UPDATE public.tenant_onboarding_documents
    SET status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = p_rejection_reason
    WHERE onboarding_profile_id = v_profile.id;
  ELSIF p_action = 'request_reupload' THEN
    IF NULLIF(btrim(p_rejection_reason), '') IS NULL THEN
      RAISE EXCEPTION 'Re-upload instructions are required' USING ERRCODE = '22023';
    END IF;
    v_new_status := 're_upload_requested';
    UPDATE public.tenant_onboarding_profiles
    SET verification_status = 're_upload_requested'
    WHERE id = v_profile.id;

    UPDATE public.tenant_onboarding_documents
    SET status = 're_upload_requested', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = p_rejection_reason
    WHERE onboarding_profile_id = v_profile.id;
  ELSE
    RAISE EXCEPTION 'Unsupported verification action' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tenant_onboarding_timeline
    (tenant_id, pg_id, onboarding_profile_id, event_type, event_description)
  VALUES
    (p_tenant_id, v_profile.pg_id, v_profile.id,
     CASE WHEN p_action = 'request_reupload' THEN 're_upload_requested' ELSE v_new_status END,
     CASE
       WHEN p_action = 'approve' THEN 'Tenant onboarding verified by owner'
       WHEN p_action = 'reject' THEN 'Tenant onboarding rejected: ' || p_rejection_reason
       ELSE 'Owner requested Aadhaar re-upload: ' || p_rejection_reason
     END);

  RETURN QUERY SELECT TRUE, v_new_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_tenant_onboarding(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_tenant_onboarding(UUID, TEXT, TEXT, UUID) TO authenticated;

-- Retain only the newest record for a tenant/document type before enforcing
-- the one-Aadhaar invariant.
DELETE FROM public.tenant_onboarding_documents d
USING public.tenant_onboarding_documents newer
WHERE d.tenant_id = newer.tenant_id
  AND d.document_type = newer.document_type
  AND (d.uploaded_at, d.id) < (newer.uploaded_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_document_per_type
  ON public.tenant_onboarding_documents (tenant_id, document_type);

CREATE OR REPLACE FUNCTION public.sync_onboarding_aadhaar_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id_proof_url IS NOT NULL AND NEW.id_proof_url <> '' THEN
    INSERT INTO public.tenant_onboarding_documents (
      onboarding_profile_id, tenant_id, document_type, document_name,
      file_url, status, uploaded_at
    ) VALUES (
      NEW.id, NEW.tenant_id, 'aadhaar', 'Aadhaar card',
      NEW.id_proof_url, 'pending', now()
    )
    ON CONFLICT (tenant_id, document_type) DO UPDATE
    SET onboarding_profile_id = EXCLUDED.onboarding_profile_id,
        document_name = EXCLUDED.document_name,
        file_url = EXCLUDED.file_url,
        status = 'pending',
        rejection_reason = NULL,
        reviewed_at = NULL,
        reviewed_by = NULL,
        uploaded_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_onboarding_aadhaar_document ON public.tenant_onboarding_profiles;
CREATE TRIGGER trg_sync_onboarding_aadhaar_document
AFTER INSERT OR UPDATE OF id_proof_url ON public.tenant_onboarding_profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_onboarding_aadhaar_document();

INSERT INTO public.tenant_onboarding_documents (
  onboarding_profile_id, tenant_id, document_type, document_name,
  file_url, status, uploaded_at
)
SELECT p.id, p.tenant_id, 'aadhaar', 'Aadhaar card', p.id_proof_url,
       CASE WHEN p.verification_status = 'verified' THEN 'approved' ELSE 'pending' END,
       COALESCE(p.completed_at, p.updated_at, now())
FROM public.tenant_onboarding_profiles p
WHERE p.id_proof_url IS NOT NULL AND p.id_proof_url <> ''
ON CONFLICT (tenant_id, document_type) DO UPDATE
SET onboarding_profile_id = EXCLUDED.onboarding_profile_id,
    file_url = EXCLUDED.file_url,
    document_name = EXCLUDED.document_name;
