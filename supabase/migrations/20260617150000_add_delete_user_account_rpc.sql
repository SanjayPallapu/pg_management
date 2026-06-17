-- Create secure account deletion function that bypasses RLS to clean up user data and delete the auth user
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Double check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from child tables to prevent foreign key constraint violations
  DELETE FROM public.tenant_payments WHERE tenant_id IN (
    SELECT id FROM public.tenants WHERE room_id IN (
      SELECT id FROM public.rooms WHERE pg_id IN (
        SELECT id FROM public.pgs WHERE owner_id = auth.uid()
      )
    )
  );
  
  DELETE FROM public.tenants WHERE room_id IN (
    SELECT id FROM public.rooms WHERE pg_id IN (
      SELECT id FROM public.pgs WHERE owner_id = auth.uid()
    )
  );
  
  DELETE FROM public.day_guests WHERE room_id IN (
    SELECT id FROM public.rooms WHERE pg_id IN (
      SELECT id FROM public.pgs WHERE owner_id = auth.uid()
    )
  );
  
  DELETE FROM public.room_electricity_readings WHERE room_id IN (
    SELECT id FROM public.rooms WHERE pg_id IN (
      SELECT id FROM public.pgs WHERE owner_id = auth.uid()
    )
  );
  
  DELETE FROM public.rooms WHERE pg_id IN (
    SELECT id FROM public.pgs WHERE owner_id = auth.uid()
  );
  
  DELETE FROM public.expense_entries WHERE pg_id IN (
    SELECT id FROM public.pgs WHERE owner_id = auth.uid()
  );
  
  DELETE FROM public.monthly_balances WHERE pg_id IN (
    SELECT id FROM public.pgs WHERE owner_id = auth.uid()
  );
  
  DELETE FROM public.monthly_budgets WHERE pg_id IN (
    SELECT id FROM public.pgs WHERE owner_id = auth.uid()
  );
  
  DELETE FROM public.pgs WHERE owner_id = auth.uid();
  DELETE FROM public.subscriptions WHERE user_id = auth.uid();
  DELETE FROM public.payment_requests WHERE user_id = auth.uid();
  DELETE FROM public.profiles WHERE user_id = auth.uid();
  DELETE FROM public.user_roles WHERE user_id = auth.uid();
  
  -- Finally delete from auth.users
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
