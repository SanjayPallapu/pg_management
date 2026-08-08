-- Profiles approved by the legacy verifier only changed verification_status.
-- Keep the primary status consistent so owner badges and detail pages show the
-- green completed/verified state immediately.
UPDATE public.tenant_onboarding_profiles
SET status = 'verified',
    verified_at = COALESCE(verified_at, updated_at, now())
WHERE verification_status = 'verified'
  AND status <> 'verified';
