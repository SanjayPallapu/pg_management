-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for properties
CREATE POLICY "Users with role can view properties" 
ON public.properties 
FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "Only admins can insert properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update properties" 
ON public.properties 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete properties" 
ON public.properties 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add property_id to rooms table
ALTER TABLE public.rooms 
ADD COLUMN property_id UUID REFERENCES public.properties(id);

-- Create a default property for existing rooms
INSERT INTO public.properties (id, name, address) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Main PG', 'Default Location');

-- Assign all existing rooms to the default property
UPDATE public.rooms SET property_id = '00000000-0000-0000-0000-000000000001';

-- Make property_id NOT NULL after data migration
ALTER TABLE public.rooms ALTER COLUMN property_id SET NOT NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();