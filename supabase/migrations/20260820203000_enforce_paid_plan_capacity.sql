-- Apply the published Basic / Plus / Pro account-wide capacity limits.
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, plan, status, max_pgs, max_tenants_per_pg, features, expires_at
  ) VALUES (
    NEW.id,
    'promax',
    'active',
    4,
    500,
    '{"billing_cycle":"trial","included_tenants":500,"tenant_limit_scope":"account","auto_reminders":true,"daily_reports":true,"ai_logo":true}'::jsonb,
    now() + interval '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

UPDATE public.subscriptions
SET
  max_pgs = CASE
    WHEN COALESCE(features->>'billing_cycle', '') IN ('promax', 'promax_yearly') THEN 4
    WHEN COALESCE(features->>'billing_cycle', '') IN ('pro', 'pro_yearly') THEN 2
    WHEN COALESCE(features->>'billing_cycle', '') IN ('monthly', 'yearly') THEN 1
    WHEN COALESCE(features->>'billing_cycle', '') = 'trial' THEN 4
    ELSE max_pgs
  END,
  max_tenants_per_pg = CASE
    WHEN COALESCE(features->>'billing_cycle', '') IN ('promax', 'promax_yearly') THEN 500
    WHEN COALESCE(features->>'billing_cycle', '') IN ('pro', 'pro_yearly') THEN 200
    WHEN COALESCE(features->>'billing_cycle', '') IN ('monthly', 'yearly') THEN 100
    WHEN COALESCE(features->>'billing_cycle', '') = 'trial' THEN 500
    ELSE max_tenants_per_pg
  END,
  features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(
    'included_tenants', CASE
      WHEN COALESCE(features->>'billing_cycle', '') IN ('promax', 'promax_yearly', 'trial') THEN 500
      WHEN COALESCE(features->>'billing_cycle', '') IN ('pro', 'pro_yearly') THEN 200
      WHEN COALESCE(features->>'billing_cycle', '') IN ('monthly', 'yearly') THEN 100
      ELSE max_tenants_per_pg
    END,
    'tenant_limit_scope', 'account'
  )
WHERE status IN ('active', 'pending');

COMMENT ON COLUMN public.subscriptions.max_tenants_per_pg IS
  'Legacy column name. For current paid plans this stores the account-wide active tenant allowance.';

CREATE OR REPLACE FUNCTION public.enforce_pg_subscription_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := 1;
  v_count integer;
BEGIN
  SELECT s.max_pgs INTO v_limit
  FROM public.subscriptions s
  WHERE s.user_id = NEW.owner_id
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1;

  v_limit := COALESCE(v_limit, 1);
  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_count
  FROM public.pgs p
  WHERE p.owner_id = NEW.owner_id
    AND (TG_OP = 'INSERT' OR p.id <> NEW.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Your subscription allows a maximum of % PG properties', v_limit
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pg_subscription_capacity_trigger ON public.pgs;
CREATE TRIGGER enforce_pg_subscription_capacity_trigger
BEFORE INSERT OR UPDATE OF owner_id ON public.pgs
FOR EACH ROW EXECUTE FUNCTION public.enforce_pg_subscription_capacity();

CREATE OR REPLACE FUNCTION public.enforce_tenant_subscription_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_limit integer := 10;
  v_count integer;
BEGIN
  -- Exited/locked tenants remain in history without consuming active capacity.
  IF COALESCE(NEW.is_locked, false) OR (NEW.end_date IS NOT NULL AND NEW.end_date <= current_date) THEN
    RETURN NEW;
  END IF;

  SELECT p.owner_id INTO v_owner_id
  FROM public.rooms r
  JOIN public.pgs p ON p.id = r.pg_id
  WHERE r.id = NEW.room_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Room does not belong to a valid PG property' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.max_tenants_per_pg INTO v_limit
  FROM public.subscriptions s
  WHERE s.user_id = v_owner_id
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1;

  v_limit := COALESCE(v_limit, 10);
  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_count
  FROM public.tenants t
  JOIN public.rooms r ON r.id = t.room_id
  JOIN public.pgs p ON p.id = r.pg_id
  WHERE p.owner_id = v_owner_id
    AND NOT COALESCE(t.is_locked, false)
    AND (t.end_date IS NULL OR t.end_date > current_date)
    AND (TG_OP = 'INSERT' OR t.id <> NEW.id);

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Your subscription includes a maximum of % active tenants across all PGs', v_limit
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_subscription_capacity_trigger ON public.tenants;
CREATE TRIGGER enforce_tenant_subscription_capacity_trigger
BEFORE INSERT OR UPDATE OF room_id, end_date, is_locked ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_subscription_capacity();

REVOKE ALL ON FUNCTION public.enforce_pg_subscription_capacity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_tenant_subscription_capacity() FROM PUBLIC;
