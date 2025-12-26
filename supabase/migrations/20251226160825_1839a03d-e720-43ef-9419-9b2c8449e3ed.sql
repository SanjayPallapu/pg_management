-- Add whatsapp_sent column to tenant_payments to track if receipt was sent
ALTER TABLE public.tenant_payments ADD COLUMN IF NOT EXISTS whatsapp_sent boolean DEFAULT false;
ALTER TABLE public.tenant_payments ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamp with time zone;