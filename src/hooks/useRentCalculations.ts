import { useMemo } from 'react';
import { Room, Tenant, TenantPayment } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';

export type PaymentCategory = 'paid' | 'partial' | 'overdue' | 'not-due' | 'advance-not-paid';

export interface TenantWithPayment extends Tenant {
  roomNo: string;
  paymentCategory: PaymentCategory;
  paymentDate?: string;
  amountPaid?: number;
}

interface UseRentCalculationsProps {
  selectedMonth: number;
  selectedYear: number;
  rooms: Room[];
  payments: TenantPayment[];
}

interface RentCalculationsResult {
  totalRent: number;
  rentCollected: number;
  pendingRent: number;
  eligibleTenants: TenantWithPayment[];
  paidTenants: TenantWithPayment[];
  partialTenants: TenantWithPayment[];
  overdueTenants: TenantWithPayment[];
  advanceNotPaidTenants: TenantWithPayment[];
  notDueTenants: TenantWithPayment[];
}

export const useRentCalculations = ({
  selectedMonth,
  selectedYear,
  rooms,
  payments,
}: UseRentCalculationsProps): RentCalculationsResult => {
  return useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get all eligible tenants with their payment category
    const eligibleTenants: TenantWithPayment[] = rooms.flatMap(room =>
      room.tenants
        .filter(tenant => {
          // Tenant must be active in the selected month (joined before end of month AND not left before month started)
          return isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth);
        })
        .map(tenant => {
          const payment = payments.find(
            p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
          );

          const joinDate = new Date(tenant.startDate);

          const today = new Date();
          const todayDate = today.getDate();
          
          // Month comparison
          const isPastMonth =
            selectedYear < currentYear ||
            (selectedYear === currentYear && selectedMonth < currentMonth);
          
          const isCurrentMonth =
            selectedYear === currentYear && selectedMonth === currentMonth;
          
          const isFutureMonth =
            selectedYear > currentYear ||
            (selectedYear === currentYear && selectedMonth > currentMonth);
          
          // Tenant's due day = joining day (1–31)
          const tenantDueDay = joinDate.getDate();
          
          let paymentCategory: PaymentCategory;
          
          if (payment?.paymentStatus === 'Paid') {
            paymentCategory = 'paid';
          }
          else if (payment?.paymentStatus === 'Partial') {
            paymentCategory = 'partial';
          }
          else if (isPastMonth) {
            paymentCategory = 'overdue';
          }
          else if (isFutureMonth) {
            paymentCategory = 'not-due';
          }
          else if (isCurrentMonth) {
            // Tenant joined and not paid yet = not-paid (advance-not-paid)
            // Regardless of whether due date has passed or not
            paymentCategory = 'advance-not-paid';
          } else {
            paymentCategory = 'not-due';
          }

          return {
            ...tenant,
            roomNo: room.roomNo,
            paymentCategory,
            paymentDate: payment?.paymentDate,
            amountPaid: payment?.amountPaid || 0,
          };
        })
    );

    // Filter by category
    const paidTenants = eligibleTenants.filter(t => t.paymentCategory === 'paid');
    const partialTenants = eligibleTenants.filter(t => t.paymentCategory === 'partial');
    const overdueTenants = eligibleTenants.filter(t => t.paymentCategory === 'overdue');
    const advanceNotPaidTenants = eligibleTenants.filter(t => t.paymentCategory === 'advance-not-paid');
    const notDueTenants = eligibleTenants.filter(t => t.paymentCategory === 'not-due');

    // Calculate totals
    const totalRent = eligibleTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
    const rentCollected = paidTenants.reduce((sum, t) => sum + t.monthlyRent, 0) + 
                          partialTenants.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
    const totalPending = eligibleTenants
      .filter(t => t.paymentCategory !== 'paid')
      .reduce((sum, t) => {
        if (t.paymentCategory === 'partial') {
          return sum + (t.monthlyRent - (t.amountPaid || 0));
        }
        return sum + t.monthlyRent;
      }, 0);

    return {
      totalRent,
      rentCollected,
      pendingRent: totalPending,
      eligibleTenants,
      paidTenants,
      partialTenants,
      overdueTenants,
      advanceNotPaidTenants,
      notDueTenants,
    };
  }, [selectedMonth, selectedYear, rooms, payments]);
};
