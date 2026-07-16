-- Alter rooms foreign key to ON DELETE CASCADE
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_pg_id_fkey;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_pg_id_fkey FOREIGN KEY (pg_id) REFERENCES public.pgs(id) ON DELETE CASCADE;

-- Alter key_numbers foreign key to ON DELETE CASCADE
ALTER TABLE public.key_numbers DROP CONSTRAINT IF EXISTS key_numbers_pg_id_fkey;
ALTER TABLE public.key_numbers ADD CONSTRAINT key_numbers_pg_id_fkey FOREIGN KEY (pg_id) REFERENCES public.pgs(id) ON DELETE CASCADE;

-- Add is_archived to pgs table
ALTER TABLE public.pgs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
