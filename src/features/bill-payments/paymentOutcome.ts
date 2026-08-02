import type { BillPaymentMethod, BillPaymentStatus } from "./types";

export type UpiOutcome = "success" | "failed" | "cash" | "pending" | "cancel";

export const resolveUpiOutcome = (outcome: UpiOutcome): {
  shouldRecord: boolean;
  method?: BillPaymentMethod;
  status?: BillPaymentStatus;
  note?: string;
} => {
  switch (outcome) {
    case "success": return { shouldRecord: true, method: "UPI", status: "Paid" };
    case "failed": return { shouldRecord: true, method: "UPI", status: "Failed" };
    case "pending": return { shouldRecord: true, method: "UPI", status: "Pending" };
    case "cash": return { shouldRecord: true, method: "Cash", status: "Paid", note: "UPI attempted, payment completed using cash" };
    case "cancel": return { shouldRecord: false };
  }
};

export class DuplicatePaymentGuard {
  private readonly recording = new Set<string>();
  begin(transactionId: string) {
    if (this.recording.has(transactionId)) return false;
    this.recording.add(transactionId);
    return true;
  }
  end(transactionId: string) { this.recording.delete(transactionId); }
}
