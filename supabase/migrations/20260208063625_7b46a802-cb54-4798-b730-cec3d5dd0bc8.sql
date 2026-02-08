
-- Create table for manually stored monthly balances
CREATE TABLE public.monthly_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pg_id UUID NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(pg_id, month, year)
);

-- Enable RLS
ALTER TABLE public.monthly_balances ENABLE ROW LEVEL SECURITY;

-- Policies: only PG owners can manage their balance records
CREATE POLICY "Users can view balances for their own PGs"
ON public.monthly_balances FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pgs WHERE pgs.id = monthly_balances.pg_id AND pgs.owner_id = auth.uid()
));

CREATE POLICY "Users can insert balances for their own PGs"
ON public.monthly_balances FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM pgs WHERE pgs.id = monthly_balances.pg_id AND pgs.owner_id = auth.uid()
));

CREATE POLICY "Users can update balances for their own PGs"
ON public.monthly_balances FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM pgs WHERE pgs.id = monthly_balances.pg_id AND pgs.owner_id = auth.uid()
));

CREATE POLICY "Users can delete balances for their own PGs"
ON public.monthly_balances FOR DELETE
USING (EXISTS (
  SELECT 1 FROM pgs WHERE pgs.id = monthly_balances.pg_id AND pgs.owner_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_monthly_balances_updated_at
BEFORE UPDATE ON public.monthly_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
