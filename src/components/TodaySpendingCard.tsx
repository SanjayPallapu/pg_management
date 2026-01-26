import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Loader2 } from "lucide-react";
import { format } from "date-fns";

const EXTERNAL_SUPABASE_URL = "https://tiqjpwununrlbdtsqzfm.supabase.co";
const EXTERNAL_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcWpwd3VudW5ybGJkdHNxemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MjcxMjUsImV4cCI6MjA0OTMwMzEyNX0.0cMnBX7ODkL2ZSC_8AlEFZKWYiHLIQHqpZ2kVdJpMvw";

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
      const headers = {
        "apikey": EXTERNAL_ANON_KEY,
        "Authorization": `Bearer ${EXTERNAL_ANON_KEY}`,
        "Content-Type": "application/json",
      };

      const [groceriesRes, billsRes, otherBillsRes, familyRes] = await Promise.all([
        fetch(`${EXTERNAL_SUPABASE_URL}/rest/v1/groceries?select=price&date=eq.${today}`, { headers }),
        fetch(`${EXTERNAL_SUPABASE_URL}/rest/v1/bills?select=amount&date=eq.${today}`, { headers }),
        fetch(`${EXTERNAL_SUPABASE_URL}/rest/v1/other_bills?select=amount&date=eq.${today}`, { headers }),
        fetch(`${EXTERNAL_SUPABASE_URL}/rest/v1/family_expenses?select=amount&date=eq.${today}`, { headers }),
      ]);

      const [groceries, bills, otherBills, family] = await Promise.all([
        groceriesRes.json(),
        billsRes.json(),
        otherBillsRes.json(),
        familyRes.json(),
      ]);

      const groceriesTotal = (groceries || []).reduce((sum: number, item: { price: number }) => sum + (item.price || 0), 0);
      const billsTotal = (bills || []).reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0) +
                         (otherBills || []).reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0);
      const familyTotal = (family || []).reduce((sum: number, item: { amount: number }) => sum + (item.amount || 0), 0);

      return {
        groceries: groceriesTotal,
        bills: billsTotal,
        family: familyTotal,
        total: groceriesTotal + billsTotal + familyTotal,
      };
    },
    staleTime: 60000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400/30 text-white">
        <CardContent className="p-4 flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-white/80" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400/30 text-white">
        <CardContent className="p-4 flex items-center justify-center h-40 text-white/70 text-sm">
          Failed to load spending
        </CardContent>
      </Card>
    );
  }

  const { groceries = 0, bills = 0, family = 0, total = 0 } = data || {};

  return (
    <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400/30 text-white overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Today's Spending</span>
          </div>
          <span className="text-sm text-white/80">{format(new Date(), "MMM d, yyyy")}</span>
        </div>

        {/* Grid of spending categories */}
        <div className="grid grid-cols-2 gap-3">
          {/* Groceries */}
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-white/80 block mb-1">Groceries</span>
            <span className="text-xl font-bold">₹{groceries.toLocaleString()}</span>
          </div>

          {/* Bills */}
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-white/80 block mb-1">Bills</span>
            <span className="text-xl font-bold">₹{bills.toLocaleString()}</span>
          </div>

          {/* Family */}
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-white/80 block mb-1">Family</span>
            <span className="text-xl font-bold">₹{family.toLocaleString()}</span>
          </div>

          {/* Total */}
          <div className="bg-white/25 rounded-xl p-3 backdrop-blur-sm">
            <span className="text-xs text-white/80 block mb-1">Total</span>
            <span className="text-xl font-bold">₹{total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
