import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { X, Users, Calendar, IndianRupee } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { Room } from '@/types';
import { format } from 'date-fns';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { calculateProRataRent } from '@/utils/proRataRent';
import { getMonthLabel } from '@/constants/pricing';

interface SettlementSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
}

export const SettlementSummarySheet = ({
  open,
  onOpenChange,
  rooms,
}: SettlementSummarySheetProps) => {
  const isMobile = useIsMobile();
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  useBackGesture(open, () => onOpenChange(false));

  // Get all left tenants for the selected month
  const leftTenants = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo,
      capacity: room.capacity
    })));

    // Filter tenants who left in this month
    return allTenants
      .filter(tenant => {
        if (!tenant.endDate) return false;
        const endDate = new Date(tenant.endDate);
        return endDate.getMonth() + 1 === selectedMonth && 
               endDate.getFullYear() === selectedYear;
      })
      .map(tenant => {
        // Get payment for this month
        const payment = payments.find(p => 
          p.tenantId === tenant.id && 
          p.month === selectedMonth && 
          p.year === selectedYear
        );
        
        const amountPaid = payment?.amountPaid || 0;
        
        // Calculate pro-rata
        const { effectiveRent, daysStayed, isProRata } = calculateProRataRent(
          tenant.monthlyRent,
          tenant.startDate,
          tenant.endDate,
          selectedYear,
          selectedMonth,
          amountPaid
        );

        // Parse notes for discount/extra
        let discount = 0;
        let extra = 0;
        if (payment?.notes) {
          const discountMatch = payment.notes.match(/Discount:\s*₹?([\d,]+)/);
          const extraMatch = payment.notes.match(/Extra:\s*₹?([\d,]+)/);
          if (discountMatch) discount = parseInt(discountMatch[1].replace(/,/g, '')) || 0;
          if (extraMatch) extra = parseInt(extraMatch[1].replace(/,/g, '')) || 0;
        }

        const dailyRate = Math.round(tenant.monthlyRent / 30);
        const finalDue = effectiveRent - discount + extra;
        const balance = finalDue - amountPaid;
        const status = amountPaid >= finalDue ? 'Settled' : 
                       amountPaid > 0 ? 'Partial' : 'Pending';

        return {
          ...tenant,
          payment,
          effectiveRent,
          daysStayed,
          isProRata,
          dailyRate,
          discount,
          extra,
          finalDue,
          amountPaid,
          balance,
          status
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms, payments, selectedMonth, selectedYear]);

  // Summary statistics
  const summary = useMemo(() => {
    const totalDue = leftTenants.reduce((sum, t) => sum + t.finalDue, 0);
    const totalPaid = leftTenants.reduce((sum, t) => sum + t.amountPaid, 0);
    const totalBalance = leftTenants.reduce((sum, t) => sum + Math.max(0, t.balance), 0);
    const totalDiscount = leftTenants.reduce((sum, t) => sum + t.discount, 0);
    const totalExtra = leftTenants.reduce((sum, t) => sum + t.extra, 0);
    const settledCount = leftTenants.filter(t => t.status === 'Settled').length;

    return { totalDue, totalPaid, totalBalance, totalDiscount, totalExtra, settledCount };
  }, [leftTenants]);

  const monthName = getMonthLabel(selectedMonth);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isMobile ? "right" : "bottom"} 
        className={isMobile ? "w-full max-w-full sm:max-w-full h-full p-4 [&>button]:hidden" : "h-[85vh]"}
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Settlement Summary - {monthName} {selectedYear}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className={isMobile ? 'h-[calc(100vh-100px)] overflow-y-auto scrollbar-none' : ''}>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-xl font-bold">{leftTenants.length}</div>
              <p className="text-xs text-muted-foreground">Left Tenants</p>
            </div>
            <div className="bg-paid/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-paid">₹{summary.totalPaid.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
            <div className="bg-pending/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-pending">₹{summary.totalBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Total Pro-rata Due:</span>
              <span className="font-medium">₹{summary.totalDue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Settled:</span>
              <span className="font-medium text-paid">{summary.settledCount}/{leftTenants.length}</span>
            </div>
            {summary.totalDiscount > 0 && (
              <div className="flex justify-between p-2 bg-paid/10 rounded">
                <span className="text-muted-foreground">Total Discounts:</span>
                <span className="font-medium text-paid">₹{summary.totalDiscount.toLocaleString()}</span>
              </div>
            )}
            {summary.totalExtra > 0 && (
              <div className="flex justify-between p-2 bg-pending/10 rounded">
                <span className="text-muted-foreground">Total Extra:</span>
                <span className="font-medium text-pending">₹{summary.totalExtra.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Tenant List */}
          <ScrollArea className={isMobile ? "h-[calc(100vh-380px)]" : "h-[calc(85vh-280px)]"}>
            <div className="space-y-3">
              {leftTenants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No tenants left in {monthName} {selectedYear}</p>
                </div>
              ) : (
                leftTenants.map(tenant => (
                  <div
                    key={tenant.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{tenant.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Room {tenant.roomNo} • {tenant.capacity}-sharing
                        </div>
                      </div>
                      <Badge 
                        variant={tenant.status === 'Settled' ? 'default' : 'secondary'}
                        className={tenant.status === 'Settled' ? 'bg-paid text-paid-foreground' : 
                                  tenant.status === 'Partial' ? 'bg-partial text-partial-foreground' : 
                                  'bg-pending text-pending-foreground'}
                      >
                        {tenant.status}
                      </Badge>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      <span>Left: {format(new Date(tenant.endDate!), 'dd MMM yyyy')}</span>
                    </div>

                    {/* Pro-rata Breakdown */}
                    <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pro-rata Calculation:</span>
                        <span className="font-medium">
                          {tenant.daysStayed} days × ₹{tenant.dailyRate}/day = ₹{tenant.effectiveRent.toLocaleString()}
                        </span>
                      </div>
                      {tenant.discount > 0 && (
                        <div className="flex justify-between text-paid">
                          <span>Discount:</span>
                          <span>-₹{tenant.discount.toLocaleString()}</span>
                        </div>
                      )}
                      {tenant.extra > 0 && (
                        <div className="flex justify-between text-pending">
                          <span>Extra Amount:</span>
                          <span>+₹{tenant.extra.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Final Due:</span>
                        <span>₹{tenant.finalDue.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Payment Status */}
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        <span className="text-paid">Paid: ₹{tenant.amountPaid.toLocaleString()}</span>
                      </div>
                      {tenant.balance > 0 && (
                        <span className="text-pending font-medium">
                          Balance: ₹{tenant.balance.toLocaleString()}
                        </span>
                      )}
                      {tenant.balance < 0 && (
                        <span className="text-paid font-medium">
                          Refund: ₹{Math.abs(tenant.balance).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};