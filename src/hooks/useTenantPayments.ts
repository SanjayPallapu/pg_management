import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TenantPayment, PaymentEntry } from '@/types';

export const useTenantPayments = () => {
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['tenant-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_payments')
        .select('*')
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
      })) as TenantPayment[];
    },
  });

  const upsertPayment = useMutation({
    mutationFn: async (payment: Omit<TenantPayment, 'id'>) => {
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
        } as any, {
          onConflict: 'tenant_id,month,year',
        });

      if (error) throw error;
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

  return {
    payments,
    isLoading,
    upsertPayment,
    getPaymentForMonth,
    getPreviousMonthOverdue,
  };
};
