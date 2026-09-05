import { useMemo } from 'react';
import { Room, Tenant, TenantPayment } from '@/types';
import { isTenantActiveInMonth, hasTenantLeftNow, parseDateOnly, getISTTodayOnly } from '@/utils/dateOnly';
import { calculateProRataRent } from '@/utils/proRataRent';

export type PaymentCategory = 'paid' | 'partial' | 'overdue' | 'not-due' | 'advance-not-paid' | 'delayed';

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
  isDelayed?: boolean;
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
  delayedTenants: TenantWithPayment[];
}

export const useRentCalculations = ({
  selectedMonth,
  selectedYear,
  rooms,
  payments,
}: UseRentCalculationsProps): RentCalculationsResult => {
  return useMemo(() => {
    const todayIST = getISTTodayOnly();
    const currentMonth = todayIST.getMonth() + 1;
    const currentYear = todayIST.getFullYear();

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

          const joinDate = parseDateOnly(tenant.startDate);
          const hasLeftNow = hasTenantLeftNow(tenant.endDate);

          const today = getISTTodayOnly();
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
          
          // Tenant's base due day = joining day (1–31)
          const joinDay = joinDate.getDate();
          
          // An agreed delay is configured if paymentDueDay is set and valid
          const hasAgreedDelay = typeof tenant.paymentDueDay === 'number' && tenant.paymentDueDay >= 1 && tenant.paymentDueDay <= 31;
          const effectiveDueDay = hasAgreedDelay ? tenant.paymentDueDay! : joinDay;
          
          // Tenant is within agreed delay grace period if:
          // 1. Owner explicitly configured an agreed payment day
          // 2. We are in the current month
          // 3. Today's date has NOT passed their agreed payment day yet (todayDate <= effectiveDueDay)
          const isDelayedWithinGrace = Boolean(
            hasAgreedDelay &&
            isCurrentMonth &&
            todayDate <= effectiveDueDay
          );

          // Calculate pro-rata rent for mid-month leavers
          // Prefer amountPaid from DB; fallback to summing paymentEntries if amountPaid is 0/missing
          let amountPaid = payment?.amountPaid || 0;
          if (amountPaid === 0 && payment?.paymentEntries?.length) {
            amountPaid = payment.paymentEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0);
          }
          const { effectiveRent, daysStayed, isProRata } = calculateProRataRent(
            tenant.monthlyRent,
            tenant.startDate,
            tenant.endDate,
            selectedYear,
            selectedMonth,
            amountPaid
          );
          
          let paymentCategory: PaymentCategory;
          
          // Helper to parse discount from notes
          const discount = payment?.notes ? (payment.notes.match(/Discount:\s*₹?(\d+)/i) ? parseInt(payment.notes.match(/Discount:\s*₹?(\d+)/i)![1], 10) : 0) : 0;

          const baseTargetRent = isProRata ? effectiveRent : tenant.monthlyRent;
          const targetRent = Math.max(0, baseTargetRent - discount);
          
          if (payment?.paymentStatus === 'Paid' || (amountPaid + discount >= baseTargetRent && baseTargetRent > 0) || (amountPaid >= targetRent && targetRent >= 0)) {
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
            if (isDelayedWithinGrace) {
              paymentCategory = 'delayed';
            } else if (todayDate >= effectiveDueDay) {
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
            isDelayed: isDelayedWithinGrace,
          };
        })
    );

    // For display purposes (pending/overdue lists), exclude left tenants
    const eligibleTenants = allActiveTenants.filter(t => !t.hasLeftNow);

    // Filter by category (for display lists - excludes left tenants)
    const paidTenants = eligibleTenants.filter(t => t.paymentCategory === 'paid');
    const delayedTenants = eligibleTenants.filter(t => t.paymentCategory === 'delayed' || (t.paymentCategory === 'partial' && t.isDelayed));
    const partialTenants = eligibleTenants.filter(t => t.paymentCategory === 'partial' && !t.isDelayed);
    const overdueTenants = eligibleTenants.filter(t => t.paymentCategory === 'overdue' && !t.isDelayed);
    const advanceNotPaidTenants = eligibleTenants.filter(t => t.paymentCategory === 'advance-not-paid' && !t.isDelayed);
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
    
    // Pending rent only counts non-left tenants and excludes not-due tenants
    const totalPending = unlockedTenants
      .filter(t => t.paymentCategory !== 'paid' && t.paymentCategory !== 'not-due')
      .reduce((sum, t) => {
        const payment = payments.find(p => p.tenantId === t.id && p.month === selectedMonth && p.year === selectedYear);
        const discount = payment?.notes ? (payment.notes.match(/Discount:\s*₹?(\d+)/i) ? parseInt(payment.notes.match(/Discount:\s*₹?(\d+)/i)![1], 10) : 0) : 0;
        const targetRent = Math.max(0, (t.effectiveRent || t.monthlyRent) - discount);
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
      delayedTenants,
    };
  }, [selectedMonth, selectedYear, rooms, payments]);
};
