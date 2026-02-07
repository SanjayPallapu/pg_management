import { useMemo, useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePG } from '@/contexts/PGContext';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
const STORAGE_KEY_PREFIX = "pg-expenses-toggles";
const DEFAULT_TOGGLES = {
  familyExpenses: true,
  currentBills: false,
  pgRent: true
};
const getStorageKey = (month: number, year: number) => `${STORAGE_KEY_PREFIX}-${year}-${month}`;

/**
 * Admin-only Balance Card
 * Shows: Previous Month Balance + Present Month Total Collected - Grand Total (PG Expenses)
 */
export const BalanceCard = () => {
  const {
    selectedMonth,
    selectedYear
  } = useMonthContext();
  const {
    payments,
    isLoading: paymentsLoading
  } = useTenantPayments();
  const {
    rooms,
    isLoading: roomsLoading
  } = useRooms();
  const {
    currentPG
  } = usePG();
  const [isOpen, setIsOpen] = useState(true);

  // Read toggle states for any month (stored per month/year)
  const getMonthToggles = useCallback((month: number, year: number) => {
    try {
      const stored = localStorage.getItem(getStorageKey(month, year));
      if (stored) return JSON.parse(stored);
    } catch (e) {/* ignore */}
    return {
      ...DEFAULT_TOGGLES
    };
  }, []);
  const [toggles, setToggles] = useState(() => getMonthToggles(selectedMonth, selectedYear));
  useEffect(() => {
    // Re-read toggles when month changes
    setToggles(getMonthToggles(selectedMonth, selectedYear));
  }, [getMonthToggles, selectedMonth, selectedYear]);
  useEffect(() => {
    const handler = () => setToggles(getMonthToggles(selectedMonth, selectedYear));
    window.addEventListener('expenses-toggles-changed', handler);
    return () => window.removeEventListener('expenses-toggles-changed', handler);
  }, [getMonthToggles, selectedMonth, selectedYear]);

  // Previous month info
  const {
    prevMonth,
    prevYear
  } = useMemo(() => {
    let pM = selectedMonth - 1;
    let pY = selectedYear;
    if (pM === 0) {
      pM = 12;
      pY -= 1;
    }
    return {
      prevMonth: pM,
      prevYear: pY
    };
  }, [selectedMonth, selectedYear]);

  // Fetch PG expenses for CURRENT month
  const {
    data: currentExpenseData
  } = useQuery({
    queryKey: ['personal-expenses-balance', selectedMonth, selectedYear],
    queryFn: async () => {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const response = await fetch(`https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-summary-api?month=${monthStr}`);
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000
  });

  // Fetch PG expenses for PREVIOUS month (for previous balance calc)
  const {
    data: prevExpenseData
  } = useQuery({
    queryKey: ['personal-expenses-balance', prevMonth, prevYear],
    queryFn: async () => {
      const monthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      const response = await fetch(`https://tiqjpwununrlbdtsqzfm.supabase.co/functions/v1/get-summary-api?month=${monthStr}`);
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000
  });

  // Day guest revenue for current month
  const {
    data: dayGuestRevenue = 0
  } = useQuery({
    queryKey: ['day-guest-revenue-balance', selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return 0;
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);
      const {
        data,
        error
      } = await supabase.from('day_guests').select('amount_paid, rooms!inner(pg_id)').eq('rooms.pg_id', currentPG.id).gte('from_date', startOfMonth.toISOString().split('T')[0]).lte('from_date', endOfMonth.toISOString().split('T')[0]);
      if (error) return 0;
      return data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
    },
    enabled: !!currentPG?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000
  });

  // Day guest revenue for previous month
  const {
    data: prevDayGuestRevenue = 0
  } = useQuery({
    queryKey: ['day-guest-revenue-balance', prevMonth, prevYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return 0;
      const startOfMonth = new Date(prevYear, prevMonth - 1, 1);
      const endOfMonth = new Date(prevYear, prevMonth, 0);
      const {
        data,
        error
      } = await supabase.from('day_guests').select('amount_paid, rooms!inner(pg_id)').eq('rooms.pg_id', currentPG.id).gte('from_date', startOfMonth.toISOString().split('T')[0]).lte('from_date', endOfMonth.toISOString().split('T')[0]);
      if (error) return 0;
      return data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
    },
    enabled: !!currentPG?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 2 * 60 * 1000
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
    if (pM === 0) {
      pM = 12;
      pY -= 1;
    }
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

  // Calculate expenses for a month - toggles only apply to CURRENT month
  const calcExpenses = (expData: any, applyToggles: boolean, overrideToggles?: {
    familyExpenses: boolean;
    currentBills: boolean;
    pgRent: boolean;
  }) => {
    if (!expData) return 0;
    const groceries = expData?.breakdown?.groceries?.total || 0;
    const utilityBills = expData?.breakdown?.bills?.total || 0;
    const familyExpenses = expData?.familyExpenses || 0;
    const currentBill = expData?.currentBill || expData?.breakdown?.bills?.currentBills || 0;
    const effectiveToggles = overrideToggles || toggles;
    if (applyToggles) {
      // Current month: respect toggle states
      let total = groceries + utilityBills;
      if (effectiveToggles.currentBills) total += currentBill;
      if (effectiveToggles.pgRent) total += PG_RENT;
      if (effectiveToggles.familyExpenses) total += familyExpenses;
      return total;
    } else {
      // Previous month: always include all expenses (no toggles)
      return groceries + utilityBills + currentBill + PG_RENT + familyExpenses;
    }
  };

  // Previous month balance - NO toggles applied
  const prevTotalCollected = calcTotalCollected(prevMonth, prevYear, prevDayGuestRevenue);
  const prevMonthToggles = getMonthToggles(prevMonth, prevYear);
  const prevExpenses = calcExpenses(prevExpenseData, true, prevMonthToggles);
  const previousMonthBalance = prevTotalCollected - prevExpenses;

  // Current month total collected
  const currentTotalCollected = calcTotalCollected(selectedMonth, selectedYear, dayGuestRevenue);
  const currentExpenses = calcExpenses(currentExpenseData, true);

  // Grand total balance = previous month balance + current collected - current expenses
  const grandTotal = previousMonthBalance + currentTotalCollected - currentExpenses;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Show loading state while core data is loading to prevent wrong data flash
  const isDataLoading = paymentsLoading || roomsLoading;

  return <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Balance Overview</span>
            </div>
            <CollapsibleTrigger asChild>
              <button type="button" className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" aria-label={isOpen ? 'Collapse balance overview' : 'Expand balance overview'}>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </CollapsibleTrigger>
          </div>

          {isDataLoading ? (
            <>
              <CollapsibleContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
                  <div className="flex justify-between items-center"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
                  <div className="flex justify-between items-center"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
                </div>
              </CollapsibleContent>
              <div className={`border-t pt-2 ${isOpen ? 'mt-2' : 'mt-0'}`}>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-7 w-28" />
                </div>
              </div>
            </>
          ) : (
            <>
              <CollapsibleContent>
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
                </div>
              </CollapsibleContent>

              {/* Grand Total (always visible) */}
              <div className={`border-t pt-2 ${isOpen ? 'mt-2' : 'mt-0'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Balance</span>
                  <span className={`text-xl font-bold ${grandTotal >= 0 ? 'text-paid' : 'text-destructive'}`}>
                    {grandTotal >= 0 ? '+' : ''}₹{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </Collapsible>
      </CardContent>
    </Card>;
};