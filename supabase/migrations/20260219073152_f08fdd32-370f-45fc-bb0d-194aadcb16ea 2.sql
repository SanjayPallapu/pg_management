
-- Clean up orphaned tenant_payments that reference deleted tenants
DELETE FROM public.tenant_payments
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

-- Now add the foreign key constraint
ALTER TABLE public.tenant_payments
  ADD CONSTRAINT tenant_payments_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create collector_names table
CREATE TABLE public.collector_names (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collector_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, collector_key)
);

ALTER TABLE public.collector_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collector names"
  ON public.collector_names FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collector names"
  ON public.collector_names FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collector names"
  ON public.collector_names FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collector names"
  ON public.collector_names FOR DELETE
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.collector_names;
