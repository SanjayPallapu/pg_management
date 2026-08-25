-- Durable confirmation, audit, and undo records for voice/typed assistant writes.
CREATE TABLE IF NOT EXISTS public.voice_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id uuid NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_name text NOT NULL CHECK (action_name IN ('mark_payment', 'update_notes')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'cancelled', 'expired', 'failed', 'undone')),
  source text NOT NULL DEFAULT 'voice' CHECK (source IN ('voice', 'typed')),
  language text NOT NULL DEFAULT 'en-IN',
  transcript text,
  summary text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  before_state jsonb,
  after_state jsonb,
  result jsonb,
  confirmed_at timestamptz,
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.voice_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their voice action audit" ON public.voice_action_audit;
CREATE POLICY "Owners can view their voice action audit"
ON public.voice_action_audit FOR SELECT
USING (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pgs p
    WHERE p.id = voice_action_audit.pg_id AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can create their voice action audit" ON public.voice_action_audit;
CREATE POLICY "Owners can create their voice action audit"
ON public.voice_action_audit FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pgs p
    WHERE p.id = voice_action_audit.pg_id AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can update their voice action audit" ON public.voice_action_audit;
CREATE POLICY "Owners can update their voice action audit"
ON public.voice_action_audit FOR UPDATE
USING (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pgs p
    WHERE p.id = voice_action_audit.pg_id AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pgs p
    WHERE p.id = voice_action_audit.pg_id AND p.owner_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_voice_action_audit_pg_created
  ON public.voice_action_audit (pg_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_action_audit_actor_status
  ON public.voice_action_audit (actor_id, status, created_at DESC);

COMMENT ON TABLE public.voice_action_audit IS
  'Server-controlled pending confirmations and immutable history for assistant write actions.';
