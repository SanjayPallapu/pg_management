
-- 1. Subscriptions: prevent privilege escalation
DROP POLICY IF EXISTS "Users can insert their subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their subscription" ON public.subscriptions;
-- (signup trigger creates the row with SECURITY DEFINER; webhook updates with service role)

-- 2. Realtime publication: remove sensitive tables to prevent broadcast leakage
ALTER PUBLICATION supabase_realtime DROP TABLE public.tenant_payments;
ALTER PUBLICATION supabase_realtime DROP TABLE public.collector_names;

-- 3. Audit logs: restrict insert to user's own identity
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 4. Storage: private bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
CREATE POLICY "Users can view their own payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;
CREATE POLICY "Admins can view all payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can upload their own payment proofs" ON storage.objects;
CREATE POLICY "Users can upload their own payment proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own payment proofs" ON storage.objects;
CREATE POLICY "Users can delete their own payment proofs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Storage: tighten receipts bucket delete (used for PG logos / shared assets)
DROP POLICY IF EXISTS "Authenticated users can delete receipts" ON storage.objects;
CREATE POLICY "Admins can delete receipts"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND public.has_role(auth.uid(), 'admin'));
