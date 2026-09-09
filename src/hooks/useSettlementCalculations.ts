import { useMemo, useState, useCallback } from 'react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { parseDateOnly } from '@/utils/dateOnly';
import { calculateProRataRent } from '@/utils/proRataRent';
import { getMonthLabel } from '@/constants/pricing';
import { addRefund, removeRefund, getRefunds } from '@/utils/refundStore';

export interface SettlementTenant {
  id: string;
  name: string;
  phone: string;
  roomNo: string;
  capacity: number;
  monthlyRent: number;
  startDate: string;
  endDate?: string;
  effectiveRent: number;
  daysStayed: number;
  isProRata: boolean;
  dailyRate: number;
  discount: number;
  extra: number;
  finalDue: number;
  amountPaid: number;
  balance: number;
  refundDue: number;
  isRefunded: boolean;
  refundPaidAt?: string;
  status: 'Settled' | 'Partial' | 'Pending' | 'Refund Pending' | 'Refunded';
}

export interface SettlementSummary {
  totalDue: number;
  totalPaid: number;
  totalBalance: number;
  totalDiscount: number;
  totalExtra: number;
  totalRefundDue: number;
  totalRefunded: number;
  pendingRefundAmount: number;
  leftCount: number;
  settledCount: number;
  pendingCount: number;
  refundEligibleCount: number;
  refundPendingCount: number;
}

export const useSettlementCalculations = (
  rooms: Room[],
  customMonth?: number,
  customYear?: number
) => {
  const { selectedMonth: contextMonth, selectedYear: contextYear } = useMonthContext();
  const selectedMonth = customMonth ?? contextMonth;
  const selectedYear = customYear ?? contextYear;
  const { payments } = useTenantPayments();

  // Local state to trigger re-renders when refunds are updated
  const [refundRefreshKey, setRefundRefreshKey] = useState(0);

  const leftTenants = useMemo(() => {
    const refundsInStore = getRefunds(selectedYear, selectedMonth);
    const refundMap = new Map(refundsInStore.map(r => [r.tenantId, r]));

    const allTenants = rooms.flatMap(room =>
      room.tenants.map(tenant => ({
        ...tenant,
        roomNo: room.roomNo,
        capacity: room.capacity,
      }))
    );

    // Filter tenants who left in this month
    return allTenants
      .filter(tenant => {
        if (!tenant.endDate) return false;
        const endDate = parseDateOnly(tenant.endDate);
        return (
          endDate.getMonth() + 1 === selectedMonth &&
          endDate.getFullYear() === selectedYear
        );
      })
      .map(tenant => {
        // Get payment for this month
        const payment = payments.find(
          p =>
            p.tenantId === tenant.id &&
            p.month === selectedMonth &&
            p.year === selectedYear
        );

        const amountPaid = payment?.amountPaid || 0;

        // Calculate pro-rata rent for actual days stayed
        const { effectiveRent, daysStayed, isProRata, dailyRate } = calculateProRataRent(
          tenant.monthlyRent,
          tenant.startDate,
          tenant.endDate,
          selectedYear,
          selectedMonth,
          amountPaid
        );

        // Parse notes for discount/extra
        let discount = 0;
        let extra = 0;
        if (payment?.notes) {
          const discountMatch = payment.notes.match(/Discount:\s*₹?([\d,]+)/);
          const extraMatch = payment.notes.match(/Extra:\s*₹?([\d,]+)/);
          if (discountMatch) discount = parseInt(discountMatch[1].replace(/,/g, ''), 10) || 0;
          if (extraMatch) extra = parseInt(extraMatch[1].replace(/,/g, ''), 10) || 0;
        }

        const finalDue = Math.max(0, effectiveRent - discount + extra);
        const balance = finalDue - amountPaid;
        const refundDue = amountPaid > finalDue ? amountPaid - finalDue : 0;
        const storedRefund = refundMap.get(tenant.id);
        const isRefunded = !!storedRefund;

        let status: SettlementTenant['status'];
        if (refundDue > 0) {
          status = isRefunded ? 'Refunded' : 'Refund Pending';
        } else if (amountPaid >= finalDue) {
          status = 'Settled';
        } else if (amountPaid > 0) {
          status = 'Partial';
        } else {
          status = 'Pending';
        }

        return {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          roomNo: tenant.roomNo,
          capacity: tenant.capacity,
          monthlyRent: tenant.monthlyRent,
          startDate: tenant.startDate,
          endDate: tenant.endDate,
          effectiveRent,
          daysStayed,
          isProRata,
          dailyRate,
          discount,
          extra,
          finalDue,
          amountPaid,
          balance: Math.max(0, balance),
          refundDue,
          isRefunded,
          refundPaidAt: storedRefund?.paidAt,
          status,
        } as SettlementTenant;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms, payments, selectedMonth, selectedYear, refundRefreshKey]);

  // Summary statistics
  const summary = useMemo<SettlementSummary>(() => {
    const totalDue = leftTenants.reduce((sum, t) => sum + t.finalDue, 0);
    const totalPaid = leftTenants.reduce((sum, t) => sum + t.amountPaid, 0);
    const totalBalance = leftTenants.reduce((sum, t) => sum + t.balance, 0);
    const totalDiscount = leftTenants.reduce((sum, t) => sum + t.discount, 0);
    const totalExtra = leftTenants.reduce((sum, t) => sum + t.extra, 0);
    const totalRefundDue = leftTenants.reduce((sum, t) => sum + t.refundDue, 0);
    const totalRefunded = leftTenants.filter(t => t.isRefunded).reduce((sum, t) => sum + t.refundDue, 0);
    const pendingRefundAmount = leftTenants.filter(t => t.refundDue > 0 && !t.isRefunded).reduce((sum, t) => sum + t.refundDue, 0);

    const settledCount = leftTenants.filter(t => t.status === 'Settled' || t.status === 'Refunded').length;
    const pendingCount = leftTenants.filter(t => t.balance > 0).length;
    const refundEligibleCount = leftTenants.filter(t => t.refundDue > 0).length;
    const refundPendingCount = leftTenants.filter(t => t.refundDue > 0 && !t.isRefunded).length;

    return {
      totalDue,
      totalPaid,
      totalBalance,
      totalDiscount,
      totalExtra,
      totalRefundDue,
      totalRefunded,
      pendingRefundAmount,
      leftCount: leftTenants.length,
      settledCount,
      pendingCount,
      refundEligibleCount,
      refundPendingCount,
    };
  }, [leftTenants]);

  // Actions for marking refunds
  const markRefundPaid = useCallback(
    (tenant: SettlementTenant, customAmount?: number) => {
      const amount = customAmount ?? tenant.refundDue;
      addRefund(selectedYear, selectedMonth, {
        tenantId: tenant.id,
        tenantName: tenant.name,
        roomNo: tenant.roomNo,
        refundAmount: amount,
        paidAt: new Date().toISOString(),
      });
      setRefundRefreshKey(k => k + 1);
    },
    [selectedYear, selectedMonth]
  );

  const markRefundUnpaid = useCallback(
    (tenantId: string) => {
      removeRefund(selectedYear, selectedMonth, tenantId);
      setRefundRefreshKey(k => k + 1);
    },
    [selectedYear, selectedMonth]
  );

  const monthName = getMonthLabel(selectedMonth);

  return {
    leftTenants,
    summary,
    selectedMonth,
    selectedYear,
    monthName,
    markRefundPaid,
    markRefundUnpaid,
    refreshRefunds: () => setRefundRefreshKey(k => k + 1),
  };
};
