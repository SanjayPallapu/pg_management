-- Create key_numbers table for storing room key serial numbers
CREATE TABLE public.key_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number TEXT NOT NULL,
  room_number TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.key_numbers ENABLE ROW LEVEL SECURITY;

-- Create policies for viewing (all authenticated users with role)
CREATE POLICY "Authenticated users with role can view key_numbers" 
ON public.key_numbers 
FOR SELECT 
USING (has_any_role(auth.uid()));

-- Create policies for admin management
CREATE POLICY "Only admins can insert key_numbers" 
ON public.key_numbers 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update key_numbers" 
ON public.key_numbers 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete key_numbers" 
ON public.key_numbers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_key_numbers_updated_at
BEFORE UPDATE ON public.key_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default key numbers
INSERT INTO public.key_numbers (serial_number, room_number) VALUES
  ('3229027', '207'),
  ('3124454', '101'),
  ('3699762', '305'),
  ('3217822', '302'),
  ('3227345', '301'),
  ('2829129', '205'),
  ('2831317', '103'),
  ('3218768', '102'),
  ('3328926', '106');