import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Banknote } from 'lucide-react';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { PaymentEntry } from '@/types';

export const PaymentModeCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  const stats = useMemo(() => {
    // Get payments for selected month
    const monthPayments = payments.filter(
      p => p.month === selectedMonth && p.year === selectedYear
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
  }, [payments, selectedMonth, selectedYear]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Payment Mode</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-lg font-bold">₹{stats.upiAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">UPI ({stats.upiCount})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-accent/50 flex items-center justify-center">
              <Banknote className="h-5 w-5 text-accent-foreground" />
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
