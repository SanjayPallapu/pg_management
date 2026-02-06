import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wallet } from "lucide-react";
import { useMonthContext } from "@/contexts/MonthContext";

const STORAGE_KEY_PREFIX = "pg-expenses-toggles";
const DEFAULT_TOGGLES = { familyExpenses: true, currentBills: false, pgRent: true };

const getStorageKey = (month: number, year: number) => `${STORAGE_KEY_PREFIX}-${year}-${month}`;

interface PersonalExpensesCardProps {
  totalCollected?: number;
}

export const PersonalExpensesCard = ({ totalCollected = 0 }: PersonalExpensesCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  
  // Load toggle states for the current month
  const getMonthState = useCallback((month: number, year: number) => {
    try {
      const stored = localStorage.getItem(getStorageKey(month, year));
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to load toggle states:", e);
    }
    return { ...DEFAULT_TOGGLES };
  }, []);
  
  const [includeFamilyExpenses, setIncludeFamilyExpenses] = useState(() => getMonthState(selectedMonth, selectedYear).familyExpenses);
  const [includeCurrentBills, setIncludeCurrentBills] = useState(() => getMonthState(selectedMonth, selectedYear).currentBills);
  const [includePgRent, setIncludePgRent] = useState(() => getMonthState(selectedMonth, selectedYear).pgRent);

  // When month changes, load the toggle state for that month
  useEffect(() => {
    const state = getMonthState(selectedMonth, selectedYear);
    setIncludeFamilyExpenses(state.familyExpenses);
    setIncludeCurrentBills(state.currentBills);
    setIncludePgRent(state.pgRent);
  }, [selectedMonth, selectedYear, getMonthState]);

  // Persist toggle states to month-specific localStorage and notify BalanceCard
  useEffect(() => {
    try {
      localStorage.setItem(getStorageKey(selectedMonth, selectedYear), JSON.stringify({
        familyExpenses: includeFamilyExpenses,
        currentBills: includeCurrentBills,
        pgRent: includePgRent
      }));
      // Dispatch custom event so BalanceCard updates dynamically
      window.dispatchEvent(new CustomEvent('expenses-toggles-changed', { 
        detail: { month: selectedMonth, year: selectedYear } 
      }));
    } catch (e) {
      console.error("Failed to save toggle states:", e);
    }
  }, [includeFamilyExpenses, includeCurrentBills, includePgRent, selectedMonth, selectedYear]);

  const PG_RENT = 150000;

  // Fetch monthly summary data
  const {
    data: expenseData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["personal-expenses", selectedMonth, selectedYear],
    queryFn: async () => {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const response = await fetch(
        `https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-summary-api?month=${monthStr}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch expenses");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
     gcTime: 2 * 60 * 1000, // 2 minutes gc
    retry: 2,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
         <CardContent className="p-4">
           <div className="flex items-center justify-between mb-2">
             <span className="text-sm font-medium flex items-center gap-2">
               <span>💰</span>
               PG Expenses
             </span>
             <Wallet className="h-4 w-4 text-purple-500" />
           </div>
           <div className="h-6 w-24 bg-muted animate-pulse rounded mb-2" />
           <div className="space-y-1">
             <div className="h-4 w-full bg-muted animate-pulse rounded" />
             <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
           </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="p-4 flex items-center justify-center h-32 text-muted-foreground text-sm">
          Failed to load expenses
        </CardContent>
      </Card>
    );
  }

  const groceries = expenseData?.breakdown?.groceries?.total || 0;
  const utilityBills = expenseData?.breakdown?.bills?.total || 0;
  const familyExpenses = expenseData?.familyExpenses || 0;
  // Current bills from summary response breakdown (note: API uses "currentBills" plural)
  const currentBill = expenseData?.currentBill || expenseData?.breakdown?.bills?.currentBills || 0;

  // Calculate grand total from actual components: groceries + utility bills + optional current bills + optional PG rent + optional family expenses
  let grandTotal = groceries + utilityBills;
  if (includeCurrentBills) grandTotal += currentBill;
  if (includePgRent) grandTotal += PG_RENT;
  if (includeFamilyExpenses) grandTotal += familyExpenses;

  // Calculate balance: Total Collected - Grand Total
  const balance = totalCollected - grandTotal;

  return (
    <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>💰</span>
          PG Expenses
        </CardTitle>
        <Wallet className="h-4 w-4 text-purple-500" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Grand Total</span>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              ₹{grandTotal.toLocaleString()}
            </span>
          </div>

          <div className="border-t border-purple-500/20 pt-2 space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Groceries</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">₹{groceries.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Utility Bills</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">₹{utilityBills.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current Bills</span>
                <button
                  type="button"
                  onClick={() => setIncludeCurrentBills(!includeCurrentBills)}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    includeCurrentBills
                      ? "bg-orange-500 border-orange-500"
                      : "bg-transparent border-muted-foreground hover:border-orange-400"
                  }`}
                  title={includeCurrentBills ? "Click to exclude from total" : "Click to include in total"}
                />
              </div>
              <span
                className={`font-medium ${
                  includeCurrentBills ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                }`}
              >
                ₹{currentBill.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">PG Rent</span>
                <button
                  type="button"
                  onClick={() => setIncludePgRent(!includePgRent)}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    includePgRent
                      ? "bg-red-500 border-red-500"
                      : "bg-transparent border-muted-foreground hover:border-red-400"
                  }`}
                  title={includePgRent ? "Click to exclude from total" : "Click to include in total"}
                />
              </div>
              <span
                className={`font-medium ${includePgRent ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
              >
                ₹{PG_RENT.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Family Expenses</span>
                {/* Toggle dot to include/exclude from grand total */}
                <button
                  type="button"
                  onClick={() => setIncludeFamilyExpenses(!includeFamilyExpenses)}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    includeFamilyExpenses
                      ? "bg-purple-500 border-purple-500"
                      : "bg-transparent border-muted-foreground hover:border-purple-400"
                  }`}
                  title={includeFamilyExpenses ? "Click to exclude from total" : "Click to include in total"}
                />
              </div>
              <span
                className={`font-medium ${
                  includeFamilyExpenses ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
                }`}
              >
                ₹{familyExpenses.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Balance Section */}
          <div className="border-t border-purple-500/20 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Balance</span>
              <span className={`text-lg font-bold ${balance >= 0 ? "text-paid" : "text-destructive"}`}>
                {balance >= 0 ? "+" : ""}₹{balance.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Collected ₹{totalCollected.toLocaleString()} - Expenses
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
