BEGIN;

-- Prevent race conditions for initial admin assignment and avoid full table count scans
CREATE OR REPLACE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  has_admin boolean;
BEGIN
  -- Serialize initial admin assignment across concurrent signups
  PERFORM pg_advisory_xact_lock(hashtext('assign_initial_admin'));

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  ) INTO has_admin;

  IF NOT has_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Indexes to keep signup-related lookups and ownership filters fast at scale
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);
CREATE INDEX IF NOT EXISTS idx_pgs_owner_id ON public.pgs (owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON public.payment_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_pg_id ON public.rooms (pg_id);

COMMIT;
