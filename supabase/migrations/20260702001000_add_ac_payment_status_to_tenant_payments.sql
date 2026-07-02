-- Add ac_payment_status column to tenant_payments to track AC bills independently of rent
ALTER TABLE public.tenant_payments ADD COLUMN IF NOT EXISTS ac_payment_status text DEFAULT 'Pending';
