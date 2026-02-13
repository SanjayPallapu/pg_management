import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePG } from '@/contexts/PGContext';

/**
 * Subscribes to real-time changes on the tenant_payments table
 * and invalidates the React Query cache so all sessions stay in sync.
 */
export const useRealtimePayments = () => {
  const queryClient = useQueryClient();
  const { currentPG } = usePG();

  useEffect(() => {
    if (!currentPG?.id) return;

    const channel = supabase
      .channel(`payments-realtime-${currentPG.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenant_payments',
        },
        () => {
          // Invalidate payments cache so all tabs/sessions refetch
          queryClient.invalidateQueries({ queryKey: ['tenant-payments', currentPG.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPG?.id, queryClient]);
};
