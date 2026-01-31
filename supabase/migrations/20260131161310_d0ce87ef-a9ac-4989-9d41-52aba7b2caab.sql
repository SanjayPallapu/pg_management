-- Drop the legacy foreign key constraint that's causing the issue
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_property_id_fkey;

-- Make property_id nullable since we now use pg_id
ALTER TABLE public.rooms ALTER COLUMN property_id DROP NOT NULL;

-- Set a default value for property_id to avoid insertion issues
ALTER TABLE public.rooms ALTER COLUMN property_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;