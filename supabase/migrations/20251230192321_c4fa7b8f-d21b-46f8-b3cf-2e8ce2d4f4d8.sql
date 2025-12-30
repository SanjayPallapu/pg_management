-- Add notes field to tenant_payments table for storing overpayment reasons
ALTER TABLE public.tenant_payments 
ADD COLUMN IF NOT EXISTS notes TEXT;