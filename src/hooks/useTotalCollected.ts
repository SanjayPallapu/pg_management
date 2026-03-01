import { useMemo } from 'react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { usePG } from '@/contexts/PGContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/proxyClient';
import { PaymentEntry, Room } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { getTotalRefunded } from '@/utils/refundStore';

interface TotalCollectedResult {
  totalCollected: number;
  thisMonthRent: number;
  overdueCollected: number;
  dayGuestRevenue: number;
  securityDeposits: { total: number; upi: number; cash: number };
  extraAmounts: number;
  totalRefunded: number;
  isLoading: boolean;
}

/**
 * Single source of truth for total collected calculation.
 * Used by TotalCollectedCard, BalanceCard, Dashboard (PersonalExpensesCard).
 */
export const useTotalCollected = (roomsOverride?: Room[]): TotalCollectedResult => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, isLoading: paymentsLoading } = useTenantPayments();
  const { rooms: fetchedRooms, isLoading: roomsLoading } = useRooms();
  const { currentPG } = usePG();

  const rooms = roomsOverride || fetchedRooms;

  // Day guest revenue - use select to safely extract number from shared cache
  // Dashboard's query with same key may return an object {collected, pending, ...}
  const { data: dayGuestRaw } = useQuery({
    queryKey: ['day-guest-revenue', selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return 0;
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);
      const { data, error } = await supabase
        .from('day_guests')
        .select('amount_paid, rooms!inner(pg_id)')
        .eq('rooms.pg_id', currentPG.id)
        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);
      if (error) return 0;
      return data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
    },
    enabled: !!currentPG?.id,
  });

  // Safely extract a number - cache may hold a number OR an object with .collected
  const dayGuestRevenue = typeof dayGuestRaw === 'number'
    ? dayGuestRaw
    : (dayGuestRaw && typeof dayGuestRaw === 'object' && 'collected' in dayGuestRaw)
      ? (dayGuestRaw as any).collected || 0
      : 0;
  const result = useMemo(() => {
    // This month rent from payment entries
    let thisMonthRent = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (tenant.isLocked) return;
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return;
        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );
        if (payment?.paymentEntries) {
          (payment.paymentEntries as PaymentEntry[]).forEach((entry: PaymentEntry) => {
            thisMonthRent += entry.amount;
          });
        }
      });
    });

    // Overdue collections (previous month payments made in current month)
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }

    let overdueCollected = 0;
    const allTenants = rooms.flatMap(room => room.tenants);
    const prevActive = allTenants.filter(t => isTenantActiveInMonth(t.startDate, t.endDate, prevYear, prevMonth));
    prevActive.forEach(tenant => {
      if (tenant.isLocked) return;
      const payment = payments.find(p => p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear);
      if (!payment) return;
      const entries = (payment.paymentEntries || []) as PaymentEntry[];
      entries.forEach(entry => {
        const d = new Date(entry.date);
        if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear) {
          overdueCollected += entry.amount;
        }
      });
    });

    // Extra amounts from notes
    let extraAmounts = 0;
    const monthTenants = allTenants.filter(t =>
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
    );
    monthTenants.forEach(tenant => {
      if (tenant.isLocked) return;
      const payment = payments.find(
        p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
      );
      if (!payment || !(payment as any).notes) return;
      const m = (payment as any).notes.match(/Extra:\s*₹?([\d,]+)/);
      if (m) extraAmounts += parseInt(m[1].replace(/,/g, '')) || 0;
    });

    // Security deposits this month
    let secTotal = 0, secUpi = 0, secCash = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!tenant.securityDepositAmount || !tenant.securityDepositDate) return;
        const dd = new Date(tenant.securityDepositDate);
        if (dd.getMonth() + 1 === selectedMonth && dd.getFullYear() === selectedYear) {
          secTotal += tenant.securityDepositAmount;
          if (tenant.securityDepositMode === 'upi') secUpi += tenant.securityDepositAmount;
          else if (tenant.securityDepositMode === 'cash') secCash += tenant.securityDepositAmount;
        }
      });
    });

    const totalRefunded = getTotalRefunded(selectedYear, selectedMonth);
    const totalCollected = thisMonthRent + overdueCollected + dayGuestRevenue + secTotal + extraAmounts - totalRefunded;

    return {
      totalCollected,
      thisMonthRent,
      overdueCollected,
      securityDeposits: { total: secTotal, upi: secUpi, cash: secCash },
      extraAmounts,
      totalRefunded,
    };
  }, [rooms, payments, selectedMonth, selectedYear, dayGuestRevenue]);

  return {
    ...result,
    dayGuestRevenue,
    isLoading: paymentsLoading || roomsLoading,
  };
};
