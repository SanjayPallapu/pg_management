-- Drop the global unique constraint on room_no (rooms should be unique within a PG, not globally)
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_no_key;

-- Add a unique constraint for room_no + pg_id combination
ALTER TABLE rooms ADD CONSTRAINT rooms_room_no_pg_id_unique UNIQUE (room_no, pg_id);

-- Drop the floor check constraint that limits to 3 floors
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_floor_check;