
-- Index on rooms.pg_id for fast room lookups by PG
CREATE INDEX IF NOT EXISTS idx_rooms_pg_id ON public.rooms (pg_id);

-- Index on tenants.room_id for fast tenant lookups by room
CREATE INDEX IF NOT EXISTS idx_tenants_room_id ON public.tenants (room_id);

-- Composite index on tenant_payments for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant_month_year 
ON public.tenant_payments (tenant_id, month, year);

-- Index on tenant_payments.tenant_id alone for IN queries
CREATE INDEX IF NOT EXISTS idx_tenant_payments_tenant_id 
ON public.tenant_payments (tenant_id);

-- Index on day_guests.from_date for date range queries
CREATE INDEX IF NOT EXISTS idx_day_guests_from_date ON public.day_guests (from_date);

-- Index on day_guests.room_id for join queries
CREATE INDEX IF NOT EXISTS idx_day_guests_room_id ON public.day_guests (room_id);

-- Index on monthly_balances for fast lookup
CREATE INDEX IF NOT EXISTS idx_monthly_balances_pg_month_year 
ON public.monthly_balances (pg_id, month, year);

-- Index on audit_logs for user filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

-- Index on pgs.owner_id for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_pgs_owner_id ON public.pgs (owner_id);
