-- Migration: Create razorpay_webhook_events table for idempotency tracking

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload_hash TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Index for fast lookup by event_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_razorpay_webhook_events_event_id ON public.razorpay_webhook_events(event_id);

-- Enable RLS
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access on razorpay_webhook_events" 
ON public.razorpay_webhook_events
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);
