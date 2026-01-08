-- Add security_deposit_mode column to tenants table for UPI/Cash tracking
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS security_deposit_mode text;