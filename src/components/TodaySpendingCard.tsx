import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Loader2, ChevronDown, ChevronUp, ShoppingCart, Receipt, Users } from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SpendingItem {
  id: string;
  name?: string;
  bill_type?: string;
  bill_name?: string;
  expense_name?: string;
  price?: number;
  amount?: number;
  category?: string;
}

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
  items: {
    groceries: SpendingItem[];
    bills: SpendingItem[];
    otherBills: SpendingItem[];
    familyExpenses: SpendingItem[];
  };
  itemCounts: {
    groceries: number;
    bills: number;
    otherBills: number;
    familyExpenses: number;
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
  const items = data?.items || { groceries: [], bills: [], otherBills: [], familyExpenses: [] };

  const getItemName = (item: SpendingItem): string => {
    return item.name || item.bill_type || item.bill_name || item.expense_name || "Unknown";
  };

  const getItemAmount = (item: SpendingItem): number => {
    return item.price || item.amount || 0;
  };

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

        {/* Expanded view with detailed items */}
        {isExpanded && (
          <div className="mt-2 space-y-3">
            {/* Category totals */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                <ShoppingCart className="h-3 w-3 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-muted-foreground block">Groceries</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  ₹{totals.groceries.toLocaleString()}
                </span>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                <Receipt className="h-3 w-3 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-muted-foreground block">Bills</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  ₹{totals.bills.toLocaleString()}
                </span>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-2 text-center">
                <Users className="h-3 w-3 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-muted-foreground block">Family</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  ₹{totals.familyExpenses.toLocaleString()}
                </span>
              </div>
              <div className="bg-amber-500/20 rounded-lg p-2 text-center">
                <CalendarDays className="h-3 w-3 mx-auto mb-1 text-amber-700 dark:text-amber-300" />
                <span className="text-xs text-muted-foreground block">Total</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  ₹{totals.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Scrollable detailed items list */}
            <ScrollArea className="h-[200px] rounded-lg border border-amber-500/20 bg-background/50">
              <div className="p-3 space-y-3">
                {/* Groceries items */}
                {items.groceries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <ShoppingCart className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Groceries</span>
                    </div>
                    <div className="space-y-1">
                      {items.groceries.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-green-500/5">
                          <span className="text-foreground truncate max-w-[60%]">{getItemName(item)}</span>
                          <span className="font-medium text-green-600 dark:text-green-400">₹{getItemAmount(item).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bills items */}
                {items.bills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Receipt className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Bills</span>
                    </div>
                    <div className="space-y-1">
                      {items.bills.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-blue-500/5">
                          <span className="text-foreground truncate max-w-[60%]">{getItemName(item)}</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">₹{getItemAmount(item).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Bills items */}
                {items.otherBills.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Receipt className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Other Bills</span>
                    </div>
                    <div className="space-y-1">
                      {items.otherBills.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-purple-500/5">
                          <span className="text-foreground truncate max-w-[60%]">{getItemName(item)}</span>
                          <span className="font-medium text-purple-600 dark:text-purple-400">₹{getItemAmount(item).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Family Expenses items */}
                {items.familyExpenses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Users className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Family</span>
                    </div>
                    <div className="space-y-1">
                      {items.familyExpenses.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-orange-500/5">
                          <span className="text-foreground truncate max-w-[60%]">{getItemName(item)}</span>
                          <span className="font-medium text-orange-600 dark:text-orange-400">₹{getItemAmount(item).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {items.groceries.length === 0 && items.bills.length === 0 && items.otherBills.length === 0 && items.familyExpenses.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No spending recorded today
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
