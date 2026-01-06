import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TenantPayment, PaymentEntry } from '@/types';
import { useAuditLog } from './useAuditLog';

export const useTenantPayments = () => {
  const { logAudit } = useAuditLog();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['tenant-payments'],
    queryFn: async () => {
      // Only fetch payments from the last 13 months for performance
      const currentDate = new Date();
      const cutoffYear = currentDate.getFullYear() - 1;
      
      const { data, error } = await supabase
        .from('tenant_payments')
        .select('*')
        .gte('year', cutoffYear)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      return data.map(payment => ({
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
      })) as TenantPayment[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
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
        } as any, {
          onConflict: 'tenant_id,month,year',
        });

      if (error) throw error;

      // Log audit for payment
      const entries = payment.paymentEntries || [];
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        logAudit.mutate({
          action: entries.length === 1 ? 'create' : 'update',
          tableName: 'tenant_payments',
          recordId: payment.tenantId,
          recordName: payment.tenantName ? `${payment.tenantName}${payment.roomNo ? ` (Room ${payment.roomNo})` : ''} - ${months[payment.month - 1]} ${payment.year}` : undefined,
          newData: {
            amount: lastEntry.amount,
            mode: lastEntry.mode,
            type: lastEntry.type,
            date: lastEntry.date,
            totalPaid: payment.amountPaid,
            status: payment.paymentStatus,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
    },
  });

  return {
    payments,
    isLoading,
    upsertPayment,
    getPaymentForMonth,
    getPreviousMonthOverdue,
    markWhatsappSent,
  };
};
