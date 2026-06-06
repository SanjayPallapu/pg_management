
-- 1. Expense entries (bills & expense dashboard)
CREATE TABLE public.expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id uuid NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  category text NOT NULL,
  subcategory text,
  label text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  floor integer,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_entries TO authenticated;
GRANT ALL ON public.expense_entries TO service_role;

ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses for own PGs" ON public.expense_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = expense_entries.pg_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can insert expenses for own PGs" ON public.expense_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = expense_entries.pg_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can update expenses for own PGs" ON public.expense_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = expense_entries.pg_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can delete expenses for own PGs" ON public.expense_entries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = expense_entries.pg_id AND p.owner_id = auth.uid()));

CREATE INDEX idx_expense_entries_pg_month ON public.expense_entries(pg_id, year, month);

CREATE TRIGGER trg_expense_entries_updated_at BEFORE UPDATE ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Monthly budgets
CREATE TABLE public.monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pg_id uuid NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pg_id, month, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_budgets TO authenticated;
GRANT ALL ON public.monthly_budgets TO service_role;

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets for own PGs" ON public.monthly_budgets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = monthly_budgets.pg_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can insert budgets for own PGs" ON public.monthly_budgets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = monthly_budgets.pg_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can update budgets for own PGs" ON public.monthly_budgets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = monthly_budgets.pg_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can delete budgets for own PGs" ON public.monthly_budgets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = monthly_budgets.pg_id AND p.owner_id = auth.uid()));

CREATE TRIGGER trg_monthly_budgets_updated_at BEFORE UPDATE ON public.monthly_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tenant snoozes
CREATE TABLE public.tenant_snoozes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  snoozed_until date NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_snoozes TO authenticated;
GRANT ALL ON public.tenant_snoozes TO service_role;

ALTER TABLE public.tenant_snoozes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snoozes for own PGs" ON public.tenant_snoozes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t JOIN public.rooms r ON t.room_id = r.id JOIN public.pgs p ON r.pg_id = p.id WHERE t.id = tenant_snoozes.tenant_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can insert snoozes for own PGs" ON public.tenant_snoozes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t JOIN public.rooms r ON t.room_id = r.id JOIN public.pgs p ON r.pg_id = p.id WHERE t.id = tenant_snoozes.tenant_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can update snoozes for own PGs" ON public.tenant_snoozes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t JOIN public.rooms r ON t.room_id = r.id JOIN public.pgs p ON r.pg_id = p.id WHERE t.id = tenant_snoozes.tenant_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can delete snoozes for own PGs" ON public.tenant_snoozes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenants t JOIN public.rooms r ON t.room_id = r.id JOIN public.pgs p ON r.pg_id = p.id WHERE t.id = tenant_snoozes.tenant_id AND p.owner_id = auth.uid()));

CREATE INDEX idx_tenant_snoozes_tenant ON public.tenant_snoozes(tenant_id, snoozed_until);

CREATE TRIGGER trg_tenant_snoozes_updated_at BEFORE UPDATE ON public.tenant_snoozes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Electricity readings (AC rooms)
CREATE TABLE public.room_electricity_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  units integer NOT NULL DEFAULT 0,
  unit_price integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, month, year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_electricity_readings TO authenticated;
GRANT ALL ON public.room_electricity_readings TO service_role;

ALTER TABLE public.room_electricity_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view electricity for own PGs" ON public.room_electricity_readings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r JOIN public.pgs p ON r.pg_id = p.id WHERE r.id = room_electricity_readings.room_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can insert electricity for own PGs" ON public.room_electricity_readings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r JOIN public.pgs p ON r.pg_id = p.id WHERE r.id = room_electricity_readings.room_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can update electricity for own PGs" ON public.room_electricity_readings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r JOIN public.pgs p ON r.pg_id = p.id WHERE r.id = room_electricity_readings.room_id AND p.owner_id = auth.uid()));
CREATE POLICY "Users can delete electricity for own PGs" ON public.room_electricity_readings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r JOIN public.pgs p ON r.pg_id = p.id WHERE r.id = room_electricity_readings.room_id AND p.owner_id = auth.uid()));

CREATE TRIGGER trg_electricity_updated_at BEFORE UPDATE ON public.room_electricity_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Column additions
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_ac boolean NOT NULL DEFAULT false;
ALTER TABLE public.pgs ADD COLUMN IF NOT EXISTS electricity_unit_price integer NOT NULL DEFAULT 12;
