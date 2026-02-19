import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Room, PaymentEntry } from '@/types';
import { usePG } from '@/contexts/PGContext';
import { useMemo } from 'react';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { getTotalRefunded } from '@/utils/refundStore';

interface TotalCollectedCardProps {
  rooms: Room[];
  rentCollected: number; // Keep for backward compat, but we'll calculate our own
}

export const TotalCollectedCard = ({ rooms }: TotalCollectedCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  // Use the same query key as Dashboard/Index prefetch to share cache
  const { currentPG } = usePG();
  const { data: dayGuestRevenue = 0 } = useQuery({
    queryKey: ['day-guest-revenue', selectedMonth, selectedYear, currentPG?.id],
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
  });

  // Calculate THIS MONTH rent collected by summing actual payment entries
  // This matches how AllCollectedCard calculates - using actual entries, not amountPaid field
  const thisMonthRent = useMemo(() => {
    let total = 0;
    
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        // Skip locked tenants
        if (tenant.isLocked) return;
        
        // Check if tenant was active in the selected month
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          return;
        }

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );

        if (payment?.paymentEntries) {
          // Sum all payment entries for this month's payment
          (payment.paymentEntries as PaymentEntry[]).forEach((entry: PaymentEntry) => {
            total += entry.amount;
          });
        }
      });
    });

    return total;
  }, [rooms, payments, selectedMonth, selectedYear]);

  // Calculate previous month overdue collections (collected this month)
  const overdueCollected = useMemo(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    // Get tenants who were active in the previous month (include left tenants for paid amounts)
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));
    
    const prevMonthActiveTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)
    );

    let total = 0;

    prevMonthActiveTenants.forEach(tenant => {
      if (tenant.isLocked) return;

      const payment = payments.find(p => 
        p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear
      );

      if (!payment) return;

      // Check for entries made in the current month (for previous month's payment)
      const entries = (payment.paymentEntries || []) as PaymentEntry[];
      entries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const entryMonth = entryDate.getMonth() + 1;
        const entryYear = entryDate.getFullYear();

        if (entryMonth === selectedMonth && entryYear === selectedYear) {
          total += entry.amount;
        }
      });
    });

    return total;
  }, [payments, rooms, selectedMonth, selectedYear]);

  // Calculate extra amounts from payment notes (Discount & Extra)
  const extraAmounts = useMemo(() => {
    let totalExtra = 0;
    
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));
    
    const currentMonthTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)
    );

    currentMonthTenants.forEach(tenant => {
      if (tenant.isLocked) return;

      const payment = payments.find(p => 
        p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
      );

      if (!payment || !payment.notes) return;

      // Parse Extra from notes (format: "Extra: ₹X")
      const extraMatch = payment.notes.match(/Extra:\s*₹?([\d,]+)/);
      if (extraMatch) {
        totalExtra += parseInt(extraMatch[1].replace(/,/g, '')) || 0;
      }
    });

    return totalExtra;
  }, [payments, rooms, selectedMonth, selectedYear]);

  // Calculate security deposits collected this month with UPI/Cash breakdown
  const securityDeposits = useMemo(() => {
    let total = 0;
    let upi = 0;
    let cash = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!tenant.securityDepositAmount || !tenant.securityDepositDate) return;
        
        const depositDate = new Date(tenant.securityDepositDate);
        if (depositDate.getMonth() + 1 === selectedMonth && depositDate.getFullYear() === selectedYear) {
          total += tenant.securityDepositAmount;
          if (tenant.securityDepositMode === 'upi') {
            upi += tenant.securityDepositAmount;
          } else if (tenant.securityDepositMode === 'cash') {
            cash += tenant.securityDepositAmount;
          }
        }
      });
    });
    return { total, upi, cash };
  }, [rooms, selectedMonth, selectedYear]);

  const totalRefunded = getTotalRefunded(selectedYear, selectedMonth);
  const totalCollected = thisMonthRent + overdueCollected + dayGuestRevenue + securityDeposits.total + extraAmounts - totalRefunded;

  return (
    <Card className="bg-gradient-to-r from-paid/10 to-paid/5 border-paid/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Total Collected</span>
          <Wallet className="h-4 w-4 text-paid" />
        </div>
        <div className="text-2xl font-bold text-paid">₹{totalCollected.toLocaleString()}</div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>This Month Rent</span>
            <span>₹{thisMonthRent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Overdue Collections</span>
            <span>₹{overdueCollected.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Day Guest Revenue</span>
            <span>₹{dayGuestRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Security Deposits</span>
            <div className="flex items-center gap-2">
              <span>₹{securityDeposits.total.toLocaleString()}</span>
              {(securityDeposits.upi > 0 || securityDeposits.cash > 0) && (
                <span className="text-[10px]">
                  (<span className="text-blue-600 dark:text-blue-400">U:{securityDeposits.upi.toLocaleString()}</span>
                  {' / '}
                  <span className="text-green-600 dark:text-green-400">C:{securityDeposits.cash.toLocaleString()}</span>)
                </span>
              )}
            </div>
          </div>
           {extraAmounts > 0 && (
            <div className="flex justify-between">
              <span>Extra Amounts</span>
              <span>₹{extraAmounts.toLocaleString()}</span>
            </div>
          )}
          {totalRefunded > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Refunds Paid</span>
              <span>-₹{totalRefunded.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};