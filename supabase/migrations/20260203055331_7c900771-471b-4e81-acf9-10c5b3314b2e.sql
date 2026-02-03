-- Fix room update RLS policy - add WITH CHECK clause
DROP POLICY IF EXISTS "Users can update rooms for their own PGs" ON public.rooms;

CREATE POLICY "Users can update rooms for their own PGs" 
ON public.rooms 
FOR UPDATE 
USING ((EXISTS ( SELECT 1 FROM pgs WHERE ((pgs.id = rooms.pg_id) AND (pgs.owner_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((EXISTS ( SELECT 1 FROM pgs WHERE ((pgs.id = rooms.pg_id) AND (pgs.owner_id = auth.uid())))) OR has_role(auth.uid(), 'admin'::app_role));

-- Create profiles table to store user profile info during signup
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();