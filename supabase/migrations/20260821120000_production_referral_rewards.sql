-- Server-authoritative referral program. Codes, attribution and rewards must never
-- be trusted from browser storage.
CREATE TABLE IF NOT EXISTS public.referral_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^PGHUB-[A-Z0-9]{10}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'rewarded', 'cancelled')),
  reward_days integer NOT NULL DEFAULT 30 CHECK (reward_days = 30),
  applied_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_status_idx
  ON public.referrals (referrer_id, status);

ALTER TABLE public.referral_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their referral profile" ON public.referral_profiles;
CREATE POLICY "Users view their referral profile" ON public.referral_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users view their referral activity" ON public.referrals;
CREATE POLICY "Users view their referral activity" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referee_id = auth.uid());

CREATE OR REPLACE FUNCTION public.ensure_referral_profile(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF p_user_id IS NULL OR (auth.role() <> 'service_role' AND p_user_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT code INTO v_code FROM public.referral_profiles WHERE user_id = p_user_id;
  IF v_code IS NULL THEN
    v_code := 'PGHUB-' || upper(substr(md5(p_user_id::text), 1, 10));
    INSERT INTO public.referral_profiles (user_id, code)
    VALUES (p_user_id, v_code)
    ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING code INTO v_code;
  END IF;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_code := public.ensure_referral_profile(v_user);

  RETURN jsonb_build_object(
    'referralCode', v_code,
    'totalInvited', (SELECT count(*) FROM public.referrals WHERE referrer_id = v_user),
    'activePaidReferrals', (SELECT count(*) FROM public.referrals WHERE referrer_id = v_user AND status = 'rewarded'),
    'freeMonthsEarned', (SELECT coalesce(sum(reward_days), 0) / 30 FROM public.referrals WHERE referrer_id = v_user AND status = 'rewarded'),
    'maxMonthsPerYear', 12,
    'appliedReferralCode', (SELECT code FROM public.referrals WHERE referee_id = v_user LIMIT 1),
    'appliedStatus', (SELECT status FROM public.referrals WHERE referee_id = v_user LIMIT 1)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code text := upper(trim(p_code));
  v_referrer uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_code !~ '^PGHUB-[A-Z0-9]{10}$' THEN RAISE EXCEPTION 'Enter a valid PG HUB referral code'; END IF;

  SELECT user_id INTO v_referrer FROM public.referral_profiles WHERE code = v_code;
  IF v_referrer IS NULL THEN RAISE EXCEPTION 'Referral code not found'; END IF;
  IF v_referrer = v_user THEN RAISE EXCEPTION 'You cannot refer your own account'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referee_id = v_user) THEN
    RAISE EXCEPTION 'A referral code is already linked to this account';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = v_user
      AND payment_approved_at IS NOT NULL
      AND coalesce(features->>'billing_cycle', '') <> 'trial'
  ) THEN
    RAISE EXCEPTION 'Referral codes must be applied before the first paid subscription';
  END IF;

  INSERT INTO public.referrals (referrer_id, referee_id, code)
  VALUES (v_referrer, v_user, v_code);
  RETURN jsonb_build_object('success', true, 'code', v_code, 'status', 'applied');
END;
$$;

-- Called only by trusted payment processing after a real (non-mandate) charge.
-- Idempotency is provided by the applied -> rewarded state transition.
CREATE OR REPLACE FUNCTION public.reward_referral_conversion(p_referee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referee_id = p_referee_id AND status = 'applied'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  UPDATE public.referrals
  SET status = 'rewarded', converted_at = now()
  WHERE id = v_referral.id AND status = 'applied';

  -- The newly paying friend and the referrer each receive thirty bonus days.
  UPDATE public.subscriptions
  SET expires_at = greatest(coalesce(expires_at, now()), now()) + interval '30 days',
      status = 'active', updated_at = now()
  WHERE user_id IN (v_referral.referrer_id, v_referral.referee_id);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_referral_profile(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_referral_dashboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_referral_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reward_referral_conversion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_referral_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_referral_profile(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reward_referral_conversion(uuid) TO service_role;

-- Indexes used by the largest owner views and voice queries.
CREATE INDEX IF NOT EXISTS pgs_owner_active_idx ON public.pgs (owner_id) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS rooms_pg_id_idx ON public.rooms (pg_id);
CREATE INDEX IF NOT EXISTS tenants_room_active_idx ON public.tenants (room_id, is_locked, end_date);
CREATE INDEX IF NOT EXISTS tenant_payments_tenant_period_idx ON public.tenant_payments (tenant_id, year, month);
