-- ============================================================================
-- Fix: generate_onboarding_link RETURNING/INTO column mismatch
-- The original function's RETURNING ... INTO clauses returned 5 columns
-- (id, token, status, expires_at, created_at) into only 3 variables,
-- causing "query has too many columns" errors and onboarding link
-- generation failures.
-- ============================================================================
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
AS $$
DECLARE
  v_existing_link RECORD;
  v_new_id UUID;
  v_new_token TEXT;
  v_status TEXT;
  v_expires TIMESTAMPTZ;
  v_created_at TIMESTAMPTZ;
BEGIN
  -- Check if there's an active (non-expired, non-revoked) link
  SELECT * INTO v_existing_link
  FROM tenant_onboarding_links
  WHERE tenant_id = p_tenant_id
  AND status NOT IN ('expired', 'revoked')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_link IS NOT NULL AND v_existing_link.expires_at > now() THEN
    -- Update existing link
    UPDATE tenant_onboarding_links
    SET status = 'sent', sent_via = p_sent_via, sent_at = now()
    WHERE id = v_existing_link.id
    RETURNING id, token, status, expires_at, created_at
    INTO v_new_id, v_new_token, v_status, v_expires, v_created_at;
  ELSE
    -- Create new link
    v_expires := now() + interval '7 days';
    INSERT INTO tenant_onboarding_links (tenant_id, pg_id, owner_id, status, sent_via, sent_at, expires_at)
    VALUES (p_tenant_id, p_pg_id, p_owner_id, 'sent', p_sent_via, now(), v_expires)
    RETURNING id, token, status, expires_at, created_at
    INTO v_new_id, v_new_token, v_status, v_expires, v_created_at;
  END IF;

  -- Ensure an onboarding profile exists
  INSERT INTO tenant_onboarding_profiles (tenant_id, pg_id, owner_id, status)
  VALUES (p_tenant_id, p_pg_id, p_owner_id, 'link_sent')
  ON CONFLICT (tenant_id) DO UPDATE
  SET status = CASE
    WHEN tenant_onboarding_profiles.status = 'not_started' THEN 'link_sent'
    ELSE tenant_onboarding_profiles.status
  END,
  updated_at = now();

  -- Add timeline event
  INSERT INTO tenant_onboarding_timeline (tenant_id, pg_id, event_type, event_description)
  VALUES (p_tenant_id, p_pg_id, 'link_shared', 'Onboarding link shared via ' || p_sent_via);

  RETURN QUERY SELECT v_new_id, v_new_token, v_status, v_expires, v_created_at;
END;
$$;
