import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wallet } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';

export const PersonalExpensesCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const [includeFamilyExpenses, setIncludeFamilyExpenses] = useState(false);
  const [includeCurrentBills, setIncludeCurrentBills] = useState(true);

  // Fetch monthly summary data
  const { data: expenseData, isLoading, error } = useQuery({
    queryKey: ['personal-expenses', selectedMonth, selectedYear],
    queryFn: async () => {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const response = await fetch(
        `https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-summary-api?month=${monthStr}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="p-4 flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
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
  
  // Calculate grand total from actual components: groceries + utility bills + optional current bills + optional family expenses
  const baseTotal = groceries + utilityBills;
  const totalWithCurrentBills = includeCurrentBills ? baseTotal + currentBill : baseTotal;
  const grandTotal = includeFamilyExpenses ? totalWithCurrentBills + familyExpenses : totalWithCurrentBills;

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
              <span className="font-medium text-purple-600 dark:text-purple-400">
                ₹{groceries.toLocaleString()}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Utility Bills</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                ₹{utilityBills.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Current Bills</span>
                <button 
                  type="button"
                  onClick={() => setIncludeCurrentBills(!includeCurrentBills)}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    includeCurrentBills 
                      ? 'bg-orange-500 border-orange-500' 
                      : 'bg-transparent border-muted-foreground hover:border-orange-400'
                  }`}
                  title={includeCurrentBills ? 'Click to exclude from total' : 'Click to include in total'}
                />
              </div>
              <span className={`font-medium ${
                includeCurrentBills 
                  ? 'text-orange-600 dark:text-orange-400' 
                  : 'text-muted-foreground'
              }`}>
                ₹{currentBill.toLocaleString()}
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
                      ? 'bg-purple-500 border-purple-500' 
                      : 'bg-transparent border-muted-foreground hover:border-purple-400'
                  }`}
                  title={includeFamilyExpenses ? 'Click to exclude from total' : 'Click to include in total'}
                />
              </div>
              <span className={`font-medium ${
                includeFamilyExpenses 
                  ? 'text-purple-600 dark:text-purple-400' 
                  : 'text-muted-foreground'
              }`}>
                ₹{familyExpenses.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
