import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { toast } from "@/hooks/use-toast";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

export const useMonthlyBudget = (month: number, year: number) => {
  const { currentPG } = usePG();
  const qc = useQueryClient();

  const {
    data: budget,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["monthly_budget", currentPG?.id, month, year],
    queryFn: async () => {
      if (!currentPG?.id) return null;
      const { data, error } = await supabase
        .from("monthly_budgets")
        .select("*")
        .eq("pg_id", currentPG.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; amount: number } | null;
    },
    enabled: !!currentPG?.id,
  });

  const setBudget = useMutation({
    mutationFn: async (amount: number) => {
      if (!currentPG?.id) throw new Error("No PG");
      if (budget?.id) {
        const { error } = await supabase.from("monthly_budgets").update({ amount }).eq("id", budget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("monthly_budgets")
          .insert({ pg_id: currentPG.id, month, year, amount });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_budget", currentPG?.id, month, year] });
      toast({ title: "Budget updated" });
    },
    onError: (error: unknown) =>
      toast({ title: "Failed", description: getErrorMessage(error), variant: "destructive" }),
  });

  return {
    budget,
    amount: budget?.amount ?? 0,
    isLoading,
    isError,
    error,
    refetch,
    setBudget,
  };
};
