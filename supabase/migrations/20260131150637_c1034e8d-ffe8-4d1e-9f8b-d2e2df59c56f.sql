-- Drop the overly restrictive admin-only INSERT policy for rooms
DROP POLICY IF EXISTS "Only admins can insert rooms" ON public.rooms;

-- Create a new INSERT policy that allows users to insert rooms for their own PGs
CREATE POLICY "Users can insert rooms for their own PGs" 
ON public.rooms 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pgs 
    WHERE pgs.id = pg_id 
    AND pgs.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Also update UPDATE policy to allow PG owners to update their rooms
DROP POLICY IF EXISTS "Only admins can update rooms" ON public.rooms;

CREATE POLICY "Users can update rooms for their own PGs" 
ON public.rooms 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pgs 
    WHERE pgs.id = pg_id 
    AND pgs.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update DELETE policy similarly
DROP POLICY IF EXISTS "Only admins can delete rooms" ON public.rooms;

CREATE POLICY "Users can delete rooms for their own PGs" 
ON public.rooms 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pgs 
    WHERE pgs.id = pg_id 
    AND pgs.owner_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update SELECT policy to allow users to see rooms for their own PGs
DROP POLICY IF EXISTS "Authenticated users with role can view rooms" ON public.rooms;

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
  OR has_any_role(auth.uid())
);