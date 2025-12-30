import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UpiLogo } from '@/components/icons/UpiLogo';
import { CashLogo } from '@/components/icons/CashLogo';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';

export const PaymentModeCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();

  const stats = useMemo(() => {
    // Get eligible tenant IDs for the selected month
    const eligibleTenantIds = new Set(
      rooms.flatMap(room =>
        room.tenants
          .filter(tenant => isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth))
          .map(tenant => tenant.id)
      )
    );

    // Get payments for selected month from eligible tenants only
    const monthPayments = payments.filter(
      p => p.month === selectedMonth && 
           p.year === selectedYear && 
           eligibleTenantIds.has(p.tenantId)
    );

    let upiCount = 0;
    let upiAmount = 0;
    let cashCount = 0;
    let cashAmount = 0;

    monthPayments.forEach(payment => {
      if (payment.paymentEntries && payment.paymentEntries.length > 0) {
        payment.paymentEntries.forEach((entry: PaymentEntry) => {
          if (entry.mode === 'upi') {
            upiCount++;
            upiAmount += entry.amount;
          } else if (entry.mode === 'cash') {
            cashCount++;
            cashAmount += entry.amount;
          }
        });
      }
    });

    return { upiCount, upiAmount, cashCount, cashAmount };
  }, [payments, selectedMonth, selectedYear, rooms]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Payment Mode</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <UpiLogo className="h-10 w-10" />
            </div>
            <div>
              <div className="text-lg font-bold">₹{stats.upiAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">UPI ({stats.upiCount})</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <CashLogo className="h-10 w-10" />
            </div>
            <div>
              <div className="text-lg font-bold">₹{stats.cashAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Cash ({stats.cashCount})</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
