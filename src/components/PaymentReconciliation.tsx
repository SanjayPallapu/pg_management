import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertTriangle, User } from 'lucide-react';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { useRentCalculations } from '@/hooks/useRentCalculations';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { format } from 'date-fns';

interface PaymentReconciliationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentReconciliation = ({ open, onOpenChange }: PaymentReconciliationProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();

  const { rentCollected, paidTenants, partialTenants } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const reconciliationData = useMemo(() => {
    // Get eligible tenant IDs
    const eligibleTenantIds = new Set(
      rooms.flatMap(room =>
        room.tenants
          .filter(tenant => isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth))
          .map(tenant => tenant.id)
      )
    );

    // Get payments from eligible tenants
    const eligiblePayments = payments.filter(
      p => p.month === selectedMonth && 
           p.year === selectedYear && 
           eligibleTenantIds.has(p.tenantId)
    );

    // Calculate payment mode totals from entries
    let upiTotal = 0;
    let cashTotal = 0;
    let upiCount = 0;
    let cashCount = 0;

    const paymentDetails: Array<{
      tenantId: string;
      tenantName: string;
      roomNo: string;
      monthlyRent: number;
      status: string;
      amountPaid: number;
      entries: PaymentEntry[];
      entriesTotal: number;
    }> = [];

    eligiblePayments.forEach(payment => {
      const room = rooms.find(r => r.tenants.some(t => t.id === payment.tenantId));
      const tenant = room?.tenants.find(t => t.id === payment.tenantId);

      if (!tenant || !room) return;

      let entriesTotal = 0;
      const entries = payment.paymentEntries || [];

      entries.forEach((entry: PaymentEntry) => {
        entriesTotal += entry.amount;
        if (entry.mode === 'upi') {
          upiTotal += entry.amount;
          upiCount++;
        } else if (entry.mode === 'cash') {
          cashTotal += entry.amount;
          cashCount++;
        }
      });

      if (payment.paymentStatus === 'Paid' || payment.paymentStatus === 'Partial') {
        paymentDetails.push({
          tenantId: payment.tenantId,
          tenantName: tenant.name,
          roomNo: room.roomNo,
          monthlyRent: tenant.monthlyRent,
          status: payment.paymentStatus,
          amountPaid: payment.amountPaid || 0,
          entries,
          entriesTotal,
        });
      }
    });

    const paymentModeTotal = upiTotal + cashTotal;
    const isMatching = rentCollected === paymentModeTotal;

    return {
      rentCollected,
      paymentModeTotal,
      upiTotal,
      cashTotal,
      upiCount,
      cashCount,
      isMatching,
      difference: rentCollected - paymentModeTotal,
      paymentDetails,
      paidCount: paidTenants.length,
      partialCount: partialTenants.length,
    };
  }, [payments, selectedMonth, selectedYear, rooms, rentCollected, paidTenants, partialTenants]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Payment Reconciliation
            <Badge variant="outline">{months[selectedMonth - 1]} {selectedYear}</Badge>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          <div className="space-y-6">
            {/* Summary Comparison */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Summary Comparison</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Rent Collected</div>
                  <div className="text-lg font-bold text-paid">₹{reconciliationData.rentCollected.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {reconciliationData.paidCount} paid + {reconciliationData.partialCount} partial
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Payment Entries Total</div>
                  <div className="text-lg font-bold">₹{reconciliationData.paymentModeTotal.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {reconciliationData.upiCount} UPI + {reconciliationData.cashCount} Cash
                  </div>
                </div>
              </div>

              {/* Match Status */}
              <div className={`p-3 rounded-lg flex items-center gap-2 ${reconciliationData.isMatching ? 'bg-paid/10 text-paid' : 'bg-destructive/10 text-destructive'}`}>
                {reconciliationData.isMatching ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">All payments match!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      Difference: ₹{Math.abs(reconciliationData.difference).toLocaleString()}
                      {reconciliationData.difference > 0 ? ' (Rent > Entries)' : ' (Entries > Rent)'}
                    </span>
                  </>
                )}
              </div>

              {/* Explanation */}
              {!reconciliationData.isMatching && (
                <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  <strong>Why mismatch?</strong> Rent Collected uses <code>monthlyRent</code> for fully paid tenants, 
                  while Payment Entries sums actual amounts. Overpayments or corrections can cause differences.
                </div>
              )}
            </div>

            {/* Payment Mode Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Payment Mode Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">UPI Payments</div>
                  <div className="text-lg font-bold">₹{reconciliationData.upiTotal.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{reconciliationData.upiCount} transactions</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Cash Payments</div>
                  <div className="text-lg font-bold">₹{reconciliationData.cashTotal.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{reconciliationData.cashCount} transactions</div>
                </div>
              </div>
            </div>

            {/* Individual Payment Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Payment Details ({reconciliationData.paymentDetails.length})</h3>
              <div className="space-y-2">
                {reconciliationData.paymentDetails.map((detail) => (
                  <div key={detail.tenantId} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{detail.tenantName}</span>
                        <span className="text-xs text-muted-foreground">Room {detail.roomNo}</span>
                      </div>
                      <Badge className={detail.status === 'Paid' ? 'bg-paid text-paid-foreground' : 'bg-partial text-partial-foreground'}>
                        {detail.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <div className="font-medium">₹{detail.monthlyRent.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <div className="font-medium">₹{detail.amountPaid.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Entries Total:</span>
                        <div className={`font-medium ${detail.entriesTotal !== detail.amountPaid ? 'text-destructive' : ''}`}>
                          ₹{detail.entriesTotal.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {detail.entries.length > 0 && (
                      <div className="pt-2 border-t space-y-1">
                        {detail.entries.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Full'} on {format(new Date(entry.date), 'dd MMM')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded ${entry.mode === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                              </span>
                              <span className="font-medium">₹{entry.amount.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {reconciliationData.paymentDetails.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments recorded for this month
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};