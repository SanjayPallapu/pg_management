-- Fix the production RPC which returned five columns into three variables.
-- Also verify the caller owns the PG/tenant before issuing a public token.
CREATE OR REPLACE FUNCTION generate_onboarding_link(
  p_tenant_id UUID,
  p_pg_id UUID,
  p_owner_id UUID,
  p_sent_via TEXT DEFAULT 'whatsapp'
)
RETURNS TABLE (
  id UUID,
  token TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    SELECT 1
    FROM tenants t
    JOIN rooms r ON r.id = t.room_id
    JOIN pgs p ON p.id = r.pg_id
    WHERE t.id = p_tenant_id
      AND p.id = p_pg_id
      AND p.owner_id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'Tenant does not belong to this PG owner'
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
$$;

REVOKE EXECUTE ON FUNCTION generate_onboarding_link(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_onboarding_link(UUID, UUID, UUID, TEXT) TO authenticated;
