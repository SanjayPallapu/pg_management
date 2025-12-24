-- Drop existing INSERT/UPDATE policies that allow all users with roles to modify
DROP POLICY IF EXISTS "Authenticated users with role can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users with role can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users with role can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users with role can update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users with role can insert day guests" ON public.day_guests;
DROP POLICY IF EXISTS "Authenticated users with role can update day guests" ON public.day_guests;
DROP POLICY IF EXISTS "Authenticated users with role can insert payments" ON public.tenant_payments;
DROP POLICY IF EXISTS "Authenticated users with role can update payments" ON public.tenant_payments;

-- Create new policies that only allow admins to INSERT
CREATE POLICY "Only admins can insert rooms" ON public.rooms
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert tenants" ON public.tenants
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert day guests" ON public.day_guests
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert payments" ON public.tenant_payments
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create new policies that only allow admins to UPDATE
CREATE POLICY "Only admins can update rooms" ON public.rooms
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update tenants" ON public.tenants
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update day guests" ON public.day_guests
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update payments" ON public.tenant_payments
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));