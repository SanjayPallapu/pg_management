ALTER TABLE public.key_numbers ADD COLUMN IF NOT EXISTS pg_id uuid;

-- Update RLS so PG owners can manage their own key_numbers
DROP POLICY IF EXISTS "Authenticated users with role can view key_numbers" ON public.key_numbers;
DROP POLICY IF EXISTS "Only admins can delete key_numbers" ON public.key_numbers;
DROP POLICY IF EXISTS "Only admins can insert key_numbers" ON public.key_numbers;
DROP POLICY IF EXISTS "Only admins can update key_numbers" ON public.key_numbers;

CREATE POLICY "Users can view key_numbers for their own PGs"
ON public.key_numbers FOR SELECT TO authenticated
USING (
  pg_id IS NULL OR EXISTS (
    SELECT 1 FROM public.pgs WHERE pgs.id = key_numbers.pg_id AND pgs.owner_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert key_numbers for their own PGs"
ON public.key_numbers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.pgs WHERE pgs.id = key_numbers.pg_id AND pgs.owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update key_numbers for their own PGs"
ON public.key_numbers FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.pgs WHERE pgs.id = key_numbers.pg_id AND pgs.owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can delete key_numbers for their own PGs"
ON public.key_numbers FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.pgs WHERE pgs.id = key_numbers.pg_id AND pgs.owner_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);