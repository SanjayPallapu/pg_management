import type { ExpenseCategory } from "@/hooks/useExpenseEntries";

export type BillPaymentMethod = "UPI" | "Cash" | "Record Only";
export type BillPaymentStatus = "Paid" | "Failed" | "Pending" | "Partially Paid" | "Unpaid";

export interface ParsedUpiQr {
  payeeUpiId: string;
  payeeName: string | null;
  transactionNote: string | null;
  currency: "INR";
  amount: number | null;
  paymentParameters: Record<string, string>;
}

export interface BillPaymentRequest {
  category: ExpenseCategory;
  categoryName: string;
  billCategoryId: string;
  label?: string;
  subcategory?: string | null;
  floor?: number | null;
  lockLabel?: boolean;
  suggestedAmount?: number;
}

export interface BillPaymentDraft extends BillPaymentRequest {
  transactionId: string;
  amount: number;
  paymentMethod: BillPaymentMethod;
  status: BillPaymentStatus;
  note: string | null;
  payeeName: string | null;
  maskedUpiId: string | null;
  upiAttempted: boolean;
  paymentDate?: string | null;
}

export interface BillPaymentTransaction extends BillPaymentDraft {
  id: string;
  pgId: string;
  expenseEntryId: string | null;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
}
