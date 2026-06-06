// Centralized pricing and configuration constants

export const MONTHS = [
  { value: 1, label: "January", short: "Jan" },
  { value: 2, label: "February", short: "Feb" },
  { value: 3, label: "March", short: "Mar" },
  { value: 4, label: "April", short: "Apr" },
  { value: 5, label: "May", short: "May" },
  { value: 6, label: "June", short: "Jun" },
  { value: 7, label: "July", short: "Jul" },
  { value: 8, label: "August", short: "Aug" },
  { value: 9, label: "September", short: "Sep" },
  { value: 10, label: "October", short: "Oct" },
  { value: 11, label: "November", short: "Nov" },
  { value: 12, label: "December", short: "Dec" },
] as const;

export const FLOOR_NAMES: Record<number, string> = {
  1: "1st Floor",
  2: "2nd Floor",
  3: "3rd Floor",
};

// Per-bed pricing based on room sharing capacity
export const BED_PRICING: Record<number, number> = {
  1: 11500,
  2: 6000,
  3: 5000,
  4: 4500,
  5: 4000,
};

// Default fallback price per bed
export const DEFAULT_BED_PRICE = 4000;

/**
 * Get rent per bed based on room capacity/sharing type
 */
export const getPricePerBed = (capacity: number): number => {
  return BED_PRICING[capacity] ?? DEFAULT_BED_PRICE;
};

/**
 * Get floor display name
 */
export const getFloorName = (floor: number): string => {
  return FLOOR_NAMES[floor] ?? `Floor ${floor}`;
};

/**
 * Get month label by value (1-indexed)
 */
export const getMonthLabel = (month: number): string => {
  return MONTHS[month - 1]?.label ?? "";
};

/**
 * Get month short label by value (1-indexed)
 */
export const getMonthShortLabel = (month: number): string => {
  return MONTHS[month - 1]?.short ?? "";
};

/**
 * Format month and year for display
 */
export const formatMonthYear = (month: number, year: number): string => {
  return `${getMonthLabel(month)} ${year}`;
};

/**
 * Get years array for selectors (current year ± 2)
 */
export const getYearsRange = (range: number = 2): number[] => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: range * 2 + 1 }, (_, i) => currentYear - range + i);
};
