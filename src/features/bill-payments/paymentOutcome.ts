import type { BillPaymentMethod, BillPaymentStatus, ParsedUpiQr } from "./types";

export type UpiOutcome = "success" | "cash" | "cancel";

export interface ResolvedUpiOutcome {
  shouldRecord: boolean;
  paymentMethod?: BillPaymentMethod;
  status?: BillPaymentStatus;
  note?: string;
}

export const resolveUpiOutcome = (outcome: UpiOutcome, qr?: ParsedUpiQr | null): ResolvedUpiOutcome => {
  const payee = qr?.payeeName ? ` to ${qr.payeeName}` : "";
  switch (outcome) {
    case "success":
      return { shouldRecord: true, paymentMethod: "UPI", status: "Paid", note: `UPI payment completed${payee}` };
    case "cash":
      return { shouldRecord: true, paymentMethod: "Cash", status: "Paid", note: `UPI attempted${payee}, payment completed using cash` };
    case "cancel":
    default:
      return { shouldRecord: false, paymentMethod: "Record Only", status: "Unpaid" };
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
