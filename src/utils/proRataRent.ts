import { parseDateOnly } from './dateOnly';

const msPerDay = 1000 * 60 * 60 * 24;

const toNoon = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  return copy;
};

// Creates a date in a given month, clamping day-of-month to the last valid day.
// Example: clamp(2026, 1(Feb), 31) => 2026-02-28
const makeClampedDate = (year: number, monthIndex: number, day: number) => {
  const targetMonth = new Date(year, monthIndex, 1).getMonth();
  const d = new Date(year, monthIndex, day);
  if (d.getMonth() !== targetMonth) {
    // last day of target month
    return new Date(year, monthIndex + 1, 0);
  }
  return d;
};

/**
 * Billing cycle rule:
 * - If join day is 1: calendar month
 * - Else: tenant-specific monthly cycle anchored on join day
 *   - If tenant joined in selected month: [joinDate .. day-before(joinDay next month)]
 *   - Else: [joinDay prev month .. day-before(joinDay in selected month)]
 */
const getBillingCycle = (joinDate: Date, year: number, month: number) => {
  const joinDay = joinDate.getDate();
  const joinedThisMonth = joinDate.getFullYear() === year && joinDate.getMonth() + 1 === month;

  if (joinDay === 1) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  }

  const start = joinedThisMonth
    ? new Date(joinDate)
    : makeClampedDate(year, month - 2, joinDay);

  const nextCycleStart = makeClampedDate(year, joinedThisMonth ? month : month - 1, joinDay);
  const end = new Date(nextCycleStart);
  end.setDate(end.getDate() - 1);

  return { start, end };
};

/**
 * Calculate pro-rata rent for a tenant who left mid-month.
 * Uses joining date to leave date for accurate calculation.
 * 
 * @param monthlyRent - The tenant's full monthly rent
 * @param startDate - The tenant's join date (YYYY-MM-DD)
 * @param endDate - The tenant's leave date (YYYY-MM-DD), optional
 * @param year - The billing year
 * @param month - The billing month (1-12)
 * @param amountAlreadyPaid - Amount already paid for this month
 * @returns The effective rent amount for the month
 */
export const calculateProRataRent = (
  monthlyRent: number,
  startDate: string,
  endDate: string | undefined,
  year: number,
  month: number,
  amountAlreadyPaid: number = 0
): { effectiveRent: number; daysStayed: number; isProRata: boolean; dailyRate: number } => {
  const joinDate = parseDateOnly(startDate);

  const { start: cycleStart, end: cycleEnd } = getBillingCycle(joinDate, year, month);
  const cycleDays = Math.max(1, Math.round((toNoon(cycleEnd).getTime() - toNoon(cycleStart).getTime()) / msPerDay) + 1);

  // If no end date, return full monthly rent (no pro-rata)
  if (!endDate) {
    return {
      effectiveRent: monthlyRent,
      daysStayed: cycleDays,
      isProRata: false,
      dailyRate: Math.round(monthlyRent / 30),
    };
  }

  const leaveDate = parseDateOnly(endDate);

  // Check if leave date falls within this billing cycle
  const leaveNoon = toNoon(leaveDate);
  const isLeavingThisCycle = leaveNoon >= toNoon(cycleStart) && leaveNoon <= toNoon(cycleEnd);

  if (!isLeavingThisCycle) {
    return {
      effectiveRent: monthlyRent,
      daysStayed: cycleDays,
      isProRata: false,
      dailyRate: Math.round(monthlyRent / 30),
    };
  }

  // Option A: If tenant already paid full monthly rent or more, skip pro-rata
  if (amountAlreadyPaid >= monthlyRent) {
    return { effectiveRent: monthlyRent, daysStayed: cycleDays, isProRata: false, dailyRate: Math.round(monthlyRent / 30) };
  }

  // Calculate days stayed in this billing cycle
  // Start date for calculation is either cycle start or join date (whichever is later)
  const effectiveStart = joinDate > cycleStart ? joinDate : cycleStart;
  
  // Days stayed = leave date - effective start + 1 (inclusive of both dates)
  // Formula: leaveDay - startDay + 1 (e.g., 21 - 2 + 1 = 20 days)
  // Use noon times to avoid timezone edge cases
  const startNoon = toNoon(effectiveStart);
  const daysStayed = Math.max(1, Math.round((leaveNoon.getTime() - startNoon.getTime()) / msPerDay) + 1);
  
  // Pro-rata calculation: (daily rate × days stayed)
  // Using 30 as the standard month for daily rate calculation
  const dailyRate = Math.round(monthlyRent / 30);
  const effectiveRent = dailyRate * daysStayed;

  return { 
    effectiveRent: Math.min(effectiveRent, monthlyRent), // Cap at monthly rent
    daysStayed, 
    isProRata: true,
    dailyRate
  };
};