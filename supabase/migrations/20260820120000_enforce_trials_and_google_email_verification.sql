-- Every account gets one time-limited trial. There is no permanent free app access.
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, plan, status, max_pgs, max_tenants_per_pg, features, expires_at
  ) VALUES (
    NEW.id,
    'pro',
    'active',
    -1,
    -1,
    '{"billing_cycle":"trial","auto_reminders":true,"daily_reports":true,"ai_logo":true}'::jsonb,
    now() + interval '7 days'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Convert legacy no-expiry free accounts into their original seven-day trial.
-- Accounts older than seven days become expired immediately.
UPDATE public.subscriptions
SET
  plan = 'pro',
  status = CASE
    WHEN created_at + interval '7 days' > now() THEN 'active'::public.subscription_status
    ELSE 'expired'::public.subscription_status
  END,
  max_pgs = -1,
  max_tenants_per_pg = -1,
  features = COALESCE(features, '{}'::jsonb) ||
    '{"billing_cycle":"trial","auto_reminders":true,"daily_reports":true,"ai_logo":true}'::jsonb,
  expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL
  AND (status = 'free' OR plan = 'free');

-- Custom second-step verification for new Google OAuth accounts. The client
-- may read its own status but only the service-role Edge Function can write it.
CREATE TABLE IF NOT EXISTS public.google_email_verifications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text,
  expires_at timestamptz,
  resend_available_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their Google email verification" ON public.google_email_verifications;
CREATE POLICY "Users can view their Google email verification"
ON public.google_email_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users who existed before this security step remain verified. New Google
-- accounts must complete the emailed code screen.
INSERT INTO public.google_email_verifications (user_id, email, verified_at)
SELECT id, email, now()
FROM auth.users
WHERE email IS NOT NULL
  AND (
    raw_app_meta_data->>'provider' = 'google'
    OR COALESCE(raw_app_meta_data->'providers', '[]'::jsonb) ? 'google'
  )
ON CONFLICT (user_id) DO NOTHING;
