-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('free', 'pending', 'active', 'expired');

-- Create PGs table (replacing/extending properties)
CREATE TABLE public.pgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  floors INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'free',
  max_pgs INTEGER NOT NULL DEFAULT 1,
  max_tenants_per_pg INTEGER NOT NULL DEFAULT 10,
  features JSONB DEFAULT '{"auto_reminders": false, "daily_reports": false, "ai_logo": false}'::jsonb,
  payment_proof_url TEXT,
  payment_requested_at TIMESTAMP WITH TIME ZONE,
  payment_approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create payment requests table for manual approval flow
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add pg_id column to rooms table (nullable for migration)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS pg_id UUID REFERENCES public.pgs(id);

-- Enable RLS
ALTER TABLE public.pgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- PGs policies - owners can manage their PGs
CREATE POLICY "Users can view their own PGs" ON public.pgs FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert their own PGs" ON public.pgs FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their own PGs" ON public.pgs FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete their own PGs" ON public.pgs FOR DELETE USING (owner_id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their subscription" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their subscription" ON public.subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update subscriptions" ON public.subscriptions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment requests policies
CREATE POLICY "Users can view their own payment requests" ON public.payment_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create payment requests" ON public.payment_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all payment requests" ON public.payment_requests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update payment requests" ON public.payment_requests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to initialize subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, max_pgs, max_tenants_per_pg)
  VALUES (NEW.id, 'free', 'free', 1, 10);
  RETURN NEW;
END;
$$;

-- Create trigger for auto-subscription on signup
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Update triggers
CREATE TRIGGER update_pgs_updated_at
  BEFORE UPDATE ON public.pgs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();