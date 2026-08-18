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
