import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';

interface PreviousOverdueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PreviousOverdueSheet = ({ open, onOpenChange }: PreviousOverdueSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, upsertPayment } = useTenantPayments();
  const { rooms } = useRooms();
  const isMobile = useIsMobile();

  useBackGesture(open, () => onOpenChange(false));

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const { overdueTenants, prevMonth, prevYear, totalOverdue } = useMemo(() => {
    let pMonth = selectedMonth - 1;
    let pYear = selectedYear;
    if (pMonth === 0) {
      pMonth = 12;
      pYear = selectedYear - 1;
    }

    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));

    const activeTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, pYear, pMonth) && !tenant.isLocked
    );

    const overdueList: Array<{
      id: string;
      name: string;
      phone: string;
      roomNo: string;
      monthlyRent: number;
      startDate: string;
      amountPaid: number;
      remaining: number;
      status: 'Pending' | 'Partial';
    }> = [];

    let total = 0;

    activeTenants.forEach(tenant => {
      const payment = payments.find(p => 
        p.tenantId === tenant.id && p.month === pMonth && p.year === pYear
      );

      if (!payment || payment.paymentStatus === 'Pending') {
        total += tenant.monthlyRent;
        overdueList.push({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          roomNo: tenant.roomNo,
          monthlyRent: tenant.monthlyRent,
          startDate: tenant.startDate,
          amountPaid: 0,
          remaining: tenant.monthlyRent,
          status: 'Pending'
        });
      } else if (payment.paymentStatus === 'Partial') {
        const remaining = tenant.monthlyRent - (payment.amountPaid || 0);
        total += remaining;
        overdueList.push({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          roomNo: tenant.roomNo,
          monthlyRent: tenant.monthlyRent,
          startDate: tenant.startDate,
          amountPaid: payment.amountPaid || 0,
          remaining,
          status: 'Partial'
        });
      }
    });

    return {
      overdueTenants: overdueList,
      prevMonth: pMonth,
      prevYear: pYear,
      totalOverdue: total
    };
  }, [selectedMonth, selectedYear, rooms, payments]);

  const handleMarkPaid = (tenantId: string, tenant: typeof overdueTenants[0]) => {
    upsertPayment.mutate({
      tenantId,
      month: prevMonth,
      year: prevYear,
      paymentStatus: 'Paid',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      amount: tenant.monthlyRent,
      amountPaid: tenant.monthlyRent,
      paymentEntries: [{
        amount: tenant.remaining,
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'full',
        mode: 'cash'
      }]
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "w-full sm:max-w-lg"}
      >
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base text-destructive">
              Previous Month Overdue
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {months[prevMonth - 1]} {prevYear} • {overdueTenants.length} tenant(s) • ₹{totalOverdue.toLocaleString()}
          </p>
        </SheetHeader>

        <ScrollArea className={isMobile ? "h-[calc(100vh-120px)]" : "h-[calc(100vh-100px)] mt-4"}>
          <div className="space-y-3 pr-2">
            {overdueTenants.map(tenant => (
              <div 
                key={tenant.id} 
                className="p-4 rounded-xl bg-advance-not-paid/20 border-l-4 border-advance-not-paid"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tenant.name}</span>
                    {tenant.phone && tenant.phone !== '••••••••••' && (
                      <>
                        <a 
                          href={`tel:${tenant.phone}`}
                          className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <a
                          href={`https://wa.me/91${tenant.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </>
                    )}
                  </div>
                  <span className="font-bold text-lg text-advance-not-paid">₹{tenant.remaining.toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">Room {tenant.roomNo}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Joined: {format(new Date(tenant.startDate), 'dd MMM yyyy')}
                  </span>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleMarkPaid(tenant.id, tenant)}
                    disabled={upsertPayment.isPending}
                  >
                    Mark Paid
                  </Button>
                </div>
                {tenant.status === 'Partial' && (
                  <div className="text-xs mt-2 text-paid">
                    Already paid: ₹{tenant.amountPaid.toLocaleString()}
                  </div>
                )}
              </div>
            ))}

            {overdueTenants.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No overdue payments from {months[prevMonth - 1]}!
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
