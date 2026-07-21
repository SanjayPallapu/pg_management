ALTER TABLE public.tenant_payments
  ADD COLUMN IF NOT EXISTS ac_payment_status text;