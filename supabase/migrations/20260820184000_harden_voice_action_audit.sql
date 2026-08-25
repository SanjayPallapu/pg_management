-- Audit mutations are performed only by the trusted Edge Function service role.
DROP POLICY IF EXISTS "Owners can create their voice action audit" ON public.voice_action_audit;
DROP POLICY IF EXISTS "Owners can update their voice action audit" ON public.voice_action_audit;

ALTER TABLE public.voice_action_audit
  DROP CONSTRAINT IF EXISTS voice_action_audit_status_check;
ALTER TABLE public.voice_action_audit
  ADD CONSTRAINT voice_action_audit_status_check
  CHECK (status IN (
    'pending', 'executing', 'completed', 'cancelled', 'expired',
    'failed', 'undoing', 'undone'
  ));

COMMENT ON COLUMN public.voice_action_audit.status IS
  'Atomic lifecycle state; executing/undoing prevent duplicate confirmation and reversal.';
