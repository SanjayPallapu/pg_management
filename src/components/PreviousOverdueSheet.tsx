import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { usePG } from '@/contexts/PGContext';
import { isTenantActiveInMonth, hasTenantLeftNow, tenantLeftInMonth } from '@/utils/dateOnly';
import { calculateProRataRent } from '@/utils/proRataRent';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, X, History, Receipt, Bell, CreditCard } from 'lucide-react';
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
  endDate?: string;
  amountPaid: number;
  remaining: number;
  status: 'Pending' | 'Partial';
  paymentEntries: PaymentEntry[];
  proRataInfo?: {
    effectiveRent: number;
    daysStayed: number;
    dailyRate: number;
  };
}

export const PreviousOverdueSheet = ({ open, onOpenChange }: PreviousOverdueSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, upsertPayment } = useTenantPayments();
  const { rooms } = useRooms();
  const { currentPG } = usePG();
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

  const { overdueTenants, leftUnpaidTenants, prevMonth, prevYear, totalOverdue, leftUnpaidTotal } = useMemo(() => {
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

    // Active tenants for previous month (not locked, still active)
    const activeTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, pYear, pMonth) && !tenant.isLocked
    );

    // Left tenants who were active in previous month but have now left
    const leftTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, pYear, pMonth) && 
      hasTenantLeftNow(tenant.endDate) && 
      !tenant.isLocked
    );

    const overdueList: OverdueTenant[] = [];
    const leftUnpaidList: OverdueTenant[] = [];

    let total = 0;
    let leftTotal = 0;

    // Active tenants with pending dues
    activeTenants.forEach(tenant => {
      // Skip if tenant has left (will be handled separately)
      if (hasTenantLeftNow(tenant.endDate)) return;
      
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

    // Left tenants who were active in previous month but have now left
    leftTenants.forEach(tenant => {
      const payment = payments.find(p => 
        p.tenantId === tenant.id && p.month === pMonth && p.year === pYear
      );

      // Calculate pro-rata for tenants who left IN the previous month
      const leftInPrevMonth = tenantLeftInMonth(tenant.endDate, pYear, pMonth);
      let effectiveRent = tenant.monthlyRent;
      let proRataInfo: { effectiveRent: number; daysStayed: number; dailyRate: number } | undefined;

      if (leftInPrevMonth && tenant.endDate) {
        const proRata = calculateProRataRent(
          tenant.monthlyRent,
          tenant.startDate,
          tenant.endDate,
          pYear,
          pMonth,
          payment?.amountPaid || 0
        );
        if (proRata.isProRata) {
          effectiveRent = proRata.effectiveRent;
          proRataInfo = {
            effectiveRent: proRata.effectiveRent,
            daysStayed: proRata.daysStayed,
            dailyRate: proRata.dailyRate,
          };
        }
      }

      if (!payment || payment.paymentStatus === 'Pending') {
        leftTotal += effectiveRent;
        leftUnpaidList.push({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          roomNo: tenant.roomNo,
          monthlyRent: effectiveRent, // Use effective rent for calculation
          startDate: tenant.startDate,
          endDate: tenant.endDate,
          amountPaid: 0,
          remaining: effectiveRent,
          status: 'Pending',
          paymentEntries: [],
          proRataInfo,
        });
      } else if (payment.paymentStatus === 'Partial') {
        const remaining = effectiveRent - (payment.amountPaid || 0);
        if (remaining > 0) {
          leftTotal += remaining;
          leftUnpaidList.push({
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            roomNo: tenant.roomNo,
            monthlyRent: effectiveRent, // Use effective rent for calculation
            startDate: tenant.startDate,
            endDate: tenant.endDate,
            amountPaid: payment.amountPaid || 0,
            remaining,
            status: 'Partial',
            paymentEntries: (payment.paymentEntries || []) as PaymentEntry[],
            proRataInfo,
          });
        }
      }
    });

    return {
      overdueTenants: overdueList,
      leftUnpaidTenants: leftUnpaidList,
      prevMonth: pMonth,
      prevYear: pYear,
      totalOverdue: total,
      leftUnpaidTotal: leftTotal
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
    discount?: number;
    notes?: string;
  }) => {
    const discount = data.discount || 0;
    const effectiveMonthlyRent = data.monthlyRent - discount;
    const totalPaid = data.existingPaid + data.amount;
    const isFullPayment = totalPaid >= effectiveMonthlyRent;

    // Get existing payment entries
    const existingPayment = payments.find(p => 
      p.tenantId === data.tenantId && p.month === data.month && p.year === data.year
    );
    const existingEntries = existingPayment?.paymentEntries || [];
    const existingNotes = existingPayment?.notes || '';

    const newEntry = {
      amount: data.amount,
      date: data.date,
      type: isFullPayment ? 'full' as const : 'partial' as const,
      mode: data.mode
    };

    // Combine notes
    let notes = existingNotes;
    if (data.notes) {
      notes = existingNotes ? `${existingNotes} | ${data.notes}` : data.notes;
    }

    upsertPayment.mutate({
      tenantId: data.tenantId,
      month: data.month,
      year: data.year,
      paymentStatus: isFullPayment ? 'Paid' : 'Partial',
      paymentDate: data.date,
      amount: data.monthlyRent,
      amountPaid: isFullPayment ? effectiveMonthlyRent : totalPaid,
      paymentEntries: [...existingEntries, newEntry],
      notes: notes || undefined,
    });

    toast({
      title: isFullPayment ? 'Payment completed' : 'Partial payment recorded',
      description: `₹${data.amount.toLocaleString()} paid via ${data.mode.toUpperCase()} for ${months[data.month - 1]} ${data.year}${discount > 0 ? ` (Discount: ₹${discount})` : ''}`
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
              {leftUnpaidTotal > 0 && (
                <span className="text-destructive"> • Left Unpaid: ₹{leftUnpaidTotal.toLocaleString()}</span>
              )}
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
                    // Add PG branding for previous month data
                    pgName: currentPG?.name,
                    pgLogoUrl: currentPG?.logoUrl,
                  });
                  setReceiptDialogOpen(true);
                };

                const handleOpenReminder = () => {
                  setReminderData({
                    tenantName: tenant.name,
                    tenantPhone: tenant.phone,
                    joiningDate: tenant.startDate,
                    roomNo: tenant.roomNo,
                    forMonth: `${months[prevMonth - 1]} ${prevYear}`,
                    sharingType: '', // Not needed for reminder
                    amount: tenant.monthlyRent,
                    amountPaid: tenant.amountPaid,
                    balance: tenant.remaining,
                    // Pass the previous month context for billing range calculation
                    overrideMonth: prevMonth,
                    overrideYear: prevYear,
                    // Add PG branding
                    pgName: currentPG?.name,
                    pgLogoUrl: currentPG?.logoUrl,
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
                              className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={handleOpenReminder}>
                                  <Bell className="h-4 w-4 mr-2" />
                                  Payment Reminder
                                </DropdownMenuItem>
                                {hasPaymentEntries && (
                                  <DropdownMenuItem onClick={handleOpenReceipt}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Generate Receipt
                                  </DropdownMenuItem>
                                )}
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
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-3">
                      <div>Rent: <span className="text-foreground font-medium">₹{tenant.monthlyRent.toLocaleString()}</span></div>
                      <div>Paid: <span className="text-paid font-medium">₹{tenant.amountPaid.toLocaleString()}</span></div>
                      <div>Balance: <span className="text-advance-not-paid font-medium">₹{tenant.remaining.toLocaleString()}</span></div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        tenant.status === 'Pending' 
                          ? 'bg-advance-not-paid/20 text-advance-not-paid' 
                          : 'bg-partial/20 text-partial'
                      }`}>
                        {tenant.status}
                      </span>
                      <Button 
                        size="sm" 
                        onClick={() => handleMarkPaidClick(tenant)}
                        disabled={upsertPayment.isPending}
                        className="gap-1"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Pay Now
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

              {/* Left but Unpaid Section */}
              {leftUnpaidTenants.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                    🚪 Left but Unpaid ({leftUnpaidTenants.length}) • ₹{leftUnpaidTotal.toLocaleString()}
                  </h3>
                  <div className="space-y-3">
                    {leftUnpaidTenants.map(tenant => {
                      const hasPhone = tenant.phone && tenant.phone !== '••••••••••';
                      
                      return (
                        <div 
                          key={tenant.id} 
                          className="p-4 rounded-xl bg-destructive/10 border-l-4 border-destructive"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{tenant.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">LEFT</span>
                              {hasPhone && (
                                <a 
                                  href={`tel:${tenant.phone}`}
                                  className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                                >
                                  <Phone className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            <span className="font-bold text-lg text-destructive">₹{tenant.remaining.toLocaleString()}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Room {tenant.roomNo}
                            {tenant.endDate && (
                              <span className="ml-2">• Left: {format(new Date(tenant.endDate), 'dd MMM yyyy')}</span>
                            )}
                          </div>
                          {/* Pro-rata breakdown for left tenants */}
                          {tenant.proRataInfo && (
                            <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted/30 rounded">
                              Pro-rata: {tenant.proRataInfo.daysStayed} days × ₹{tenant.proRataInfo.dailyRate}/day = ₹{tenant.proRataInfo.effectiveRent.toLocaleString()}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              tenant.status === 'Pending' 
                                ? 'bg-destructive/20 text-destructive' 
                                : 'bg-partial/20 text-partial'
                            }`}>
                              {tenant.status}
                            </span>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleMarkPaidClick(tenant)}
                              disabled={upsertPayment.isPending}
                              className="gap-1"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay Now
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
                  </div>
                </div>
              )}

              {overdueTenants.length === 0 && leftUnpaidTenants.length === 0 && (
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
