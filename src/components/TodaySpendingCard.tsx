import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SpendingData {
  groceries: number;
  bills: number;
  family: number;
  total: number;
}

export const TodaySpendingCard = () => {
  const today = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading, error } = useQuery<SpendingData>({
    queryKey: ["today-spending", today],
    queryFn: async () => {
      // Use the summary API edge function
      const response = await fetch(
        `https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-today-spending?date=${today}`
      );
      
      if (!response.ok) {
        // If the endpoint doesn't exist, return zeros
        return { groceries: 0, bills: 0, family: 0, total: 0 };
      }
      
      return response.json();
    },
    staleTime: 60000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  const { groceries = 0, bills = 0, family = 0, total = 0 } = data || {};

  return (
    <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="font-semibold text-amber-700 dark:text-amber-300">Today's Spending</span>
          </div>
          <span className="text-sm text-muted-foreground">{format(new Date(), "MMM d, yyyy")}</span>
        </div>

        {/* Grid of spending categories */}
        <div className="grid grid-cols-2 gap-3">
          {/* Groceries */}
          <div className="bg-amber-500/10 rounded-xl p-3">
            <span className="text-xs text-muted-foreground block mb-1">Groceries</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">₹{groceries.toLocaleString()}</span>
          </div>

          {/* Bills */}
          <div className="bg-amber-500/10 rounded-xl p-3">
            <span className="text-xs text-muted-foreground block mb-1">Bills</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">₹{bills.toLocaleString()}</span>
          </div>

          {/* Family */}
          <div className="bg-amber-500/10 rounded-xl p-3">
            <span className="text-xs text-muted-foreground block mb-1">Family</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">₹{family.toLocaleString()}</span>
          </div>

          {/* Total */}
          <div className="bg-amber-500/20 rounded-xl p-3">
            <span className="text-xs text-muted-foreground block mb-1">Total</span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">₹{total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
