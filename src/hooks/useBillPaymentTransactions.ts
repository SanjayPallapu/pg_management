import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import type { BillPaymentDraft } from "@/features/bill-payments/types";

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
      const { data, error } = await supabase.from("bill_payment_transactions").select("*").eq("pg_id", currentPG!.id).gte("paid_at", start).lt("paid_at", end).order("paid_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const record = useMutation({
    mutationFn: async (draft: BillPaymentDraft) => {
      if (!currentPG?.id) throw new Error("No PG selected");
      const paidAt = new Date().toISOString();
      const { data, error } = await supabase.rpc("record_bill_payment", {
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
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({ queryKey: ["expense_entries", currentPG?.id, month, year] });
    },
  });

  return { transactions: query.data ?? [], isLoading: query.isLoading, record };
};
