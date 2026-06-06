-- Fix day_guests RLS to filter by PG ownership (not just has_any_role)
-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users with role can view day guests" ON day_guests;
DROP POLICY IF EXISTS "Only admins can insert day guests" ON day_guests;
DROP POLICY IF EXISTS "Only admins can update day guests" ON day_guests;
DROP POLICY IF EXISTS "Only admins can delete day guests" ON day_guests;

-- Create new ownership-based policies for day_guests
-- Users can only see day guests for rooms in PGs they own
CREATE POLICY "Users can view day guests for their own PGs"
  ON day_guests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN pgs p ON r.pg_id = p.id
      WHERE r.id = day_guests.room_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert day guests for their own PGs"
  ON day_guests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN pgs p ON r.pg_id = p.id
      WHERE r.id = day_guests.room_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update day guests for their own PGs"
  ON day_guests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN pgs p ON r.pg_id = p.id
      WHERE r.id = day_guests.room_id AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete day guests for their own PGs"
  ON day_guests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rooms r
      JOIN pgs p ON r.pg_id = p.id
      WHERE r.id = day_guests.room_id AND p.owner_id = auth.uid()
    )
  );