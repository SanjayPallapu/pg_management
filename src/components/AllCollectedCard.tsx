import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Room, PaymentEntry } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useDayGuests } from '@/hooks/useDayGuests';
import { isTenantActiveInMonth } from '@/utils/dateOnly';

interface AllCollectedCardProps {
  rooms: Room[];
}

interface PaymentBreakdown {
  upi: number;
  cash: number;
}

export const AllCollectedCard = ({ rooms }: AllCollectedCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { dayGuests } = useDayGuests();

  const stats = useMemo(() => {
    // 1. Actual tenants (current month rent) - exclude locked tenants
    const tenantUpi: PaymentBreakdown = { upi: 0, cash: 0 };
    
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        // Skip locked tenants
        if (tenant.isLocked) return;
        
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          return;
        }

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );

        if (payment?.paymentEntries) {
          payment.paymentEntries.forEach((entry: PaymentEntry) => {
            if (entry.mode === 'upi') {
              tenantUpi.upi += entry.amount;
            } else if (entry.mode === 'cash') {
              tenantUpi.cash += entry.amount;
            }
          });
        }
      });
    });

    // 2. Boarder tenants (previous month overdue paid this month)
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const boarderUpi: PaymentBreakdown = { upi: 0, cash: 0 };

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        // Skip locked tenants
        if (tenant.isLocked) return;
        
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)) {
          return;
        }

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear
        );

        if (payment?.paymentEntries) {
          // Only count entries made in the current month
          payment.paymentEntries.forEach((entry: PaymentEntry) => {
            const entryDate = new Date(entry.date);
            if (entryDate.getMonth() + 1 === selectedMonth && entryDate.getFullYear() === selectedYear) {
              if (entry.mode === 'upi') {
                boarderUpi.upi += entry.amount;
              } else if (entry.mode === 'cash') {
                boarderUpi.cash += entry.amount;
              }
            }
          });
        }
      });
    });

    // 3. Day guest revenue
    const dayGuestUpi: PaymentBreakdown = { upi: 0, cash: 0 };
    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth, 0);

    dayGuests.forEach(guest => {
      const fromDate = new Date(guest.from_date);
      if (fromDate >= startOfMonth && fromDate <= endOfMonth) {
        const entries = (guest.payment_entries as any[]) || [];
        entries.forEach(entry => {
          if (entry.mode === 'upi') {
            dayGuestUpi.upi += entry.amount || 0;
          } else if (entry.mode === 'cash') {
            dayGuestUpi.cash += entry.amount || 0;
          }
        });
      }
    });

    // 4. Security deposits (current month only)
    const securityUpi: PaymentBreakdown = { upi: 0, cash: 0 };
    
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!tenant.securityDepositAmount || !tenant.securityDepositDate) return;
        
        const depositDate = new Date(tenant.securityDepositDate);
        if (depositDate.getMonth() + 1 === selectedMonth && depositDate.getFullYear() === selectedYear) {
          const mode = tenant.securityDepositMode;
          if (mode === 'upi') {
            securityUpi.upi += tenant.securityDepositAmount;
          } else if (mode === 'cash') {
            securityUpi.cash += tenant.securityDepositAmount;
          }
        }
      });
    });

    return {
      tenant: tenantUpi,
      boarder: boarderUpi,
      dayGuest: dayGuestUpi,
      security: securityUpi,
      totalUpi: tenantUpi.upi + boarderUpi.upi + dayGuestUpi.upi + securityUpi.upi,
      totalCash: tenantUpi.cash + boarderUpi.cash + dayGuestUpi.cash + securityUpi.cash,
    };
  }, [rooms, payments, dayGuests, selectedMonth, selectedYear]);

  const grandTotal = stats.totalUpi + stats.totalCash;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium">All Collections</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold mb-3">₹{grandTotal.toLocaleString()}</div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {/* UPI Column */}
          <div className="space-y-1.5 p-2 rounded-lg bg-blue-500/10">
            <div className="font-medium text-blue-600 dark:text-blue-400 text-center pb-1 border-b border-blue-500/20">
              UPI: ₹{stats.totalUpi.toLocaleString()}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tenants</span>
              <span>₹{stats.tenant.upi.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Overdue</span>
              <span>₹{stats.boarder.upi.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Day Guest</span>
              <span>₹{stats.dayGuest.upi.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Security</span>
              <span>₹{stats.security.upi.toLocaleString()}</span>
            </div>
          </div>

          {/* Cash Column */}
          <div className="space-y-1.5 p-2 rounded-lg bg-green-500/10">
            <div className="font-medium text-green-600 dark:text-green-400 text-center pb-1 border-b border-green-500/20">
              Cash: ₹{stats.totalCash.toLocaleString()}
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tenants</span>
              <span>₹{stats.tenant.cash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Overdue</span>
              <span>₹{stats.boarder.cash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Day Guest</span>
              <span>₹{stats.dayGuest.cash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Security</span>
              <span>₹{stats.security.cash.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
