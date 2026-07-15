import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/proxyClient';
import { usePG } from '@/contexts/PGContext';

/**
 * Subscribes to real-time changes on the tenant_payments table
 * and invalidates the React Query cache so all sessions stay in sync.
 */
export const useRealtimePayments = () => {
  const queryClient = useQueryClient();
  const { currentPG } = usePG();
  const pgIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!currentPG?.id) return;

    const channelName = `payments-realtime-${currentPG.id}`;

    // Remove any pre-existing channel with this name to prevent
    // "cannot add postgres_changes after subscribe()" Supabase error
    const existing = supabase.getChannels().find(ch => ch.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
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
    } catch (err) {
      console.warn('[RealtimePayments] Subscribe failed (non-fatal):', err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentPG?.id, queryClient]);
};
