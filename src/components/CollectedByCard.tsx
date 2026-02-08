import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';

export const CollectedByCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();

  const collectionsByPerson = useMemo(() => {
    const collections: Record<string, number> = {};

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (tenant.isLocked) return;
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return;

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );
        if (!payment?.paymentEntries) return;

        (payment.paymentEntries as PaymentEntry[]).forEach(entry => {
          const collector = entry.collectedBy || 'Unknown';
          collections[collector] = (collections[collector] || 0) + entry.amount;
        });
      });
    });

    return collections;
  }, [rooms, payments, selectedMonth, selectedYear]);

  const entries = Object.entries(collectionsByPerson);
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>👥</span>
          Collected By
        </CardTitle>
        <Users className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          {entries.map(([name, amount]) => (
            <div key={name} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">{name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-paid">₹{amount.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({Math.round((amount / total) * 100)}%)
                </span>
              </div>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-bold">₹{total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
