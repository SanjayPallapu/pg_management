BEGIN;

-- Add pg_id to key_numbers for multi-tenant isolation
ALTER TABLE public.key_numbers
  ADD COLUMN IF NOT EXISTS pg_id UUID REFERENCES public.pgs(id);

-- Indexes for scalability
CREATE INDEX IF NOT EXISTS idx_key_numbers_pg_id ON public.key_numbers (pg_id);
CREATE INDEX IF NOT EXISTS idx_day_guests_room_id ON public.day_guests (room_id);
CREATE INDEX IF NOT EXISTS idx_tenants_room_id ON public.tenants (room_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status_created_at ON public.payment_requests (status, created_at DESC);

-- Replace key_numbers policies to scope by PG ownership
DROP POLICY IF EXISTS "Authenticated users with role can view key_numbers" ON public.key_numbers;
DROP POLICY IF EXISTS "Only admins can insert key_numbers" ON public.key_numbers;
DROP POLICY IF EXISTS "Only admins can update key_numbers" ON public.key_numbers;
DROP POLICY IF EXISTS "Only admins can delete key_numbers" ON public.key_numbers;

CREATE POLICY "Users can view key_numbers in own PGs"
ON public.key_numbers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pgs
    WHERE public.pgs.id = public.key_numbers.pg_id
      AND public.pgs.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage key_numbers in own PGs"
ON public.key_numbers
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.pgs
    WHERE public.pgs.id = public.key_numbers.pg_id
      AND public.pgs.owner_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.pgs
    WHERE public.pgs.id = public.key_numbers.pg_id
      AND public.pgs.owner_id = auth.uid()
  )
);

COMMIT;
