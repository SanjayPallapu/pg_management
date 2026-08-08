-- Public onboarding contract: return resumable data and owner-controlled stay details,
-- while never allowing the public form payload to overwrite stay information.
CREATE OR REPLACE FUNCTION validate_onboarding_link(p_token TEXT)
RETURNS TABLE (
  link_id UUID, tenant_id UUID, pg_id UUID, link_status TEXT, is_expired BOOLEAN,
  onboarding_status TEXT, verification_status TEXT, form_progress INTEGER,
  tenant_name TEXT, tenant_phone TEXT, form_data JSONB, last_saved_step TEXT,
  room_number TEXT, bed_label TEXT, move_in_date DATE, monthly_rent INTEGER,
  security_deposit_amount INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_link RECORD; v_profile RECORD; v_tenant RECORD;
BEGIN
  SELECT * INTO v_link FROM tenant_onboarding_links
  WHERE token = p_token AND status <> 'revoked' LIMIT 1;
  IF v_link IS NOT FOUND THEN RETURN; END IF;

  IF v_link.expires_at < now() AND v_link.status <> 'completed' THEN
    UPDATE tenant_onboarding_links SET status = 'expired' WHERE id = v_link.id;
    RETURN QUERY SELECT v_link.id, v_link.tenant_id, v_link.pg_id, 'expired'::TEXT,
      TRUE, NULL::TEXT, NULL::TEXT, 0, NULL::TEXT, NULL::TEXT, '{}'::JSONB,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_link.status = 'sent' THEN
    UPDATE tenant_onboarding_links SET status = 'viewed', viewed_at = now() WHERE id = v_link.id;
    UPDATE tenant_onboarding_profiles SET status = 'link_viewed'
      WHERE tenant_id = v_link.tenant_id AND status = 'link_sent';
    INSERT INTO tenant_onboarding_timeline (tenant_id, pg_id, event_type, event_description)
      VALUES (v_link.tenant_id, v_link.pg_id, 'link_viewed', 'Tenant viewed the onboarding link');
    INSERT INTO tenant_onboarding_notifications (owner_id, tenant_id, pg_id, notification_type, title, message)
      VALUES (v_link.owner_id, v_link.tenant_id, v_link.pg_id, 'link_viewed', 'Onboarding Link Viewed', 'Your tenant viewed the onboarding link.');
  END IF;

  SELECT * INTO v_profile FROM tenant_onboarding_profiles WHERE tenant_id = v_link.tenant_id;
  SELECT t.*, r.room_no INTO v_tenant FROM tenants t JOIN rooms r ON r.id = t.room_id WHERE t.id = v_link.tenant_id;

  RETURN QUERY SELECT v_link.id, v_link.tenant_id, v_link.pg_id,
    (SELECT l.status FROM tenant_onboarding_links l WHERE l.id = v_link.id), FALSE,
    COALESCE(v_profile.status, 'not_started'), COALESCE(v_profile.verification_status, 'pending'),
    COALESCE(v_profile.form_progress, 0), v_tenant.name, v_tenant.phone,
    to_jsonb(v_profile) - 'id' - 'tenant_id' - 'pg_id' - 'owner_id' - 'verified_by',
    v_profile.last_saved_step, v_tenant.room_no::TEXT, 'Assigned bed'::TEXT,
    v_tenant.start_date, v_tenant.monthly_rent, v_tenant.security_deposit_amount;
END;
$$;

-- Wrap the existing save RPC and strip owner-controlled keys before the original
-- implementation sees them. This protects against hand-crafted browser requests.
ALTER FUNCTION save_onboarding_form_data(TEXT, JSONB, TEXT, INTEGER, BOOLEAN)
  RENAME TO save_onboarding_form_data_internal;

CREATE FUNCTION save_onboarding_form_data(
  p_token TEXT, p_form_data JSONB, p_step TEXT DEFAULT NULL,
  p_progress INTEGER DEFAULT NULL, p_submit BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (success BOOLEAN, status TEXT, verification_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_link RECORD; v_profile_id UUID; v_path TEXT;
BEGIN
  RETURN QUERY SELECT * FROM save_onboarding_form_data_internal(
    p_token,
    p_form_data - 'stay_purpose' - 'expected_stay_duration' - 'move_in_date'
      - 'room_number' - 'bed_label' - 'monthly_rent' - 'security_deposit_amount',
    p_step, p_progress, p_submit
  );
  SELECT * INTO v_link FROM tenant_onboarding_links WHERE token = p_token LIMIT 1;
  SELECT id INTO v_profile_id FROM tenant_onboarding_profiles WHERE tenant_id = v_link.tenant_id;
  IF p_form_data ? 'id_proof_url' THEN
    v_path := p_form_data->>'id_proof_url';
    IF v_path <> '' AND NOT EXISTS (SELECT 1 FROM tenant_onboarding_documents WHERE tenant_id = v_link.tenant_id AND file_url = v_path) THEN
      INSERT INTO tenant_onboarding_documents (onboarding_profile_id, tenant_id, document_type, document_name, file_url)
      VALUES (v_profile_id, v_link.tenant_id, 'aadhaar', 'Aadhaar card', v_path);
    END IF;
  END IF;
  IF p_form_data ? 'address_proof_url' THEN
    v_path := p_form_data->>'address_proof_url';
    IF v_path <> '' AND NOT EXISTS (SELECT 1 FROM tenant_onboarding_documents WHERE tenant_id = v_link.tenant_id AND file_url = v_path) THEN
      INSERT INTO tenant_onboarding_documents (onboarding_profile_id, tenant_id, document_type, document_name, file_url)
      VALUES (v_profile_id, v_link.tenant_id, 'address_proof', 'Address proof', v_path);
    END IF;
  END IF;
END;
$$;

-- Private documents are stored by link token; access is granted through signed URLs in owner tooling.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tenant-onboarding-docs', 'tenant-onboarding-docs', false, 8388608,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 8388608,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public token-scoped onboarding uploads" ON storage.objects;
CREATE POLICY "Public token-scoped onboarding uploads" ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'tenant-onboarding-docs'
  AND EXISTS (SELECT 1 FROM tenant_onboarding_links l
    WHERE l.token = (storage.foldername(name))[1]
      AND l.status NOT IN ('expired','revoked','completed') AND l.expires_at > now())
);

DROP POLICY IF EXISTS "Owners read their tenant onboarding documents" ON storage.objects;
CREATE POLICY "Owners read their tenant onboarding documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tenant-onboarding-docs' AND EXISTS (
  SELECT 1 FROM tenant_onboarding_links l
  WHERE l.token = (storage.foldername(name))[1] AND l.owner_id = auth.uid()
));

GRANT EXECUTE ON FUNCTION validate_onboarding_link(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_onboarding_form_data(TEXT, JSONB, TEXT, INTEGER, BOOLEAN) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION save_onboarding_form_data_internal(TEXT, JSONB, TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
