-- Add security deposit collected_by column to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS security_deposit_collected_by text;
