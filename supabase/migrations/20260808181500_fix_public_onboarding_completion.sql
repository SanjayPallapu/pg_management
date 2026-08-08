-- Make public onboarding uploads work whether the browser is signed out (anon)
-- or already has an authenticated owner/staff session.
DROP POLICY IF EXISTS "Public token-scoped onboarding uploads" ON storage.objects;
CREATE POLICY "Public token-scoped onboarding uploads"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'tenant-onboarding-docs'
  AND is_valid_onboarding_upload_token((storage.foldername(name))[1])
);

-- Rules are property-owned data. Existing clients keep their local fallback and
-- sync it here when the owner opens the Rules screen.
ALTER TABLE public.pgs
  ADD COLUMN IF NOT EXISTS onboarding_rules JSONB NOT NULL DEFAULT '[]'::JSONB;

-- The deployed internal save function selected output-column names without a
-- table qualifier. Because `status` is also an OUT parameter, PostgreSQL raised
-- 42702 on every auto-save and final submit.
CREATE OR REPLACE FUNCTION public.save_onboarding_form_data_internal(
  p_token TEXT,
  p_form_data JSONB,
  p_step TEXT DEFAULT NULL,
  p_progress INTEGER DEFAULT NULL,
  p_submit BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (success BOOLEAN, status TEXT, verification_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_profile RECORD;
  v_new_status TEXT;
  v_result_status TEXT;
  v_result_verification TEXT;
  v_first_submit BOOLEAN := FALSE;
BEGIN
  SELECT l.* INTO v_link
  FROM tenant_onboarding_links l
  WHERE l.token = p_token AND l.status NOT IN ('revoked', 'expired')
  LIMIT 1;

  IF v_link.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT p.* INTO v_profile
  FROM tenant_onboarding_profiles p
  WHERE p.tenant_id = v_link.tenant_id;

  IF v_profile.id IS NULL THEN
    INSERT INTO tenant_onboarding_profiles (tenant_id, pg_id, owner_id, status)
    VALUES (v_link.tenant_id, v_link.pg_id, v_link.owner_id, 'form_started')
    RETURNING * INTO v_profile;
  END IF;

  v_new_status := CASE WHEN p_submit THEN 'profile_completed' ELSE 'form_started' END;
  v_first_submit := p_submit AND v_link.status <> 'completed';

  IF v_link.status IN ('viewed', 'sent') THEN
    UPDATE tenant_onboarding_links l
      SET status = 'started', started_at = COALESCE(l.started_at, now())
      WHERE l.id = v_link.id;
    INSERT INTO tenant_onboarding_timeline (tenant_id, pg_id, event_type, event_description)
      VALUES (v_link.tenant_id, v_link.pg_id, 'form_started', 'Tenant started filling the onboarding form');
    INSERT INTO tenant_onboarding_notifications (owner_id, tenant_id, pg_id, notification_type, title, message)
      VALUES (v_link.owner_id, v_link.tenant_id, v_link.pg_id, 'form_started', 'Onboarding Form Started', 'Your tenant has started filling the onboarding form.');
  END IF;

  UPDATE tenant_onboarding_profiles p SET
    full_name = COALESCE(NULLIF(p_form_data->>'full_name', ''), p.full_name),
    date_of_birth = CASE WHEN NULLIF(p_form_data->>'date_of_birth', '') IS NOT NULL THEN (p_form_data->>'date_of_birth')::DATE ELSE p.date_of_birth END,
    gender = COALESCE(NULLIF(p_form_data->>'gender', ''), p.gender),
    blood_group = COALESCE(NULLIF(p_form_data->>'blood_group', ''), p.blood_group),
    emergency_contact_name = COALESCE(NULLIF(p_form_data->>'emergency_contact_name', ''), p.emergency_contact_name),
    emergency_contact_phone = COALESCE(NULLIF(p_form_data->>'emergency_contact_phone', ''), p.emergency_contact_phone),
    id_proof_type = COALESCE(NULLIF(p_form_data->>'id_proof_type', ''), p.id_proof_type),
    id_proof_number = COALESCE(NULLIF(p_form_data->>'id_proof_number', ''), p.id_proof_number),
    id_proof_url = COALESCE(NULLIF(p_form_data->>'id_proof_url', ''), p.id_proof_url),
    email = COALESCE(NULLIF(p_form_data->>'email', ''), p.email),
    alternate_phone = COALESCE(NULLIF(p_form_data->>'alternate_phone', ''), p.alternate_phone),
    occupation = COALESCE(NULLIF(p_form_data->>'occupation', ''), p.occupation),
    company_name = COALESCE(NULLIF(p_form_data->>'company_name', ''), p.company_name),
    office_address = COALESCE(NULLIF(p_form_data->>'office_address', ''), p.office_address),
    payment_mode = COALESCE(NULLIF(p_form_data->>'payment_mode', ''), p.payment_mode),
    upi_id = COALESCE(NULLIF(p_form_data->>'upi_id', ''), p.upi_id),
    bank_account_number = COALESCE(NULLIF(p_form_data->>'bank_account_number', ''), p.bank_account_number),
    ifsc_code = COALESCE(NULLIF(p_form_data->>'ifsc_code', ''), p.ifsc_code),
    bank_name = COALESCE(NULLIF(p_form_data->>'bank_name', ''), p.bank_name),
    food_preference = COALESCE(NULLIF(p_form_data->>'food_preference', ''), p.food_preference),
    dietary_restrictions = COALESCE(NULLIF(p_form_data->>'dietary_restrictions', ''), p.dietary_restrictions),
    rules_acknowledged = CASE WHEN p_form_data ? 'rules_acknowledged' THEN (p_form_data->>'rules_acknowledged')::BOOLEAN ELSE p.rules_acknowledged END,
    agreement_accepted = CASE WHEN p_form_data ? 'agreement_accepted' THEN (p_form_data->>'agreement_accepted')::BOOLEAN ELSE p.agreement_accepted END,
    agreement_signed_at = CASE WHEN p_form_data ? 'agreement_accepted' AND (p_form_data->>'agreement_accepted')::BOOLEAN THEN now() ELSE p.agreement_signed_at END,
    form_progress = COALESCE(p_progress, p.form_progress),
    last_saved_step = COALESCE(p_step, p.last_saved_step),
    status = v_new_status,
    completed_at = CASE WHEN p_submit THEN COALESCE(p.completed_at, now()) ELSE p.completed_at END
  WHERE p.tenant_id = v_link.tenant_id;

  IF p_submit THEN
    UPDATE tenant_onboarding_links l SET
      status = 'completed',
      submitted_at = COALESCE(l.submitted_at, now()),
      completed_at = COALESCE(l.completed_at, now())
    WHERE l.id = v_link.id;

    IF v_first_submit THEN
      INSERT INTO tenant_onboarding_timeline (tenant_id, pg_id, event_type, event_description)
      VALUES
        (v_link.tenant_id, v_link.pg_id, 'profile_completed', 'Tenant completed and submitted the onboarding form'),
        (v_link.tenant_id, v_link.pg_id, 'documents_uploaded', 'Tenant uploaded Aadhaar verification');
      INSERT INTO tenant_onboarding_notifications (owner_id, tenant_id, pg_id, notification_type, title, message)
      VALUES
        (v_link.owner_id, v_link.tenant_id, v_link.pg_id, 'form_submitted', 'Onboarding Form Submitted', 'Your tenant has submitted the onboarding form.'),
        (v_link.owner_id, v_link.tenant_id, v_link.pg_id, 'profile_completed', 'Profile Completed', 'Tenant profile is ready for review.'),
        (v_link.owner_id, v_link.tenant_id, v_link.pg_id, 'verification_pending', 'Verification Pending', 'Tenant Aadhaar verification is pending.');
    END IF;
  END IF;

  SELECT p.status, p.verification_status
    INTO v_result_status, v_result_verification
  FROM tenant_onboarding_profiles p
  WHERE p.tenant_id = v_link.tenant_id;

  RETURN QUERY SELECT TRUE, v_result_status, COALESCE(v_result_verification, 'pending');
END;
$$;

-- Extend validation with property identity and its own rules.
DROP FUNCTION IF EXISTS public.validate_onboarding_link(TEXT);
CREATE FUNCTION public.validate_onboarding_link(p_token TEXT)
RETURNS TABLE (
  link_id UUID, tenant_id UUID, pg_id UUID, link_status TEXT, is_expired BOOLEAN,
  onboarding_status TEXT, verification_status TEXT, form_progress INTEGER,
  tenant_name TEXT, tenant_phone TEXT, form_data JSONB, last_saved_step TEXT,
  room_number TEXT, bed_label TEXT, move_in_date DATE, monthly_rent INTEGER,
  security_deposit_amount INTEGER, pg_name TEXT, pg_rules JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_profile RECORD;
  v_tenant RECORD;
  v_pg RECORD;
BEGIN
  SELECT l.* INTO v_link FROM tenant_onboarding_links l
  WHERE l.token = p_token AND l.status <> 'revoked' LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_link.expires_at < now() AND v_link.status <> 'completed' THEN
    UPDATE tenant_onboarding_links l SET status = 'expired' WHERE l.id = v_link.id;
    RETURN QUERY SELECT v_link.id, v_link.tenant_id, v_link.pg_id, 'expired'::TEXT,
      TRUE, NULL::TEXT, NULL::TEXT, 0, NULL::TEXT, NULL::TEXT, '{}'::JSONB,
      NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::INTEGER, NULL::INTEGER,
      NULL::TEXT, '[]'::JSONB;
    RETURN;
  END IF;

  IF v_link.status = 'sent' THEN
    UPDATE tenant_onboarding_links l SET status = 'viewed', viewed_at = now() WHERE l.id = v_link.id;
    UPDATE tenant_onboarding_profiles p SET status = 'link_viewed'
      WHERE p.tenant_id = v_link.tenant_id AND p.status = 'link_sent';
    INSERT INTO tenant_onboarding_timeline (tenant_id, pg_id, event_type, event_description)
      VALUES (v_link.tenant_id, v_link.pg_id, 'link_viewed', 'Tenant viewed the onboarding link');
    INSERT INTO tenant_onboarding_notifications (owner_id, tenant_id, pg_id, notification_type, title, message)
      VALUES (v_link.owner_id, v_link.tenant_id, v_link.pg_id, 'link_viewed', 'Onboarding Link Viewed', 'Your tenant viewed the onboarding link.');
  END IF;

  SELECT p.* INTO v_profile FROM tenant_onboarding_profiles p WHERE p.tenant_id = v_link.tenant_id;
  SELECT t.*, r.room_no INTO v_tenant FROM tenants t JOIN rooms r ON r.id = t.room_id WHERE t.id = v_link.tenant_id;
  SELECT p.name, p.onboarding_rules INTO v_pg FROM pgs p WHERE p.id = v_link.pg_id;

  RETURN QUERY SELECT v_link.id, v_link.tenant_id, v_link.pg_id,
    (SELECT l.status FROM tenant_onboarding_links l WHERE l.id = v_link.id), FALSE,
    COALESCE(v_profile.status, 'not_started'), COALESCE(v_profile.verification_status, 'pending'),
    COALESCE(v_profile.form_progress, 0), v_tenant.name, v_tenant.phone,
    to_jsonb(v_profile) - 'id' - 'tenant_id' - 'pg_id' - 'owner_id' - 'verified_by',
    v_profile.last_saved_step, v_tenant.room_no::TEXT, 'Assigned bed'::TEXT,
    v_tenant.start_date, v_tenant.monthly_rent, v_tenant.security_deposit_amount,
    COALESCE(v_pg.name, 'Your PG'), COALESCE(v_pg.onboarding_rules, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_onboarding_link(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_onboarding_form_data_internal(TEXT, JSONB, TEXT, INTEGER, BOOLEAN) TO service_role;
REVOKE EXECUTE ON FUNCTION public.save_onboarding_form_data_internal(TEXT, JSONB, TEXT, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
