-- Keep payment reads and Realtime broadcasts scoped to the current property.
-- This removes the rooms -> tenants -> payments request chain from the busiest
-- dashboard flow and prevents unrelated properties from receiving each other's
-- change notifications.

ALTER TABLE public.tenant_payments
  ADD COLUMN IF NOT EXISTS pg_id uuid REFERENCES public.pgs(id) ON DELETE CASCADE;

-- Backfill existing rows before enabling the application query path.
UPDATE public.tenant_payments payment
SET pg_id = room.pg_id
FROM public.tenants tenant
JOIN public.rooms room ON room.id = tenant.room_id
WHERE payment.tenant_id = tenant.id
  AND payment.pg_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_tenant_payment_pg_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT room.pg_id
    INTO NEW.pg_id
  FROM public.tenants tenant
  JOIN public.rooms room ON room.id = tenant.room_id
  WHERE tenant.id = NEW.tenant_id;

  IF NEW.pg_id IS NULL THEN
    RAISE EXCEPTION 'A tenant payment must belong to a property';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tenant_payment_pg_id ON public.tenant_payments;
CREATE TRIGGER set_tenant_payment_pg_id
  BEFORE INSERT OR UPDATE OF tenant_id ON public.tenant_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_payment_pg_id();

ALTER TABLE public.tenant_payments
  ALTER COLUMN pg_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS tenant_payments_pg_period_idx
  ON public.tenant_payments (pg_id, year DESC, month DESC);

-- The direct pg_id policy makes the indexed query cheap while retaining the
-- tenant/room ownership checks in the existing write policies.
DROP POLICY IF EXISTS "Users can view payments for their own PGs" ON public.tenant_payments;
CREATE POLICY "Users can view payments for their own PGs"
ON public.tenant_payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pgs
    WHERE pgs.id = tenant_payments.pg_id
      AND pgs.owner_id = auth.uid()
  )
);
