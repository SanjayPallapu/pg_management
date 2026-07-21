ALTER TABLE public.room_electricity_readings 
  ADD COLUMN IF NOT EXISTS start_reading numeric,
  ADD COLUMN IF NOT EXISTS end_reading numeric,
  ADD COLUMN IF NOT EXISTS split_type text,
  ADD COLUMN IF NOT EXISTS split_count integer,
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

ALTER TABLE public.day_guests
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS room_no text,
  ADD COLUMN IF NOT EXISTS collected_by text;