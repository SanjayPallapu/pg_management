import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/proxyClient';
import { TenantPayment, PaymentEntry } from '@/types';
import { useAuditLog } from './useAuditLog';
import { usePG } from '@/contexts/PGContext';
import { toast } from 'sonner';

export const useTenantPayments = () => {
  const { logAudit } = useAuditLog();
  const queryClient = useQueryClient();
  const { currentPG } = usePG();

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['tenant-payments', currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) {
        return [];
      }

      // Step 1: Fetch rooms in this PG
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id')
        .eq('pg_id', currentPG.id);

      if (roomsError) {
        console.error('[Payments] Failed to fetch rooms', roomsError);
        throw roomsError;
      }

      const roomIds = (roomsData || []).map(r => r.id);
      if (roomIds.length === 0) return [];

      // Step 2: Fetch tenants in those rooms
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id')
        .in('room_id', roomIds);

      if (tenantsError) {
        console.error('[Payments] Failed to fetch tenants', tenantsError);
        throw tenantsError;
      }

      const tenantIds = (tenantsData || []).map(t => t.id);
      if (tenantIds.length === 0) return [];

      // Step 3: Fetch tenant payments for those active tenants
      const currentDate = new Date();
      const cutoffYear = currentDate.getFullYear() - 1;

      const { data, error } = await supabase
        .from('tenant_payments')
        .select('id, tenant_id, month, year, payment_status, payment_date, amount, amount_paid, payment_entries, whatsapp_sent, whatsapp_sent_at, notes, ac_payment_status')
        .in('tenant_id', tenantIds)
        .gte('year', cutoffYear)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        console.error('[Payments] Failed to fetch payments', error);
        throw error;
      }

      const mappedPayments = data.map(payment => ({
        id: payment.id,
        tenantId: payment.tenant_id,
        month: payment.month,
        year: payment.year,
        paymentStatus: payment.payment_status as 'Paid' | 'Pending' | 'Partial',
        paymentDate: payment.payment_date || undefined,
        amount: payment.amount,
        amountPaid: (payment as any).amount_paid || 0,
        paymentEntries: ((payment as any).payment_entries || []) as PaymentEntry[],
        whatsappSent: (payment as any).whatsapp_sent || false,
        whatsappSentAt: (payment as any).whatsapp_sent_at || undefined,
        notes: (payment as any).notes || undefined,
        acPaymentStatus: (payment as any).ac_payment_status as 'Paid' | 'Pending',
      })) as TenantPayment[];

      console.debug('[Payments] Fetched payments', { count: mappedPayments.length, pgId: currentPG.id });
      return mappedPayments;
    },
    enabled: !!currentPG?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    placeholderData: (prev) => prev, // keep old data visible during refetch
  });

  const upsertPayment = useMutation({
    mutationFn: async (payment: Omit<TenantPayment, 'id'> & { tenantName?: string; roomNo?: string }) => {
      const { error } = await supabase
        .from('tenant_payments')
        .upsert({
          tenant_id: payment.tenantId,
          month: payment.month,
          year: payment.year,
          payment_status: payment.paymentStatus,
          payment_date: payment.paymentDate,
          amount: payment.amount,
          amount_paid: payment.amountPaid,
          payment_entries: payment.paymentEntries,
          notes: payment.notes || null,
          ac_payment_status: payment.acPaymentStatus || 'Pending',
        } as any, {
          onConflict: 'tenant_id,month,year',
        });

      if (error) throw error;

      // Log audit for payment
      const entries = payment.paymentEntries || [];
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        // Always include tenant name - use 'Unknown' as fallback for display purposes
        const tenantDisplay = payment.tenantName 
          ? `${payment.tenantName}${payment.roomNo ? ` (Room ${payment.roomNo})` : ''}`
          : 'Unknown Tenant';
        const recordName = `${tenantDisplay} - ${months[payment.month - 1]} ${payment.year}`;
        
        logAudit.mutate({
          action: entries.length === 1 ? 'create' : 'update',
          tableName: 'tenant_payments',
          recordId: payment.tenantId,
          recordName,
          newData: {
            amount: lastEntry.amount,
            mode: lastEntry.mode,
            type: lastEntry.type,
            date: lastEntry.date,
            totalPaid: payment.amountPaid,
            status: payment.paymentStatus,
            notes: payment.notes,
          },
        });
      }
      
      return payment;
    },
    onMutate: async (newPayment) => {
      const queryKey = ['tenant-payments', currentPG?.id];
      await queryClient.cancelQueries({ queryKey });
      const previousPayments = queryClient.getQueryData<TenantPayment[]>(queryKey);
      
      queryClient.setQueryData<TenantPayment[]>(queryKey, (old = []) => {
        const existingIndex = old.findIndex(
          p => p.tenantId === newPayment.tenantId && p.month === newPayment.month && p.year === newPayment.year
        );
        
        const optimisticPayment: TenantPayment = {
          id: existingIndex >= 0 ? old[existingIndex].id : `temp-${Date.now()}`,
          tenantId: newPayment.tenantId,
          month: newPayment.month,
          year: newPayment.year,
          paymentStatus: newPayment.paymentStatus,
          paymentDate: newPayment.paymentDate,
          amount: newPayment.amount,
          amountPaid: newPayment.amountPaid,
          paymentEntries: newPayment.paymentEntries,
          notes: newPayment.notes,
          acPaymentStatus: newPayment.acPaymentStatus || 'Pending',
        };
        
        if (existingIndex >= 0) {
          const updated = [...old];
          updated[existingIndex] = optimisticPayment;
          return updated;
        }
        return [optimisticPayment, ...old];
      });
      
      return { previousPayments };
    },
    onError: (err: any, _newPayment, context) => {
      if (context?.previousPayments) {
        queryClient.setQueryData(['tenant-payments', currentPG?.id], context.previousPayments);
      }
      toast.error(err?.message || "Failed to record payment");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments', currentPG?.id] });
    },
  });

  const getPaymentForMonth = (tenantId: string, month: number, year: number) => {
    return payments.find(
      p => p.tenantId === tenantId && p.month === month && p.year === year
    );
  };

  const getPreviousMonthOverdue = (month: number, year: number) => {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const overduePayments = payments.filter(
      p => p.month === prevMonth && p.year === prevYear && p.paymentStatus === 'Pending'
    );

    return {
      total: overduePayments.reduce((sum, p) => sum + p.amount, 0),
      count: overduePayments.length,
    };
  };

  const markWhatsappSent = useMutation({
    mutationFn: async ({ tenantId, month, year }: { tenantId: string; month: number; year: number }) => {
      const { error } = await supabase
        .from('tenant_payments')
        .update({
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
        } as any)
        .eq('tenant_id', tenantId)
        .eq('month', month)
        .eq('year', year);

      if (error) throw error;
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update WhatsApp status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments', currentPG?.id] });
    },
  });

  return {
    payments,
    isLoading,
    error,
    upsertPayment,
    getPaymentForMonth,
    getPreviousMonthOverdue,
    markWhatsappSent,
  };
};
