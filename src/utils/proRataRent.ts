import { parseDateOnly } from './dateOnly';

/**
 * Calculate pro-rata rent for a tenant who left mid-month.
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
): { effectiveRent: number; daysStayed: number; isProRata: boolean } => {
  // If no end date, return full monthly rent
  if (!endDate) {
    return { effectiveRent: monthlyRent, daysStayed: 30, isProRata: false };
  }

  const joinDate = parseDateOnly(startDate);
  const leaveDate = parseDateOnly(endDate);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // Last day of month
  const daysInMonth = monthEnd.getDate();

  // Check if leave date falls within this billing month
  const isLeavingThisMonth = leaveDate.getMonth() + 1 === month && leaveDate.getFullYear() === year;
  
  if (!isLeavingThisMonth) {
    return { effectiveRent: monthlyRent, daysStayed: daysInMonth, isProRata: false };
  }

  // Option A: If tenant already paid full monthly rent or more, skip pro-rata
  if (amountAlreadyPaid >= monthlyRent) {
    return { effectiveRent: monthlyRent, daysStayed: daysInMonth, isProRata: false };
  }

  // Calculate days stayed in this month
  // Start date for calculation is either 1st of month or join date (whichever is later)
  const effectiveStart = joinDate > monthStart ? joinDate : monthStart;
  
  // Days stayed = leave date - effective start (leave date is exclusive - they left on that day)
  const daysStayed = Math.max(1, Math.ceil((leaveDate.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Pro-rata calculation: (daily rate × days stayed)
  // Using 30 as the standard month for daily rate calculation
  const dailyRate = monthlyRent / 30;
  const effectiveRent = Math.round(dailyRate * daysStayed);

  return { 
    effectiveRent: Math.min(effectiveRent, monthlyRent), // Cap at monthly rent
    daysStayed, 
    isProRata: true 
  };
};