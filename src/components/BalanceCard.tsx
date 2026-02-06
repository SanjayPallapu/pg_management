import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Scale } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePG } from '@/contexts/PGContext';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';

/**
 * Admin-only Balance Card
 * Shows: Previous Month Balance + Present Month Total Collected - Grand Total (PG Expenses)
 */
export const BalanceCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const { currentPG } = usePG();

  // Previous month info
  const { prevMonth, prevYear } = useMemo(() => {
    let pM = selectedMonth - 1;
    let pY = selectedYear;
    if (pM === 0) { pM = 12; pY -= 1; }
    return { prevMonth: pM, prevYear: pY };
  }, [selectedMonth, selectedYear]);

  // Fetch PG expenses for CURRENT month
  const { data: currentExpenseData } = useQuery({
    queryKey: ['personal-expenses-balance', selectedMonth, selectedYear],
    queryFn: async () => {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const response = await fetch(
        `https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-summary-api?month=${monthStr}`
      );
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Fetch PG expenses for PREVIOUS month (for previous balance calc)
  const { data: prevExpenseData } = useQuery({
    queryKey: ['personal-expenses-balance', prevMonth, prevYear],
    queryFn: async () => {
      const monthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      const response = await fetch(
        `https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-summary-api?month=${monthStr}`
      );
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Day guest revenue for current month
  const { data: dayGuestRevenue = 0 } = useQuery({
    queryKey: ['day-guest-revenue-balance', selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return 0;
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);
      const { data, error } = await supabase
        .from('day_guests')
        .select('amount_paid, rooms!inner(pg_id)')
        .eq('rooms.pg_id', currentPG.id)
        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);
      if (error) return 0;
      return data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
    },
    enabled: !!currentPG?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  // Day guest revenue for previous month
  const { data: prevDayGuestRevenue = 0 } = useQuery({
    queryKey: ['day-guest-revenue-balance', prevMonth, prevYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return 0;
      const startOfMonth = new Date(prevYear, prevMonth - 1, 1);
      const endOfMonth = new Date(prevYear, prevMonth, 0);
      const { data, error } = await supabase
        .from('day_guests')
        .select('amount_paid, rooms!inner(pg_id)')
        .eq('rooms.pg_id', currentPG.id)
        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);
      if (error) return 0;
      return data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
    },
    enabled: !!currentPG?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const PG_RENT = 150000;

  // Calculate total collected for a given month
  const calcTotalCollected = (targetMonth: number, targetYear: number, dgRevenue: number) => {
    let thisMonthRent = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (tenant.isLocked) return;
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, targetYear, targetMonth)) return;
        const payment = payments.find(p => p.tenantId === tenant.id && p.month === targetMonth && p.year === targetYear);
        if (payment?.paymentEntries) {
          (payment.paymentEntries as PaymentEntry[]).forEach((entry: PaymentEntry) => {
            thisMonthRent += entry.amount;
          });
        }
      });
    });

    // Overdue collections
    let pM = targetMonth - 1;
    let pY = targetYear;
    if (pM === 0) { pM = 12; pY -= 1; }
    let overdueCollected = 0;
    const allTenants = rooms.flatMap(room => room.tenants);
    const prevActive = allTenants.filter(t => isTenantActiveInMonth(t.startDate, t.endDate, pY, pM));
    prevActive.forEach(tenant => {
      if (tenant.isLocked) return;
      const payment = payments.find(p => p.tenantId === tenant.id && p.month === pM && p.year === pY);
      if (!payment) return;
      const entries = (payment.paymentEntries || []) as PaymentEntry[];
      entries.forEach(entry => {
        const d = new Date(entry.date);
        if (d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear) {
          overdueCollected += entry.amount;
        }
      });
    });

    // Security deposits
    let secDep = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!tenant.securityDepositAmount || !tenant.securityDepositDate) return;
        const dd = new Date(tenant.securityDepositDate);
        if (dd.getMonth() + 1 === targetMonth && dd.getFullYear() === targetYear) {
          secDep += tenant.securityDepositAmount;
        }
      });
    });

    // Extra amounts
    let extra = 0;
    const monthTenants = allTenants.filter(t => isTenantActiveInMonth(t.startDate, t.endDate, targetYear, targetMonth));
    monthTenants.forEach(tenant => {
      if (tenant.isLocked) return;
      const payment = payments.find(p => p.tenantId === tenant.id && p.month === targetMonth && p.year === targetYear);
      if (!payment || !(payment as any).notes) return;
      const m = (payment as any).notes.match(/Extra:\s*₹?([\d,]+)/);
      if (m) extra += parseInt(m[1].replace(/,/g, '')) || 0;
    });

    return thisMonthRent + overdueCollected + dgRevenue + secDep + extra;
  };

  // Calculate expenses for a month
  const calcExpenses = (expData: any) => {
    if (!expData) return 0;
    const groceries = expData?.breakdown?.groceries?.total || 0;
    const utilityBills = expData?.breakdown?.bills?.total || 0;
    const familyExpenses = expData?.familyExpenses || 0;
    return groceries + utilityBills + familyExpenses + PG_RENT;
  };

  // Previous month balance
  const prevTotalCollected = calcTotalCollected(prevMonth, prevYear, prevDayGuestRevenue);
  const prevExpenses = calcExpenses(prevExpenseData);
  const previousMonthBalance = prevTotalCollected - prevExpenses;

  // Current month total collected
  const currentTotalCollected = calcTotalCollected(selectedMonth, selectedYear, dayGuestRevenue);
  const currentExpenses = calcExpenses(currentExpenseData);

  // Grand total balance = previous month balance + current collected - current expenses
  const grandTotal = previousMonthBalance + currentTotalCollected - currentExpenses;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Balance Overview</span>
          </div>
        </div>

        <div className="space-y-2">
          {/* Previous month balance */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{months[prevMonth - 1]} Balance</span>
            <span className={`font-medium ${previousMonthBalance >= 0 ? 'text-paid' : 'text-destructive'}`}>
              {previousMonthBalance >= 0 ? '+' : ''}₹{previousMonthBalance.toLocaleString()}
            </span>
          </div>

          {/* Current month collected */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{months[selectedMonth - 1]} Collected</span>
            <span className="font-medium text-paid">+₹{currentTotalCollected.toLocaleString()}</span>
          </div>

          {/* Current month expenses */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{months[selectedMonth - 1]} Expenses</span>
            <span className="font-medium text-destructive">-₹{currentExpenses.toLocaleString()}</span>
          </div>

          {/* Grand Total */}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Grand Total</span>
              <span className={`text-xl font-bold ${grandTotal >= 0 ? 'text-paid' : 'text-destructive'}`}>
                {grandTotal >= 0 ? '+' : ''}₹{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
