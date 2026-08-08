-- Include property branding in the token-scoped public onboarding contract.
DROP FUNCTION IF EXISTS public.validate_onboarding_link(TEXT);
CREATE FUNCTION public.validate_onboarding_link(p_token TEXT)
RETURNS TABLE (
  link_id UUID, tenant_id UUID, pg_id UUID, link_status TEXT, is_expired BOOLEAN,
  onboarding_status TEXT, verification_status TEXT, form_progress INTEGER,
  tenant_name TEXT, tenant_phone TEXT, form_data JSONB, last_saved_step TEXT,
  room_number TEXT, bed_label TEXT, move_in_date DATE, monthly_rent INTEGER,
  security_deposit_amount INTEGER, pg_name TEXT, pg_rules JSONB, pg_logo_url TEXT
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
      NULL::TEXT, '[]'::JSONB, NULL::TEXT;
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
  SELECT p.name, p.onboarding_rules, p.logo_url INTO v_pg FROM pgs p WHERE p.id = v_link.pg_id;

  RETURN QUERY SELECT v_link.id, v_link.tenant_id, v_link.pg_id,
    (SELECT l.status FROM tenant_onboarding_links l WHERE l.id = v_link.id), FALSE,
    COALESCE(v_profile.status, 'not_started'), COALESCE(v_profile.verification_status, 'pending'),
    COALESCE(v_profile.form_progress, 0), v_tenant.name, v_tenant.phone,
    to_jsonb(v_profile) - 'id' - 'tenant_id' - 'pg_id' - 'owner_id' - 'verified_by',
    v_profile.last_saved_step, v_tenant.room_no::TEXT, 'Assigned bed'::TEXT,
    v_tenant.start_date, v_tenant.monthly_rent, v_tenant.security_deposit_amount,
    COALESCE(v_pg.name, 'Your PG'), COALESCE(v_pg.onboarding_rules, '[]'::JSONB),
    v_pg.logo_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_onboarding_link(TEXT) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
