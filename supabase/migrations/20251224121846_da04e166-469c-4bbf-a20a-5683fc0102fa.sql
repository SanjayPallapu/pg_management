-- Add security deposit columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN security_deposit_amount integer DEFAULT NULL,
ADD COLUMN security_deposit_date date DEFAULT NULL;