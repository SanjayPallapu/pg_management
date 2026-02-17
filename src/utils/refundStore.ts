/**
 * Lightweight localStorage store for tenant refund tracking.
 * Keyed by `refunds-{year}-{month}`.
 */

interface RefundRecord {
  tenantId: string;
  tenantName: string;
  roomNo: string;
  refundAmount: number;
  paidAt: string; // ISO timestamp
}

const getKey = (year: number, month: number) => `refunds-${year}-${month}`;

export const getRefunds = (year: number, month: number): RefundRecord[] => {
  try {
    const raw = localStorage.getItem(getKey(year, month));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addRefund = (year: number, month: number, record: RefundRecord) => {
  const existing = getRefunds(year, month).filter(r => r.tenantId !== record.tenantId);
  existing.push(record);
  localStorage.setItem(getKey(year, month), JSON.stringify(existing));
};

export const removeRefund = (year: number, month: number, tenantId: string) => {
  const existing = getRefunds(year, month).filter(r => r.tenantId !== tenantId);
  localStorage.setItem(getKey(year, month), JSON.stringify(existing));
};

export const getTotalRefunded = (year: number, month: number): number => {
  return getRefunds(year, month).reduce((sum, r) => sum + r.refundAmount, 0);
};
