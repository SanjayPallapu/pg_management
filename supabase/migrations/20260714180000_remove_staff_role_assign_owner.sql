-- Fix: Assign 'owner' role to ALL new signups (no staff, no admin auto-assignment)
-- Every logged-in user is an owner of their own PG data

CREATE OR REPLACE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Convert any remaining 'staff' roles to 'owner'
UPDATE public.user_roles
SET role = 'owner'
WHERE role = 'staff';
