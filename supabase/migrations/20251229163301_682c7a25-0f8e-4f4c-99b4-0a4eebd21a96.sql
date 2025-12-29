-- Create trigger to auto-assign roles on user signup
-- First user gets admin, subsequent users get staff
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();