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

DELETE FROM public.user_roles staff_roles
WHERE staff_roles.role = 'staff'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles owner_roles
    WHERE owner_roles.user_id = staff_roles.user_id
      AND owner_roles.role = 'owner'
  );

UPDATE public.user_roles
SET role = 'owner'
WHERE role = 'staff';
