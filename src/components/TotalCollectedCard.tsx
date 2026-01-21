import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Room, PaymentEntry } from '@/types';
import { useMemo } from 'react';
import { isTenantActiveInMonth, hasTenantLeftNow } from '@/utils/dateOnly';

interface TotalCollectedCardProps {
  rooms: Room[];
  rentCollected: number;
}

export const TotalCollectedCard = ({ rooms, rentCollected }: TotalCollectedCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  // Fetch day guest revenue for selected month
  const { data: dayGuestRevenue = 0 } = useQuery({
    queryKey: ['day-guest-revenue', selectedMonth, selectedYear],
    queryFn: async () => {
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);

      const { data, error } = await supabase
        .from('day_guests')
        .select('amount_paid')
        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);

      if (error) return 0;

      return data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
    },
  });

  // Calculate previous month overdue collections (collected this month)
  const overdueCollected = useMemo(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    // Get tenants who were active in the previous month
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));
    
    const prevMonthActiveTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth) &&
      !hasTenantLeftNow(tenant.endDate)
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

  // Calculate security deposits collected this month
  const securityDeposits = useMemo(() => {
    let total = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!tenant.securityDepositAmount || !tenant.securityDepositDate) return;
        
        const depositDate = new Date(tenant.securityDepositDate);
        if (depositDate.getMonth() + 1 === selectedMonth && depositDate.getFullYear() === selectedYear) {
          total += tenant.securityDepositAmount;
        }
      });
    });
    return total;
  }, [rooms, selectedMonth, selectedYear]);

  const totalCollected = rentCollected + overdueCollected + dayGuestRevenue + securityDeposits;

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
            <span>₹{rentCollected.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Overdue Collections</span>
            <span>₹{overdueCollected.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Day Guest Revenue</span>
            <span>₹{dayGuestRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Security Deposits</span>
            <span>₹{securityDeposits.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};