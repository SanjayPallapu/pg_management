-- Migration: Add start_reading, end_reading, split_type, split_count to room_electricity_readings
ALTER TABLE room_electricity_readings ADD COLUMN IF NOT EXISTS start_reading INTEGER;
ALTER TABLE room_electricity_readings ADD COLUMN IF NOT EXISTS end_reading INTEGER;
ALTER TABLE room_electricity_readings ADD COLUMN IF NOT EXISTS split_type TEXT DEFAULT 'active_tenants';
ALTER TABLE room_electricity_readings ADD COLUMN IF NOT EXISTS split_count INTEGER;
