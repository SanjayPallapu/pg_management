import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, X, History, Receipt, Bell, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { OverduePaymentDialog } from './OverduePaymentDialog';
import { PaymentHistorySheet } from './PaymentHistorySheet';
import { WhatsAppReceiptDialog } from './WhatsAppReceiptDialog';
import { PaymentReminderDialog } from './PaymentReminderDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PaymentEntry } from '@/types';

interface PreviousOverdueSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OverdueTenant {
  id: string;
  name: string;
  phone: string;
  roomNo: string;
  monthlyRent: number;
  startDate: string;
  amountPaid: number;
  remaining: number;
  status: 'Pending' | 'Partial';
  paymentEntries: PaymentEntry[];
}

export const PreviousOverdueSheet = ({ open, onOpenChange }: PreviousOverdueSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, upsertPayment } = useTenantPayments();
  const { rooms } = useRooms();
  const isMobile = useIsMobile();

  const [selectedTenant, setSelectedTenant] = useState<OverdueTenant | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [reminderData, setReminderData] = useState<any>(null);
  const [previousMonthPendingData, setPreviousMonthPendingData] = useState<{
    month: number;
    year: number;
    amount: number;
    amountPaid: number;
    remaining: number;
  } | null>(null);

  useBackGesture(open, () => onOpenChange(false));

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

    const overdueList: OverdueTenant[] = [];

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
          status: 'Pending',
          paymentEntries: []
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
          status: 'Partial',
          paymentEntries: (payment.paymentEntries || []) as PaymentEntry[]
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

  // Function to get previous month pending for a tenant (month before prevMonth)
  const getPreviousMonthPending = (tenantId: string) => {
    // Calculate the month before prevMonth (which is already one month before selectedMonth)
    let earlierMonth = prevMonth - 1;
    let earlierYear = prevYear;
    if (earlierMonth === 0) {
      earlierMonth = 12;
      earlierYear = prevYear - 1;
    }

    // Find tenant's details
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));
    const tenant = allTenants.find(t => t.id === tenantId);
    
    if (!tenant) return null;

    // Check if tenant was active in that earlier month
    if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, earlierYear, earlierMonth)) {
      return null;
    }

    const payment = payments.find(p => 
      p.tenantId === tenantId && p.month === earlierMonth && p.year === earlierYear
    );

    if (!payment || payment.paymentStatus === 'Pending') {
      return {
        month: earlierMonth,
        year: earlierYear,
        amount: tenant.monthlyRent,
        amountPaid: 0,
        remaining: tenant.monthlyRent,
      };
    } else if (payment.paymentStatus === 'Partial') {
      const remaining = tenant.monthlyRent - (payment.amountPaid || 0);
      return {
        month: earlierMonth,
        year: earlierYear,
        amount: tenant.monthlyRent,
        amountPaid: payment.amountPaid || 0,
        remaining,
      };
    }
    
    return null; // Fully paid
  };

  const handleMarkPaidClick = (tenant: OverdueTenant) => {
    setSelectedTenant(tenant);
    // Check for previous month pending
    const prevPending = getPreviousMonthPending(tenant.id);
    setPreviousMonthPendingData(prevPending);
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = (data: {
    tenantId: string;
    amount: number;
    date: string;
    mode: 'upi' | 'cash';
    month: number;
    year: number;
    monthlyRent: number;
    existingPaid: number;
    previousMonthPending?: {
      month: number;
      year: number;
      amount: number;
      amountPaid: number;
      remaining: number;
    } | null;
  }) => {
    const totalPaid = data.existingPaid + data.amount;
    const isFullPayment = totalPaid >= data.monthlyRent;

    // Get existing payment entries
    const existingPayment = payments.find(p => 
      p.tenantId === data.tenantId && p.month === data.month && p.year === data.year
    );
    const existingEntries = existingPayment?.paymentEntries || [];

    const newEntry = {
      amount: data.amount,
      date: data.date,
      type: isFullPayment ? 'full' as const : 'partial' as const,
      mode: data.mode
    };

    upsertPayment.mutate({
      tenantId: data.tenantId,
      month: data.month,
      year: data.year,
      paymentStatus: isFullPayment ? 'Paid' : 'Partial',
      paymentDate: data.date,
      amount: data.monthlyRent,
      amountPaid: isFullPayment ? data.monthlyRent : totalPaid,
      paymentEntries: [...existingEntries, newEntry]
    });

    toast({
      title: isFullPayment ? 'Payment completed' : 'Partial payment recorded',
      description: `₹${data.amount.toLocaleString()} paid via ${data.mode.toUpperCase()} for ${months[data.month - 1]} ${data.year}`
    });
  };

  return (
    <>
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
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setHistoryOpen(true)} 
                  className="h-8 w-8"
                  title="Payment History"
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {months[prevMonth - 1]} {prevYear} • {overdueTenants.length} tenant(s) • ₹{totalOverdue.toLocaleString()}
            </p>
          </SheetHeader>

          <ScrollArea className={isMobile ? "h-[calc(100vh-120px)]" : "h-[calc(100vh-100px)] mt-4"}>
            <div className="space-y-3 pr-2">
              {overdueTenants.map(tenant => {
                const hasPhone = tenant.phone && tenant.phone !== '••••••••••';
                const hasPaymentEntries = tenant.paymentEntries.length > 0;
                
                const handleOpenReceipt = () => {
                  // Get previous month pending for this tenant (month before prevMonth)
                  const prevPending = getPreviousMonthPending(tenant.id);
                  setReceiptData({
                    tenantName: tenant.name,
                    tenantPhone: tenant.phone,
                    monthlyRent: tenant.monthlyRent,
                    amountPaid: tenant.amountPaid,
                    joiningDate: tenant.startDate,
                    roomNo: tenant.roomNo,
                    forMonth: `${months[prevMonth - 1]} ${prevYear}`,
                    paymentEntries: tenant.paymentEntries,
                    previousMonthPending: prevPending?.remaining || undefined,
                  });
                  setReceiptDialogOpen(true);
                };

                const handleOpenReminder = () => {
                  setReminderData({
                    tenantName: tenant.name,
                    tenantPhone: tenant.phone,
                    monthlyRent: tenant.monthlyRent,
                    joiningDate: tenant.startDate,
                    roomNo: tenant.roomNo,
                    forMonth: `${months[prevMonth - 1]} ${prevYear}`,
                    // Pass the previous month context for billing range calculation
                    overrideMonth: prevMonth,
                    overrideYear: prevYear,
                  });
                  setReminderDialogOpen(true);
                };

                return (
                  <div 
                    key={tenant.id} 
                    className="p-4 rounded-xl bg-advance-not-paid/20 border-l-4 border-advance-not-paid"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tenant.name}</span>
                        {hasPhone && (
                          <>
                            <a 
                              href={`tel:${tenant.phone}`}
                              className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                {hasPaymentEntries && (
                                  <DropdownMenuItem onClick={handleOpenReceipt}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Generate Receipt
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleOpenReminder}>
                                  <Bell className="h-4 w-4 mr-2" />
                                  Payment Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`https://wa.me/91${tenant.phone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Chat with Tenant
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                        onClick={() => handleMarkPaidClick(tenant)}
                        disabled={upsertPayment.isPending}
                      >
                        Mark Paid
                      </Button>
                    </div>
                    {tenant.status === 'Partial' && tenant.paymentEntries.length > 0 && (
                      <div className="text-xs mt-2 text-paid">
                        Paid: {tenant.paymentEntries.map((entry, idx) => (
                          <span key={idx}>
                            {idx > 0 && ' + '}
                            {format(new Date(entry.date), 'dd MMM')} (₹{entry.amount.toLocaleString()})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {overdueTenants.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No overdue payments from {months[prevMonth - 1]}!
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <OverduePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        tenant={selectedTenant}
        month={prevMonth}
        year={prevYear}
        previousMonthPending={previousMonthPendingData}
        onConfirmPayment={handleConfirmPayment}
      />

      <PaymentHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <WhatsAppReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receiptData={receiptData}
        onWhatsappSent={() => {}}
      />

      <PaymentReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />
    </>
  );
};
