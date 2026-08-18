-- Fix onboarding link validation and generation to handle whitespace, missing rooms, and proper token refresh
CREATE OR REPLACE FUNCTION public.validate_onboarding_link(p_token text)
 RETURNS TABLE(
   link_id uuid,
   tenant_id uuid,
   pg_id uuid,
   link_status text,
   is_expired boolean,
   onboarding_status text,
   verification_status text,
   form_progress integer,
   tenant_name text,
   tenant_phone text,
   form_data jsonb,
   last_saved_step text,
   room_number text,
   bed_label text,
   move_in_date date,
   monthly_rent integer,
   security_deposit_amount integer,
   pg_name text,
   pg_rules jsonb,
   pg_logo_url text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_link RECORD;
  v_profile RECORD;
  v_tenant RECORD;
  v_pg RECORD;
  v_clean_token TEXT;
BEGIN
  v_clean_token := TRIM(p_token);

  SELECT l.* INTO v_link
  FROM tenant_onboarding_links l
  WHERE TRIM(l.token) = v_clean_token
    AND l.status <> 'revoked'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_link.expires_at < now() AND v_link.status <> 'completed' THEN
    UPDATE tenant_onboarding_links l
    SET status = 'expired'
    WHERE l.id = v_link.id;

    RETURN QUERY SELECT
      v_link.id,
      v_link.tenant_id,
      v_link.pg_id,
      'expired'::TEXT,
      TRUE,
      NULL::TEXT,
      NULL::TEXT,
      0,
      NULL::TEXT,
      NULL::TEXT,
      '{}'::JSONB,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::DATE,
      NULL::INTEGER,
      NULL::INTEGER,
      NULL::TEXT,
      '[]'::JSONB,
      NULL::TEXT;
    RETURN;
  END IF;

  IF v_link.status = 'sent' THEN
    UPDATE tenant_onboarding_links l
    SET status = 'viewed', viewed_at = now()
    WHERE l.id = v_link.id;

    UPDATE tenant_onboarding_profiles p
    SET status = 'link_viewed'
    WHERE p.tenant_id = v_link.tenant_id AND p.status = 'link_sent';

    INSERT INTO tenant_onboarding_timeline (tenant_id, pg_id, event_type, event_description)
    VALUES (v_link.tenant_id, v_link.pg_id, 'link_viewed', 'Tenant viewed the onboarding link');

    INSERT INTO tenant_onboarding_notifications (owner_id, tenant_id, pg_id, notification_type, title, message)
    VALUES (v_link.owner_id, v_link.tenant_id, v_link.pg_id, 'link_viewed', 'Onboarding Link Viewed', 'Your tenant viewed the onboarding link.');
  END IF;

  SELECT p.* INTO v_profile
  FROM tenant_onboarding_profiles p
  WHERE p.tenant_id = v_link.tenant_id;

  SELECT t.*, COALESCE(r.room_no, 'Assigned room') as room_no
  INTO v_tenant
  FROM tenants t
  LEFT JOIN rooms r ON r.id = t.room_id
  WHERE t.id = v_link.tenant_id;

  SELECT p.name, p.onboarding_rules, p.logo_url
  INTO v_pg
  FROM pgs p
  WHERE p.id = v_link.pg_id;

  RETURN QUERY SELECT
    v_link.id,
    v_link.tenant_id,
    v_link.pg_id,
    (SELECT l.status FROM tenant_onboarding_links l WHERE l.id = v_link.id),
    FALSE,
    COALESCE(v_profile.status, 'not_started'),
    COALESCE(v_profile.verification_status, 'pending'),
    COALESCE(v_profile.form_progress, 0),
    COALESCE(v_tenant.name, ''),
    COALESCE(v_tenant.phone, ''),
    to_jsonb(v_profile) - 'id' - 'tenant_id' - 'pg_id' - 'owner_id' - 'verified_by',
    v_profile.last_saved_step,
    COALESCE(v_tenant.room_no::TEXT, 'Assigned room'),
    'Assigned bed'::TEXT,
    v_tenant.start_date,
    v_tenant.monthly_rent,
    v_tenant.security_deposit_amount,
    COALESCE(v_pg.name, 'Your PG'),
    COALESCE(v_pg.onboarding_rules, '[]'::JSONB),
    v_pg.logo_url;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_onboarding_link(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_onboarding_link(
  p_tenant_id uuid,
  p_pg_id uuid,
  p_owner_id uuid,
  p_sent_via text DEFAULT 'whatsapp'::text
)
RETURNS TABLE(id uuid, token text, status text, expires_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_existing_link RECORD;
  v_new_id UUID;
  v_new_token TEXT;
  v_status TEXT;
  v_expires TIMESTAMPTZ;
  v_created_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Not authorized to generate this onboarding link'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pgs p WHERE p.id = p_pg_id AND p.owner_id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'PG does not belong to this owner'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM tenants t
    LEFT JOIN rooms r ON r.id = t.room_id
    WHERE t.id = p_tenant_id
      AND (r.pg_id = p_pg_id OR r.pg_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'Tenant does not belong to this PG'
      USING ERRCODE = '42501';
  END IF;

  SELECT l.* INTO v_existing_link
  FROM tenant_onboarding_links l
  WHERE l.tenant_id = p_tenant_id
    AND l.status NOT IN ('expired', 'revoked', 'completed')
    AND l.expires_at > now()
  ORDER BY l.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE tenant_onboarding_links l
    SET status = 'sent', sent_via = p_sent_via, sent_at = now()
    WHERE l.id = v_existing_link.id
    RETURNING l.id, l.token, l.status, l.expires_at, l.created_at
      INTO v_new_id, v_new_token, v_status, v_expires, v_created_at;
  ELSE
    INSERT INTO tenant_onboarding_links (
      tenant_id, pg_id, owner_id, status, sent_via, sent_at, expires_at
    ) VALUES (
      p_tenant_id, p_pg_id, p_owner_id, 'sent', p_sent_via, now(), now() + interval '7 days'
    )
    RETURNING tenant_onboarding_links.id, tenant_onboarding_links.token,
      tenant_onboarding_links.status, tenant_onboarding_links.expires_at,
      tenant_onboarding_links.created_at
      INTO v_new_id, v_new_token, v_status, v_expires, v_created_at;
  END IF;

  INSERT INTO tenant_onboarding_profiles (tenant_id, pg_id, owner_id, status)
  VALUES (p_tenant_id, p_pg_id, p_owner_id, 'link_sent')
  ON CONFLICT (tenant_id) DO UPDATE
  SET status = CASE
    WHEN tenant_onboarding_profiles.status = 'not_started' THEN 'link_sent'
    ELSE tenant_onboarding_profiles.status
  END,
  updated_at = now();

  RETURN QUERY SELECT v_new_id, v_new_token, v_status, v_expires, v_created_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.generate_onboarding_link(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_onboarding_link(UUID, UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_onboarding_form_data_internal(
  p_token text,
  p_form_data jsonb,
  p_step text DEFAULT NULL::text,
  p_progress integer DEFAULT NULL::integer,
  p_submit boolean DEFAULT false
)
RETURNS TABLE(success boolean, status text, verification_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_link RECORD;
  v_profile RECORD;
  v_new_status TEXT;
  v_result_status TEXT;
  v_result_verification TEXT;
  v_first_submit BOOLEAN := FALSE;
  v_clean_token TEXT;
BEGIN
  v_clean_token := TRIM(p_token);

  SELECT l.* INTO v_link
  FROM tenant_onboarding_links l
  WHERE TRIM(l.token) = v_clean_token AND l.status NOT IN ('revoked', 'expired')
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
$function$;

GRANT EXECUTE ON FUNCTION public.save_onboarding_form_data_internal(TEXT, JSONB, TEXT, INTEGER, BOOLEAN) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_onboarding_form_data(
  p_token text,
  p_form_data jsonb,
  p_step text DEFAULT NULL::text,
  p_progress integer DEFAULT NULL::integer,
  p_submit boolean DEFAULT false
)
RETURNS TABLE(success boolean, status text, verification_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_link RECORD;
  v_profile_id UUID;
  v_path TEXT;
  v_clean_token TEXT;
BEGIN
  v_clean_token := TRIM(p_token);

  RETURN QUERY SELECT * FROM save_onboarding_form_data_internal(
    v_clean_token,
    p_form_data - 'stay_purpose' - 'expected_stay_duration' - 'move_in_date'
      - 'room_number' - 'bed_label' - 'monthly_rent' - 'security_deposit_amount',
    p_step, p_progress, p_submit
  );

  SELECT * INTO v_link FROM tenant_onboarding_links WHERE TRIM(token) = v_clean_token LIMIT 1;
  IF v_link.id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_profile_id FROM tenant_onboarding_profiles WHERE tenant_id = v_link.tenant_id;

  IF p_form_data ? 'id_proof_url' THEN
    v_path := p_form_data->>'id_proof_url';
    IF v_path <> '' AND v_profile_id IS NOT NULL THEN
      INSERT INTO tenant_onboarding_documents (onboarding_profile_id, tenant_id, document_type, document_name, file_url)
      VALUES (v_profile_id, v_link.tenant_id, 'aadhaar', 'Aadhaar card', v_path)
      ON CONFLICT (tenant_id, document_type) DO UPDATE
      SET file_url = EXCLUDED.file_url,
          onboarding_profile_id = EXCLUDED.onboarding_profile_id;
    END IF;
  END IF;

  IF p_form_data ? 'address_proof_url' THEN
    v_path := p_form_data->>'address_proof_url';
    IF v_path <> '' AND v_profile_id IS NOT NULL THEN
      INSERT INTO tenant_onboarding_documents (onboarding_profile_id, tenant_id, document_type, document_name, file_url)
      VALUES (v_profile_id, v_link.tenant_id, 'address_proof', 'Address proof', v_path)
      ON CONFLICT (tenant_id, document_type) DO UPDATE
      SET file_url = EXCLUDED.file_url,
          onboarding_profile_id = EXCLUDED.onboarding_profile_id;
    END IF;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.save_onboarding_form_data(TEXT, JSONB, TEXT, INTEGER, BOOLEAN) TO anon, authenticated;
