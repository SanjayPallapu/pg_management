import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AuditLog {
  id: string;
  userId: string | null;
  action: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  recordName: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  createdAt: string;
}

interface LogAuditParams {
  action: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  recordName?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export const useAuditLog = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filter audit logs by the current user's ID to ensure data isolation
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action as 'create' | 'update' | 'delete',
        tableName: log.table_name,
        recordId: log.record_id,
        recordName: log.record_name,
        oldData: log.old_data as Record<string, unknown> | null,
        newData: log.new_data as Record<string, unknown> | null,
        changes: log.changes as Record<string, { old: unknown; new: unknown }> | null,
        createdAt: log.created_at,
      })) as AuditLog[];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });

  const logAudit = useMutation({
    mutationFn: async (params: LogAuditParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id || null,
          action: params.action,
          table_name: params.tableName,
          record_id: params.recordId,
          record_name: params.recordName || null,
          old_data: params.oldData || null,
          new_data: params.newData || null,
          changes: params.changes || null,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  return {
    logs,
    isLoading,
    logAudit,
  };
};
