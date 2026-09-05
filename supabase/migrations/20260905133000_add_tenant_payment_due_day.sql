-- Add payment_due_day and payment_delay_days to tenants table
-- payment_due_day: Integer (1-31) representing agreed monthly rent payment day
-- payment_delay_days: Integer representing delay in days from normal due date
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS payment_due_day integer,
ADD COLUMN IF NOT EXISTS payment_delay_days integer DEFAULT 0;

COMMENT ON COLUMN public.tenants.payment_due_day IS 'Custom/agreed day of month (1-31) when tenant pays rent';
COMMENT ON COLUMN public.tenants.payment_delay_days IS 'Agreed delay in days from normal joining day';
