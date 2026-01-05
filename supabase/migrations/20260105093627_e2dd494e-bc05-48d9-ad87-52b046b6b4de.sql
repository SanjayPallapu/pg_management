-- Create audit_logs table for tracking all data changes
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  table_name TEXT NOT NULL, -- 'tenants', 'rooms', 'tenant_payments', 'day_guests'
  record_id UUID NOT NULL,
  record_name TEXT, -- Human readable name (tenant name, room number, etc)
  old_data JSONB,
  new_data JSONB,
  changes JSONB, -- Summary of what changed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only users with any role can view audit logs
CREATE POLICY "Users with role can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_any_role(auth.uid()));

-- Only authenticated users can insert audit logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);