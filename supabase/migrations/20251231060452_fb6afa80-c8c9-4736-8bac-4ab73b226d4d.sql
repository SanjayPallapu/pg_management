-- Add is_locked column to tenants table for excluding from totals
ALTER TABLE public.tenants 
ADD COLUMN is_locked boolean NOT NULL DEFAULT false;