import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "@/hooks/use-toast";

export type ExpenseCategory = "current" | "utility" | "other" | "family";

export interface ExpenseEntry {
  id: string;
  pg_id: string;
  month: number;
  year: number;
  category: ExpenseCategory;
  subcategory: string | null;
  label: string;
  amount: number;
  entry_date: string;
  floor: number | null;
  room_id: string | null;
  notes: string | null;
}

export const useExpenseEntries = (month: number, year: number) => {
  const { currentPG } = usePG();
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["expense_entries", currentPG?.id, month, year],
    queryFn: async () => {
      if (!currentPG?.id) return [];
      const { data, error } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("pg_id", currentPG.id)
        .eq("month", month)
        .eq("year", year)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data || []) as ExpenseEntry[];
    },
    enabled: !!currentPG?.id,
  });

  const addEntry = useMutation({
    mutationFn: async (entry: Omit<ExpenseEntry, "id" | "pg_id">) => {
      if (!currentPG?.id) throw new Error("No PG selected");
      const { error } = await supabase
        .from("expense_entries")
        .insert({ ...entry, pg_id: currentPG.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_entries", currentPG?.id, month, year] });
      toast({ title: "Expense added" });
    },
    onError: (e: any) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ExpenseEntry>) => {
      const { error } = await supabase.from("expense_entries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense_entries", currentPG?.id, month, year] }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense_entries", currentPG?.id, month, year] });
      toast({ title: "Expense deleted" });
    },
  });

  const byCategory = (cat: ExpenseCategory) => entries.filter((e) => e.category === cat);
  const totalFor = (cat: ExpenseCategory) => byCategory(cat).reduce((s, e) => s + e.amount, 0);
  const grandTotal = entries.reduce((s, e) => s + e.amount, 0);

  return { entries, isLoading, byCategory, totalFor, grandTotal, addEntry, updateEntry, deleteEntry };
};
