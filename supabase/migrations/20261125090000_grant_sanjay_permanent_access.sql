-- Permanent no-cost access for the explicitly named owner account.
-- This mirrors the client allowlist in src/lib/subscriptionAccess.ts and is
-- deliberately exact so no other account on the same email domain is affected.

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_exempt_owner boolean := lower(trim(coalesce(NEW.email, ''))) = 'sanjaypallapuu@gmail.com';
BEGIN
  INSERT INTO public.subscriptions (
    user_id, plan, status, max_pgs, max_tenants_per_pg, features, expires_at
  ) VALUES (
    NEW.id,
    CASE WHEN is_exempt_owner THEN 'pro' ELSE 'promax' END,
    'active',
    CASE WHEN is_exempt_owner THEN -1 ELSE 4 END,
    CASE WHEN is_exempt_owner THEN -1 ELSE 500 END,
    CASE
      WHEN is_exempt_owner THEN
        '{"billing_cycle":"lifetime","included_tenants":-1,"tenant_limit_scope":"account","auto_reminders":true,"daily_reports":true,"ai_logo":true}'::jsonb
      ELSE
        '{"billing_cycle":"trial","included_tenants":500,"tenant_limit_scope":"account","auto_reminders":true,"daily_reports":true,"ai_logo":true}'::jsonb
    END,
    CASE WHEN is_exempt_owner THEN NULL ELSE now() + interval '7 days' END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Apply the entitlement immediately when this account already exists.
UPDATE public.subscriptions AS subscription
SET
  plan = 'pro',
  status = 'active',
  max_pgs = -1,
  max_tenants_per_pg = -1,
  features = coalesce(subscription.features, '{}'::jsonb) ||
    '{"billing_cycle":"lifetime","included_tenants":-1,"tenant_limit_scope":"account","auto_reminders":true,"daily_reports":true,"ai_logo":true}'::jsonb,
  expires_at = NULL
FROM auth.users AS account
WHERE subscription.user_id = account.id
  AND lower(trim(coalesce(account.email, ''))) = 'sanjaypallapuu@gmail.com';

-- Defensive fallback for an account created while the normal signup trigger was unavailable.
INSERT INTO public.subscriptions (
  user_id, plan, status, max_pgs, max_tenants_per_pg, features, expires_at
)
SELECT
  account.id,
  'pro',
  'active',
  -1,
  -1,
  '{"billing_cycle":"lifetime","included_tenants":-1,"tenant_limit_scope":"account","auto_reminders":true,"daily_reports":true,"ai_logo":true}'::jsonb,
  NULL
FROM auth.users AS account
WHERE lower(trim(coalesce(account.email, ''))) = 'sanjaypallapuu@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
