-- Add payment_mode to payment_entries jsonb schema
-- Note: Since payment_entries is a JSONB column, we just need to ensure
-- the code includes the mode field when inserting entries.
-- No schema change needed for JSONB, but we'll add a comment for documentation.

COMMENT ON COLUMN public.tenant_payments.payment_entries IS 'JSON array of payment entries with fields: amount (int), date (string), type (partial|full|remaining), mode (upi|cash)';