// Date helpers for YYYY-MM-DD strings (date-only) without timezone shifts

export const parseDateOnly = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getMonthStartEnd = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
};

// Active means: joined on/before month end AND (no end date OR left on/after month start)
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
  return leaveDate >= monthStart;
};

// Active now means: joined on/before today AND (has NOT left OR endDate is in the future)
export const isTenantActiveNow = (startDate: string, endDate: string | undefined) => {
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const joinDate = parseDateOnly(startDate);
  
  if (joinDate > todayOnly) return false; // hasn't joined yet
  
  if (!endDate) return true; // no end date means still active
  
  const leaveDate = parseDateOnly(endDate);
  return leaveDate > todayOnly; // if endDate is in the future, still active
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
