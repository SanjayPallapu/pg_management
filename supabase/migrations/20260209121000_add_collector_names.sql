CREATE TABLE IF NOT EXISTS public.collector_names (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  collector_key text NOT NULL,
  display_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collector_names_user_key_idx
  ON public.collector_names (user_id, collector_key);

ALTER TABLE public.collector_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collector_names_select"
  ON public.collector_names
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "collector_names_insert"
  ON public.collector_names
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "collector_names_update"
  ON public.collector_names
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "collector_names_delete"
  ON public.collector_names
  FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_collector_names_updated_at
BEFORE UPDATE ON public.collector_names
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();