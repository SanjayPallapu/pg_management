import { useMemo } from 'react';
import { Room, Tenant, TenantPayment } from '@/types';
import { isTenantActiveInMonth, hasTenantLeftNow } from '@/utils/dateOnly';
import { calculateProRataRent } from '@/utils/proRataRent';

export type PaymentCategory = 'paid' | 'partial' | 'overdue' | 'not-due' | 'advance-not-paid';

export interface TenantWithPayment extends Tenant {
  roomNo: string;
  paymentCategory: PaymentCategory;
  paymentDate?: string;
  amountPaid?: number;
  isLocked?: boolean;
  effectiveRent?: number;
  daysStayed?: number;
  isProRata?: boolean;
  hasLeftNow?: boolean;
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

    // Get all tenants active in the selected month (including left tenants for collection totals)
    const allActiveTenants: TenantWithPayment[] = rooms.flatMap(room =>
      room.tenants
        .filter(tenant => {
          // Tenant must have been active in the selected month
          return isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth);
        })
        .map(tenant => {
          const payment = payments.find(
            p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
          );

          const joinDate = new Date(tenant.startDate);
          const hasLeftNow = hasTenantLeftNow(tenant.endDate);

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
          
          // Calculate pro-rata rent for mid-month leavers
          const amountPaid = payment?.amountPaid || 0;
          const { effectiveRent, daysStayed, isProRata } = calculateProRataRent(
            tenant.monthlyRent,
            tenant.startDate,
            tenant.endDate,
            selectedYear,
            selectedMonth,
            amountPaid
          );
          
          let paymentCategory: PaymentCategory;
          
          // For pro-rata: check if paid amount meets effective rent (not full monthly rent)
          const targetRent = isProRata ? effectiveRent : tenant.monthlyRent;
          
          if (payment?.paymentStatus === 'Paid' || (amountPaid >= targetRent && targetRent > 0)) {
            paymentCategory = 'paid';
          }
          else if (payment?.paymentStatus === 'Partial' || (amountPaid > 0 && amountPaid < targetRent)) {
            paymentCategory = 'partial';
          }
          else if (isPastMonth) {
            paymentCategory = 'overdue';
          }
          else if (isFutureMonth) {
            paymentCategory = 'not-due';
          }
          else if (isCurrentMonth) {
            // Current month logic: compare today's date with tenant's due day (joining day)
            // If todayDate >= tenantDueDay, it's "advance-not-paid" (due date passed or is today)
            // If todayDate < tenantDueDay, it's "not-due" (due date hasn't come yet)
            if (todayDate >= tenantDueDay) {
              paymentCategory = 'advance-not-paid';
            } else {
              paymentCategory = 'not-due';
            }
          } else {
            paymentCategory = 'not-due';
          }

          return {
            ...tenant,
            roomNo: room.roomNo,
            paymentCategory,
            paymentDate: payment?.paymentDate,
            amountPaid,
            effectiveRent,
            daysStayed,
            isProRata,
            hasLeftNow, // Track if tenant has left
          };
        })
    );

    // For display purposes (pending/overdue lists), exclude left tenants
    const eligibleTenants = allActiveTenants.filter(t => !t.hasLeftNow);

    // Filter by category (for display lists - excludes left tenants)
    const paidTenants = eligibleTenants.filter(t => t.paymentCategory === 'paid');
    const partialTenants = eligibleTenants.filter(t => t.paymentCategory === 'partial');
    const overdueTenants = eligibleTenants.filter(t => t.paymentCategory === 'overdue');
    const advanceNotPaidTenants = eligibleTenants.filter(t => t.paymentCategory === 'advance-not-paid');
    const notDueTenants = eligibleTenants.filter(t => t.paymentCategory === 'not-due');

    // Calculate totals - use allActiveTenants to INCLUDE left tenants' payments in collection totals
    // But exclude locked tenants from calculations
    const unlockedAllTenants = allActiveTenants.filter(t => !t.isLocked);
    const unlockedPaidAll = unlockedAllTenants.filter(t => t.paymentCategory === 'paid');
    const unlockedPartialAll = unlockedAllTenants.filter(t => t.paymentCategory === 'partial');
    
    // For totalRent and pendingRent, only count tenants who haven't left yet
    const unlockedTenants = eligibleTenants.filter(t => !t.isLocked);
    
    // Use effective rent (pro-rata) for totals
    const totalRent = unlockedTenants.reduce((sum, t) => sum + (t.effectiveRent || t.monthlyRent), 0);
    
    // CRITICAL: Use ACTUAL amount_paid from DB (what tenant actually paid), NOT calculated effective rent
    // This ensures Divya's ₹1800 payment shows as ₹1800 in totals, not ₹1667 (pro-rata)
    const rentCollected = unlockedPaidAll.reduce((sum, t) => sum + (t.amountPaid || 0), 0) + 
                          unlockedPartialAll.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
    
    // Pending rent only counts non-left tenants
    const totalPending = unlockedTenants
      .filter(t => t.paymentCategory !== 'paid')
      .reduce((sum, t) => {
        const targetRent = t.effectiveRent || t.monthlyRent;
        if (t.paymentCategory === 'partial') {
          return sum + Math.max(0, targetRent - (t.amountPaid || 0));
        }
        return sum + targetRent;
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
