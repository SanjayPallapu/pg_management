
-- 1. audit_logs: admin-only SELECT
DROP POLICY IF EXISTS "Users with role can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. properties: admin-only SELECT
DROP POLICY IF EXISTS "Users with role can view properties" ON public.properties;
CREATE POLICY "Admins can view properties"
ON public.properties
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. key_numbers: remove pg_id IS NULL bypass
DROP POLICY IF EXISTS "Users can view key_numbers for their own PGs" ON public.key_numbers;
CREATE POLICY "Users can view key_numbers for their own PGs"
ON public.key_numbers
FOR SELECT
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.pgs WHERE pgs.id = key_numbers.pg_id AND pgs.owner_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Storage: restrict receipts listing to authenticated users
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
CREATE POLICY "Authenticated users can view receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'receipts');

-- 5. Revoke EXECUTE from anon/public on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
