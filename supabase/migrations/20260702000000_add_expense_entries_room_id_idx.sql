-- Add missing index on expense_entries(room_id) for better JOIN performance
CREATE INDEX IF NOT EXISTS expense_entries_room_id_idx ON public.expense_entries(room_id);
