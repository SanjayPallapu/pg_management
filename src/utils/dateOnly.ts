// Date helpers for YYYY-MM-DD strings (date-only) without timezone shifts

export const parseDateOnly = (dateStr: any) => {
  if (!dateStr) return new Date(NaN);
  if (dateStr instanceof Date) return dateStr;
  const str = typeof dateStr === 'string' ? dateStr : String(dateStr);
  const [year, month, day] = str.substring(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getMonthStartEnd = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
};

// Returns today's date in Asia/Kolkata (IST) timezone
export const getISTTodayOnly = () => {
  const today = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(today);
    const y = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
    const m = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
    const d = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
    return new Date(y, m - 1, d);
  } catch (e) {
    // Fallback to local time if Intl/timezone is not supported
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
};

// Active means: joined on/before month end AND (no end date OR left AFTER month start)
// Note: endDate is exclusive (tenant is NOT active on their endDate)
export const isTenantActiveInMonth = (
  startDate: string,
  endDate: string | undefined,
  year: number,
  month: number
) => {
  const { start: monthStart, end: monthEnd } = getMonthStartEnd(year, month);

  const joinDate = parseDateOnly(startDate);
  if (joinDate > monthEnd) return false;

  if (!endDate) return true;
  const leaveDate = parseDateOnly(endDate);

  // If endDate is the 1st of the month, tenant already left before this month began
  return leaveDate > monthStart;
};

// Active now means: joined on/before today AND (has NOT left OR endDate is today or in the future)
// Note: Tenant is considered active on their endDate
export const isTenantActiveNow = (startDate: string, endDate: string | undefined) => {
  const todayOnly = getISTTodayOnly();
  const joinDate = parseDateOnly(startDate);
  
  if (joinDate > todayOnly) return false; // hasn't joined yet
  
  if (!endDate) return true; // no end date means still active
  
  const leaveDate = parseDateOnly(endDate);
  return leaveDate >= todayOnly; // if endDate is today or in the future, still active
};

export const tenantLeftInMonth = (endDate: string | undefined, year: number, month: number) => {
  if (!endDate) return false;
  const { start: monthStart, end: monthEnd } = getMonthStartEnd(year, month);
  const leaveDate = parseDateOnly(endDate);
  return leaveDate >= monthStart && leaveDate <= monthEnd;
};

export const tenantJoinedInMonth = (startDate: string, year: number, month: number) => {
  const { start: monthStart, end: monthEnd } = getMonthStartEnd(year, month);
  const joinDate = parseDateOnly(startDate);
  return joinDate >= monthStart && joinDate <= monthEnd;
};

// Left now means: endDate exists AND endDate is in the past (before today)
export const hasTenantLeftNow = (endDate: string | undefined) => {
  if (!endDate) return false;
  const todayOnly = getISTTodayOnly();
  const leaveDate = parseDateOnly(endDate);
  return leaveDate < todayOnly;
};

