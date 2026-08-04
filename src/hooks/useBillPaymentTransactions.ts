import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import type { BillPaymentDraft } from "@/features/bill-payments/types";

// These tables/RPCs are not present in the generated Supabase types yet.
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export interface BillPaymentTransactionRow {
  id: string;
  transaction_id: string;
  label: string;
  category_name: string;
  amount: number;
  payment_method: string;
  status: string;
  paid_at: string;
  note: string | null;
}

export const useBillPaymentTransactions = (month: number, year: number) => {
  const { currentPG } = usePG();
  const queryClient = useQueryClient();
  const queryKey = ["bill_payment_transactions", currentPG?.id, month, year];

  const query = useQuery({
    queryKey,
    enabled: Boolean(currentPG?.id),
    queryFn: async () => {
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 1).toISOString();
      const { data, error } = await db.from("bill_payment_transactions").select("*").eq("pg_id", currentPG!.id).gte("paid_at", start).lt("paid_at", end).order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BillPaymentTransactionRow[];
    },
  });

  const record = useMutation({
    mutationFn: async (draft: BillPaymentDraft) => {
      if (!currentPG?.id) throw new Error("No PG selected");
      const paidAt = draft.paymentDate
        ? new Date(draft.paymentDate + "T12:00:00").toISOString()
        : new Date().toISOString();

      try {
        const { data, error } = await db.rpc("record_bill_payment", {
          p_transaction_id: draft.transactionId,
          p_pg_id: currentPG.id,
          p_bill_category_id: draft.billCategoryId,
          p_category: draft.category,
          p_category_name: draft.categoryName,
          p_label: draft.label || draft.categoryName,
          p_amount: draft.amount,
          p_payment_method: draft.paymentMethod,
          p_status: draft.status,
          p_paid_at: paidAt,
          p_payee_name: draft.payeeName,
          p_masked_upi_id: draft.maskedUpiId,
          p_note: draft.note,
          p_upi_attempted: draft.upiAttempted,
          p_subcategory: draft.subcategory ?? null,
          p_floor: draft.floor ?? null,
          p_month: month,
          p_year: year,
        });
        if (error) throw error;
        return { result: data, paidAt };
      } catch (rpcError) {
        console.warn("[BillPayment] RPC record_bill_payment failed, using direct table fallback:", rpcError);
        let expenseEntryId: string | null = null;

        // If status is Paid or Partially Paid, insert directly into expense_entries
        if (draft.status === "Paid" || draft.status === "Partially Paid") {
          const entryDate = draft.paymentDate || format(new Date(paidAt), "yyyy-MM-dd");
          const { data: expData, error: expErr } = await supabase
            .from("expense_entries")
            .insert({
              pg_id: currentPG.id,
              month,
              year,
              category: draft.category,
              subcategory: draft.subcategory ?? null,
              label: (draft.label || draft.categoryName).slice(0, 120),
              amount: draft.amount,
              entry_date: entryDate,
              floor: draft.floor ?? null,
              notes: draft.note ? draft.note.slice(0, 500) : null,
            })
            .select("id")
            .single();

          if (expErr) {
            console.error("[BillPayment] Direct expense_entries insert error:", expErr);
            throw expErr;
          }
          expenseEntryId = expData?.id ?? null;
        }

        // Try inserting into bill_payment_transactions table directly if available
        try {
          await db.from("bill_payment_transactions").insert({
            transaction_id: draft.transactionId,
            pg_id: currentPG.id,
            expense_entry_id: expenseEntryId,
            bill_category_id: draft.billCategoryId.slice(0, 160),
            category: draft.category,
            category_name: draft.categoryName.slice(0, 80),
            label: (draft.label || draft.categoryName).slice(0, 120),
            amount: draft.amount,
            payment_method: draft.paymentMethod,
            status: draft.status,
            paid_at: paidAt,
            payee_name: draft.payeeName ? draft.payeeName.slice(0, 120) : null,
            masked_upi_id: draft.maskedUpiId ? draft.maskedUpiId.slice(0, 220) : null,
            note: draft.note ? draft.note.slice(0, 500) : null,
            upi_attempted: draft.upiAttempted,
          });
        } catch (trxErr) {
          console.warn("[BillPayment] Direct bill_payment_transactions insert ignored:", trxErr);
        }

        return { result: { id: draft.transactionId, expense_entry_id: expenseEntryId, duplicate: false }, paidAt };
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["expense_entries", currentPG?.id, month, year] });
    },
  });

  return { transactions: (query.data ?? []) as BillPaymentTransactionRow[], isLoading: query.isLoading, record };
};
