-- Fix the SELECT policy - users should ONLY see rooms for PGs they own
-- Remove the overly permissive has_any_role() fallback
DROP POLICY IF EXISTS "Users can view rooms for their own PGs" ON public.rooms;

CREATE POLICY "Users can view rooms for their own PGs" 
ON public.rooms 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pgs 
    WHERE pgs.id = pg_id 
    AND pgs.owner_id = auth.uid()
  )
);

-- Also fix tenants table - users should only see tenants in rooms they own
DROP POLICY IF EXISTS "Authenticated users with role can view tenants" ON public.tenants;

CREATE POLICY "Users can view tenants in their own PGs" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE r.id = room_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix tenant INSERT - users can add tenants to rooms in their PGs
DROP POLICY IF EXISTS "Only admins can insert tenants" ON public.tenants;

CREATE POLICY "Users can insert tenants in their own PGs" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE r.id = room_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix tenant UPDATE
DROP POLICY IF EXISTS "Only admins can update tenants" ON public.tenants;

CREATE POLICY "Users can update tenants in their own PGs" 
ON public.tenants 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE r.id = room_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix tenant DELETE
DROP POLICY IF EXISTS "Only admins can delete tenants" ON public.tenants;

CREATE POLICY "Users can delete tenants in their own PGs" 
ON public.tenants 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE r.id = room_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix tenant_payments - users should only see payments for tenants in their PGs
DROP POLICY IF EXISTS "Authenticated users with role can view payments" ON public.tenant_payments;

CREATE POLICY "Users can view payments for their own PGs" 
ON public.tenant_payments 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.rooms r ON t.room_id = r.id
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE t.id = tenant_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix tenant_payments INSERT
DROP POLICY IF EXISTS "Only admins can insert payments" ON public.tenant_payments;

CREATE POLICY "Users can insert payments for their own PGs" 
ON public.tenant_payments 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.rooms r ON t.room_id = r.id
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE t.id = tenant_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix tenant_payments UPDATE
DROP POLICY IF EXISTS "Only admins can update payments" ON public.tenant_payments;

CREATE POLICY "Users can update payments for their own PGs" 
ON public.tenant_payments 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.rooms r ON t.room_id = r.id
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE t.id = tenant_id 
    AND p.owner_id = auth.uid()
  )
);

-- Fix tenant_payments DELETE
DROP POLICY IF EXISTS "Only admins can delete payments" ON public.tenant_payments;

CREATE POLICY "Users can delete payments for their own PGs" 
ON public.tenant_payments 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.rooms r ON t.room_id = r.id
    JOIN public.pgs p ON r.pg_id = p.id
    WHERE t.id = tenant_id 
    AND p.owner_id = auth.uid()
  )
);