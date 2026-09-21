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
  daysUntilDue?: number;
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

          // Rent cycle start date for the selected month
          const daysInSelectedMonth = new Date(selectedYear, selectedMonth, 0).getDate();
          const actualCycleStartDay = Math.min(joinDay, daysInSelectedMonth);
          const cycleStartDate = new Date(selectedYear, selectedMonth - 1, actualCycleStartDay);
          cycleStartDate.setHours(0, 0, 0, 0);

          let agreedDueDate: Date | null = null;
          let daysUntilDue: number | undefined = undefined;

          if (hasAgreedDelay) {
            if (tenant.paymentDueDay! >= joinDay) {
              // Agreed due date is within the same month
              const actualDueDay = Math.min(tenant.paymentDueDay!, daysInSelectedMonth);
              agreedDueDate = new Date(selectedYear, selectedMonth - 1, actualDueDay);
            } else {
              // Agreed due date is in the next month (e.g., joined on 18th, pays on 4th of following month)
              let nextYear = selectedYear;
              let nextMonth = selectedMonth + 1;
              if (nextMonth > 12) {
                nextMonth = 1;
                nextYear += 1;
              }
              const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
              const actualDueDay = Math.min(tenant.paymentDueDay!, daysInNextMonth);
              agreedDueDate = new Date(nextYear, nextMonth - 1, actualDueDay);
            }
            agreedDueDate.setHours(0, 0, 0, 0);

            // Calendar day diff: positive = days remaining, negative = days overdue
            const diffMs = agreedDueDate.getTime() - today.getTime();
            daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24));
          }

          // Tenant is within agreed delay grace period if:
          // 1. Owner explicitly configured an agreed payment day
          // 2. The rent cycle has started (today >= cycleStartDate)
          // 3. Today's date has NOT passed their agreed payment day yet (today <= agreedDueDate)
          const isDelayedWithinGrace = Boolean(
            hasAgreedDelay &&
            agreedDueDate &&
            today.getTime() >= cycleStartDate.getTime() &&
            today.getTime() <= agreedDueDate.getTime()
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
          else if (isFutureMonth) {
            paymentCategory = 'not-due';
          }
          else if (hasAgreedDelay && agreedDueDate) {
            if (today.getTime() < cycleStartDate.getTime()) {
              paymentCategory = 'not-due';
            } else if (today.getTime() <= agreedDueDate.getTime()) {
              paymentCategory = 'delayed';
            } else if (isPastMonth) {
              paymentCategory = 'overdue';
            } else {
              paymentCategory = 'advance-not-paid';
            }
          }
          else if (isPastMonth) {
            paymentCategory = 'overdue';
          }
          else if (isCurrentMonth) {
            if (today.getTime() < cycleStartDate.getTime()) {
              paymentCategory = 'not-due';
            } else {
              paymentCategory = 'advance-not-paid';
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
            daysUntilDue,
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
    
    // Pending rent only counts non-left tenants and excludes not-due and agreed delayed tenants
    // Only adds agreed delayed tenants once their agreed day arrives / passes
    const totalPending = unlockedTenants
      .filter(t => t.paymentCategory !== 'paid' && t.paymentCategory !== 'not-due' && t.paymentCategory !== 'delayed' && !t.isDelayed)
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
