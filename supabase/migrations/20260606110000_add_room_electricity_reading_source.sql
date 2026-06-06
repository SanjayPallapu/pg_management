ALTER TABLE public.room_electricity_readings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.room_electricity_readings
  DROP CONSTRAINT IF EXISTS room_electricity_readings_source_check;

ALTER TABLE public.room_electricity_readings
  ADD CONSTRAINT room_electricity_readings_source_check
  CHECK (source IN ('manual', 'imported'));
