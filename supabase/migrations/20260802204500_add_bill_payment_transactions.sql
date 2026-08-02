-- Auditable, idempotent bill payments. Raw UPI IDs are never stored.
ALTER TABLE public.expense_entries ALTER COLUMN amount TYPE numeric(12,2) USING amount::numeric;

CREATE TABLE public.bill_payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE,
  pg_id uuid NOT NULL REFERENCES public.pgs(id) ON DELETE CASCADE,
  expense_entry_id uuid REFERENCES public.expense_entries(id) ON DELETE SET NULL,
  bill_category_id text NOT NULL,
  category text NOT NULL CHECK (category IN ('current', 'utility', 'other', 'family')),
  category_name text NOT NULL,
  label text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('UPI', 'Cash', 'Record Only')),
  status text NOT NULL CHECK (status IN ('Paid', 'Failed', 'Pending', 'Partially Paid', 'Unpaid')),
  paid_at timestamptz NOT NULL DEFAULT now(),
  payee_name text,
  masked_upi_id text,
  note text,
  upi_attempted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bill_payment_transactions_pg_paid_at_idx ON public.bill_payment_transactions(pg_id, paid_at DESC);
CREATE INDEX bill_payment_transactions_category_idx ON public.bill_payment_transactions(pg_id, category, bill_category_id);
ALTER TABLE public.bill_payment_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.bill_payment_transactions TO authenticated;
GRANT ALL ON public.bill_payment_transactions TO service_role;

CREATE POLICY "Owners manage bill payment transactions" ON public.bill_payment_transactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = pg_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pgs p WHERE p.id = pg_id AND p.owner_id = auth.uid()));

CREATE TRIGGER trg_bill_payment_transactions_updated_at BEFORE UPDATE ON public.bill_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.record_bill_payment(
  p_transaction_id uuid, p_pg_id uuid, p_bill_category_id text, p_category text,
  p_category_name text, p_label text, p_amount numeric, p_payment_method text,
  p_status text, p_paid_at timestamptz, p_payee_name text DEFAULT NULL,
  p_masked_upi_id text DEFAULT NULL, p_note text DEFAULT NULL,
  p_upi_attempted boolean DEFAULT false, p_subcategory text DEFAULT NULL,
  p_floor integer DEFAULT NULL, p_month integer DEFAULT NULL, p_year integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payment_id uuid; v_expense_id uuid; v_existing public.bill_payment_transactions%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pgs WHERE id = p_pg_id AND owner_id = auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_existing FROM public.bill_payment_transactions WHERE transaction_id = p_transaction_id;
  IF FOUND THEN RETURN jsonb_build_object('id', v_existing.id, 'expense_entry_id', v_existing.expense_entry_id, 'duplicate', true); END IF;
  IF p_amount <= 0 OR p_category NOT IN ('current','utility','other','family') OR p_payment_method NOT IN ('UPI','Cash','Record Only') OR p_status NOT IN ('Paid','Failed','Pending','Partially Paid','Unpaid') THEN RAISE EXCEPTION 'Invalid payment'; END IF;

  IF p_status IN ('Paid', 'Partially Paid') THEN
    INSERT INTO public.expense_entries (pg_id, month, year, category, subcategory, label, amount, entry_date, floor, notes)
    VALUES (p_pg_id, COALESCE(p_month, EXTRACT(MONTH FROM p_paid_at)::int), COALESCE(p_year, EXTRACT(YEAR FROM p_paid_at)::int), p_category, p_subcategory, left(p_label,120), p_amount, (p_paid_at AT TIME ZONE 'Asia/Kolkata')::date, p_floor, NULLIF(left(COALESCE(p_note,''),500),''))
    RETURNING id INTO v_expense_id;
  END IF;

  INSERT INTO public.bill_payment_transactions (transaction_id, pg_id, expense_entry_id, bill_category_id, category, category_name, label, amount, payment_method, status, paid_at, payee_name, masked_upi_id, note, upi_attempted)
  VALUES (p_transaction_id, p_pg_id, v_expense_id, left(p_bill_category_id,160), p_category, left(p_category_name,80), left(p_label,120), p_amount, p_payment_method, p_status, p_paid_at, NULLIF(left(COALESCE(p_payee_name,''),120),''), NULLIF(left(COALESCE(p_masked_upi_id,''),220),''), NULLIF(left(COALESCE(p_note,''),500),''), p_upi_attempted)
  RETURNING id INTO v_payment_id;
  RETURN jsonb_build_object('id', v_payment_id, 'expense_entry_id', v_expense_id, 'duplicate', false);
END; $$;
REVOKE ALL ON FUNCTION public.record_bill_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_bill_payment TO authenticated;
