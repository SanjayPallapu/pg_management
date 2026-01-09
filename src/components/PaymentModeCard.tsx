import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UpiLogo } from '@/components/icons/UpiLogo';
import { CashLogo } from '@/components/icons/CashLogo';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileSearch } from 'lucide-react';
import { PaymentReconciliation } from './PaymentReconciliation';

interface PaymentDetail {
  tenantName: string;
  amount: number;
  date: string;
}

export const PaymentModeCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const [reconciliationOpen, setReconciliationOpen] = useState(false);

  const stats = useMemo(() => {
    // Get eligible tenant IDs for the selected month
    const eligibleTenantIds = new Set(
      rooms.flatMap(room =>
        room.tenants
          .filter(tenant => isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth))
          .map(tenant => tenant.id)
      )
    );

    // Create a map of tenant IDs to names
    const tenantNameMap = new Map<string, string>();
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        tenantNameMap.set(tenant.id, tenant.name);
      });
    });

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
    const upiDetails: PaymentDetail[] = [];
    const cashDetails: PaymentDetail[] = [];

    monthPayments.forEach(payment => {
      const tenantName = tenantNameMap.get(payment.tenantId) || 'Unknown';
      
      if (payment.paymentEntries && payment.paymentEntries.length > 0) {
        payment.paymentEntries.forEach((entry: PaymentEntry) => {
          if (entry.mode === 'upi') {
            upiCount++;
            upiAmount += entry.amount;
            upiDetails.push({
              tenantName,
              amount: entry.amount,
              date: entry.date,
            });
          } else if (entry.mode === 'cash') {
            cashCount++;
            cashAmount += entry.amount;
            cashDetails.push({
              tenantName,
              amount: entry.amount,
              date: entry.date,
            });
          }
        });
      }
    });

    // Sort by date ascending (oldest first - sequence order)
    upiDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    cashDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { upiCount, upiAmount, cashCount, cashAmount, upiDetails, cashDetails };
  }, [payments, selectedMonth, selectedYear, rooms]);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium">Payment Mode</CardTitle>
          <div>
            <ThemeToggle className="rounded-md border-primary" />
            <button 
              onClick={() => setReconciliationOpen(true)}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="View Reconciliation"
            >
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </button>
          </div>
          
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between">
            {/* UPI Section with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <UpiLogo className="h-10 w-10" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">₹{stats.upiAmount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">UPI ({stats.upiCount})</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <div className="space-y-2">
                  <div className="font-semibold text-sm border-b pb-1">UPI Payments ({stats.upiCount})</div>
                  {stats.upiDetails.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {stats.upiDetails.slice(0, 10).map((detail, idx) => (
                        <div key={idx} className="flex justify-between text-xs gap-4">
                          <span className="truncate">{detail.tenantName}</span>
                          <span className="font-medium whitespace-nowrap">
                            ₹{detail.amount.toLocaleString()} • {format(new Date(detail.date), 'dd MMM')}
                          </span>
                        </div>
                      ))}
                      {stats.upiDetails.length > 10 && (
                        <div className="text-xs text-muted-foreground text-center pt-1">
                          +{stats.upiDetails.length - 10} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No UPI payments</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Cash Section with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CashLogo className="h-10 w-10" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">₹{stats.cashAmount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Cash ({stats.cashCount})</p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <div className="space-y-2">
                  <div className="font-semibold text-sm border-b pb-1">Cash Payments ({stats.cashCount})</div>
                  {stats.cashDetails.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {stats.cashDetails.slice(0, 10).map((detail, idx) => (
                        <div key={idx} className="flex justify-between text-xs gap-4">
                          <span className="truncate">{detail.tenantName}</span>
                          <span className="font-medium whitespace-nowrap">
                            ₹{detail.amount.toLocaleString()} • {format(new Date(detail.date), 'dd MMM')}
                          </span>
                        </div>
                      ))}
                      {stats.cashDetails.length > 10 && (
                        <div className="text-xs text-muted-foreground text-center pt-1">
                          +{stats.cashDetails.length - 10} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No cash payments</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      <PaymentReconciliation open={reconciliationOpen} onOpenChange={setReconciliationOpen} />
    </TooltipProvider>
  );
};
