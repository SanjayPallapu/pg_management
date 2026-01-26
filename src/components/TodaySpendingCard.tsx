import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface TodaySpendingResponse {
  date: string;
  totals: {
    groceries: number;
    bills: number;
    otherBills: number;
    familyExpenses: number;
    sharedTotal: number;
    grandTotal: number;
  };
}

export const TodaySpendingCard = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const today = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading, error } = useQuery<TodaySpendingResponse>({
    queryKey: ["today-spending", today],
    queryFn: async () => {
      const response = await fetch(
        `https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-todays-spending-api?date=${today}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch spending data");
      }
      
      return response.json();
    },
    staleTime: 60000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-center justify-center h-20">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-center justify-center h-20 text-muted-foreground text-sm">
          Failed to load spending
        </CardContent>
      </Card>
    );
  }

  const totals = data?.totals || { groceries: 0, bills: 0, familyExpenses: 0, grandTotal: 0 };

  return (
    <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
      <CardContent className="p-4">
        {/* Header with collapse toggle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="font-semibold text-amber-700 dark:text-amber-300">Today's Spending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{format(new Date(), "MMM d, yyyy")}</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-amber-500/20 transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsed summary */}
        {!isExpanded && (
          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
              ₹{totals.grandTotal.toLocaleString()}
            </span>
          </div>
        )}

        {/* Expanded grid */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {/* Groceries */}
            <div className="bg-amber-500/10 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1">Groceries</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                ₹{totals.groceries.toLocaleString()}
              </span>
            </div>

            {/* Bills */}
            <div className="bg-amber-500/10 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1">Bills</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                ₹{totals.bills.toLocaleString()}
              </span>
            </div>

            {/* Family */}
            <div className="bg-amber-500/10 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1">Family</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                ₹{totals.familyExpenses.toLocaleString()}
              </span>
            </div>

            {/* Total */}
            <div className="bg-amber-500/20 rounded-xl p-3">
              <span className="text-xs text-muted-foreground block mb-1">Total</span>
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                ₹{totals.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
