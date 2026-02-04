import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, X, ChevronDown, ChevronRight, User, Phone, MessageCircle, Receipt, Bell, CreditCard } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { usePG } from '@/contexts/PGContext';
import { useRooms } from '@/hooks/useRooms';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useIsMobile } from '@/hooks/use-mobile';
import { isTenantActiveInMonth, hasTenantLeftNow } from '@/utils/dateOnly';
import { PaymentEntry } from '@/types';
import { format } from 'date-fns';
import { UpiLogo } from '@/components/icons/UpiLogo';
import { CashLogo } from '@/components/icons/CashLogo';
import { WhatsAppReceiptDialog } from './WhatsAppReceiptDialog';
import { PaymentReminderDialog } from './PaymentReminderDialog';
import { OverduePaymentDialog } from './OverduePaymentDialog';
import { toast } from '@/hooks/use-toast';

interface StillPendingTenant {
  id: string;
  name: string;
  phone: string;
  roomNo: string;
  monthlyRent: number;
  amountPaid: number;
  remaining: number;
  status: 'Pending' | 'Partial';
  hasLeft: boolean;
  endDate?: string;
  startDate: string;
  paymentEntries: PaymentEntry[];
}

export const PreviousMonthOverdueCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, upsertPayment } = useTenantPayments();
  const { rooms } = useRooms();
  const { currentPG } = usePG();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingSheetOpen, setPendingSheetOpen] = useState(false);
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  
  // Dialog states for still pending sheet
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedPendingTenant, setSelectedPendingTenant] = useState<StillPendingTenant | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [reminderData, setReminderData] = useState<any>(null);

  useBackGesture(sheetOpen, () => setSheetOpen(false));
  useBackGesture(pendingSheetOpen, () => setPendingSheetOpen(false));

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Calculate previous month
  const { prevMonth, prevYear } = useMemo(() => {
    let pMonth = selectedMonth - 1;
    let pYear = selectedYear;
    if (pMonth === 0) {
      pMonth = 12;
      pYear = selectedYear - 1;
    }
    return { prevMonth: pMonth, prevYear: pYear };
  }, [selectedMonth, selectedYear]);

  // Get payments for previous month that were collected in current month
  const { collectedData, totalCollected, upiTotal, cashTotal, totalOverdue, stillPendingTenants } = useMemo(() => {
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));

    const tenantsActiveInPrevMonth = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth) && !tenant.isLocked
    );

    const prevMonthPayments = payments.filter(p => 
      p.month === prevMonth && p.year === prevYear
    );

    let total = 0;
    let totalUpi = 0;
    let totalCash = 0;
    let totalOverdueAmount = 0;
    
    const details: Array<{
      tenantId: string;
      tenantName: string;
      roomNo: string;
      monthlyRent: number;
      amountPaid: number;
      status: 'Paid' | 'Partial' | 'Pending';
      entries: PaymentEntry[];
      currentMonthEntries: PaymentEntry[];
      remaining: number;
    }> = [];

    const pendingList: StillPendingTenant[] = [];

    tenantsActiveInPrevMonth.forEach(tenant => {
      const payment = prevMonthPayments.find(p => p.tenantId === tenant.id);
      const hasLeft = hasTenantLeftNow(tenant.endDate);
      
      if (!payment || payment.paymentStatus === 'Pending') {
        totalOverdueAmount += tenant.monthlyRent;
        pendingList.push({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          roomNo: tenant.roomNo,
          monthlyRent: tenant.monthlyRent,
          amountPaid: 0,
          remaining: tenant.monthlyRent,
          status: 'Pending',
          hasLeft,
          endDate: tenant.endDate,
          startDate: tenant.startDate,
          paymentEntries: [],
        });
      } else if (payment.paymentStatus === 'Partial') {
        const remaining = tenant.monthlyRent - (payment.amountPaid || 0);
        totalOverdueAmount += remaining;
        pendingList.push({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          roomNo: tenant.roomNo,
          monthlyRent: tenant.monthlyRent,
          amountPaid: payment.amountPaid || 0,
          remaining,
          status: 'Partial',
          hasLeft,
          endDate: tenant.endDate,
          startDate: tenant.startDate,
          paymentEntries: (payment.paymentEntries || []) as PaymentEntry[],
        });
      }

      if (payment && payment.paymentEntries && payment.paymentEntries.length > 0) {
        const allEntries = payment.paymentEntries as PaymentEntry[];
        
        const currentMonthEntries = allEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() + 1 === selectedMonth && entryDate.getFullYear() === selectedYear;
        });

        if (currentMonthEntries.length > 0) {
          currentMonthEntries.forEach(entry => {
            if (entry.mode === 'upi') {
              totalUpi += entry.amount;
            } else {
              totalCash += entry.amount;
            }
            total += entry.amount;
          });

          details.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            roomNo: tenant.roomNo,
            monthlyRent: tenant.monthlyRent,
            amountPaid: payment.amountPaid || 0,
            status: payment.paymentStatus as 'Paid' | 'Partial' | 'Pending',
            entries: allEntries,
            currentMonthEntries,
            remaining: tenant.monthlyRent - (payment.amountPaid || 0),
          });
        }
      }
    });

    details.sort((a, b) => {
      const aDate = new Date(a.currentMonthEntries[0]?.date || 0);
      const bDate = new Date(b.currentMonthEntries[0]?.date || 0);
      return aDate.getTime() - bDate.getTime();
    });

    return {
      collectedData: details,
      totalCollected: total,
      upiTotal: totalUpi,
      cashTotal: totalCash,
      totalOverdue: totalOverdueAmount,
      stillPendingTenants: pendingList.filter(t => t.remaining > 0),
    };
  }, [rooms, payments, prevMonth, prevYear, selectedMonth, selectedYear]);

  const toggleTenantExpanded = (tenantId: string) => {
    setExpandedTenants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  };
  
  // Handler for payment confirmation
  const handleConfirmPayment = (data: {
    tenantId: string;
    amount: number;
    date: string;
    mode: 'upi' | 'cash';
    month: number;
    year: number;
    monthlyRent: number;
    existingPaid: number;
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
    const existingEntries = (existingPayment?.paymentEntries || []) as PaymentEntry[];
    const existingNotes = existingPayment?.notes || '';

    const newEntry: PaymentEntry = {
      amount: data.amount,
      date: data.date,
      type: isFullPayment ? 'full' : 'partial',
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
  
  const handleOpenPaymentDialog = (tenant: StillPendingTenant) => {
    setSelectedPendingTenant(tenant);
    setPaymentDialogOpen(true);
  };
  
  const handleOpenReminder = (tenant: StillPendingTenant) => {
    setReminderData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      joiningDate: tenant.startDate,
      forMonth: `${months[prevMonth - 1]} ${prevYear}`,
      roomNo: tenant.roomNo,
      sharingType: '', // Not needed for reminder
      amount: tenant.monthlyRent,
      amountPaid: tenant.amountPaid > 0 ? tenant.amountPaid : undefined,
      balance: tenant.remaining,
      overrideMonth: prevMonth,
      overrideYear: prevYear,
      pgName: currentPG?.name,
      pgLogoUrl: currentPG?.logoUrl,
    });
    setReminderDialogOpen(true);
  };
  
  const handleOpenReceipt = (tenant: StillPendingTenant) => {
    if (tenant.paymentEntries.length === 0) return;
    const lastEntry = tenant.paymentEntries[tenant.paymentEntries.length - 1];
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: lastEntry?.mode || 'cash',
      paymentDate: lastEntry?.date ? format(new Date(lastEntry.date), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy'),
      joiningDate: tenant.startDate,
      forMonth: `${months[prevMonth - 1]} ${prevYear}`,
      roomNo: tenant.roomNo,
      sharingType: '',
      amount: tenant.monthlyRent,
      amountPaid: tenant.amountPaid,
      isFullPayment: false,
      remainingBalance: tenant.remaining,
      paymentEntries: tenant.paymentEntries,
      pgName: currentPG?.name,
      pgLogoUrl: currentPG?.logoUrl,
    });
    setReceiptDialogOpen(true);
  };

  if (totalCollected === 0 && totalOverdue === 0) {
    return null;
  }

  return (
    <>
      <Card 
        className="cursor-pointer transition-all hover:shadow-md border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10"
        onClick={() => setSheetOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-muted-foreground">{months[prevMonth - 1]} Overdue</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-paid">₹{totalCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Collected this month</p>
            </div>
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setPendingSheetOpen(true);
              }}
            >
              <div className="text-2xl font-bold text-amber-600">₹{totalOverdue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground underline decoration-dashed">Still pending →</p>
            </div>
          </div>
          
          {totalCollected > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <UpiLogo className="h-4 w-4" />
                <span className="text-sm font-medium">₹{upiTotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <CashLogo className="h-4 w-4" />
                <span className="text-sm font-medium">₹{cashTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground mt-2 text-center">Tap for details</p>
        </CardContent>
      </Card>

      {/* Collected Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "w-full sm:max-w-lg"}
        >
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base text-amber-600">
                {months[prevMonth - 1]} Overdue Collections
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setSheetOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Payments received in {months[selectedMonth - 1]} for {months[prevMonth - 1]} dues
            </p>
          </SheetHeader>

          <ScrollArea className={isMobile ? "h-[calc(100vh-120px)]" : "h-[calc(100vh-100px)] mt-4"}>
            <div className="space-y-4 pr-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-paid/10 rounded-lg">
                  <div className="text-xs text-muted-foreground">Total Collected</div>
                  <div className="text-lg font-bold text-paid">₹{totalCollected.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">{collectedData.length} tenant(s)</div>
                </div>
                <div 
                  className="p-3 bg-amber-500/10 rounded-lg cursor-pointer hover:bg-amber-500/20 transition-colors"
                  onClick={() => {
                    setSheetOpen(false);
                    setTimeout(() => setPendingSheetOpen(true), 100);
                  }}
                >
                  <div className="text-xs text-muted-foreground">Still Pending</div>
                  <div className="text-lg font-bold text-amber-600">₹{totalOverdue.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1 underline">View details →</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <UpiLogo className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">UPI</span>
                  </div>
                  <div className="text-lg font-bold">₹{upiTotal.toLocaleString()}</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CashLogo className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">Cash</span>
                  </div>
                  <div className="text-lg font-bold">₹{cashTotal.toLocaleString()}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Payment Details</h3>
                {collectedData.map(detail => (
                  <Collapsible 
                    key={detail.tenantId} 
                    open={expandedTenants.has(detail.tenantId)} 
                    onOpenChange={() => toggleTenantExpanded(detail.tenantId)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {expandedTenants.has(detail.tenantId) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{detail.tenantName}</span>
                              <span className="text-xs text-muted-foreground">Room {detail.roomNo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-paid">
                                ₹{detail.currentMonthEntries.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                              </span>
                              <Badge className={
                                detail.status === 'Paid' 
                                  ? 'bg-paid text-paid-foreground' 
                                  : 'bg-partial text-partial-foreground'
                              }>
                                {detail.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-2 border-t bg-muted/20">
                          <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                            <div>
                              <span className="text-muted-foreground">Monthly Rent:</span>
                              <div className="font-medium">₹{detail.monthlyRent.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total Paid:</span>
                              <div className="font-medium">₹{detail.amountPaid.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Remaining:</span>
                              <div className={`font-medium ${detail.remaining > 0 ? 'text-amber-600' : 'text-paid'}`}>
                                ₹{detail.remaining.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t space-y-1">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Paid in {months[selectedMonth - 1]}:
                            </div>
                            {detail.currentMonthEntries.map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {format(new Date(entry.date), 'dd MMM yyyy')}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded ${
                                    entry.mode === 'upi' 
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  }`}>
                                    {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                                  </span>
                                  <span className="font-medium">₹{entry.amount.toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}

                {collectedData.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No {months[prevMonth - 1]} dues collected in {months[selectedMonth - 1]} yet
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Still Pending Sheet */}
      <Sheet open={pendingSheetOpen} onOpenChange={setPendingSheetOpen}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "w-full sm:max-w-lg"}
        >
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base text-amber-600">
                Still Pending - {months[prevMonth - 1]}
              </SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setPendingSheetOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {stillPendingTenants.length} tenant(s) with pending {months[prevMonth - 1]} dues
            </p>
          </SheetHeader>

          <ScrollArea className={isMobile ? "h-[calc(100vh-120px)]" : "h-[calc(100vh-100px)] mt-4"}>
            <div className="space-y-3 pr-2">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <div className="text-xs text-muted-foreground">Total Pending</div>
                <div className="text-2xl font-bold text-amber-600">₹{totalOverdue.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">{stillPendingTenants.length} tenant(s)</div>
              </div>

              {stillPendingTenants.map(tenant => {
                const hasPhone = tenant.phone && tenant.phone !== '••••••••••';
                const hasPaymentEntries = tenant.paymentEntries.length > 0;
                
                return (
                  <div 
                    key={tenant.id} 
                    className={`p-4 rounded-xl border ${tenant.hasLeft ? 'bg-destructive/10 border-destructive/30' : 'bg-amber-500/10 border-amber-500/30'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{tenant.name}</span>
                        {tenant.hasLeft && (
                          <Badge variant="destructive" className="text-xs">LEFT</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {hasPhone && (
                          <>
                            <a 
                              href={`tel:${tenant.phone}`}
                              className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-popover">
                                <DropdownMenuItem onClick={() => handleOpenReminder(tenant)}>
                                  <Bell className="h-4 w-4 mr-2" />
                                  Payment Reminder
                                </DropdownMenuItem>
                                {hasPaymentEntries && (
                                  <DropdownMenuItem onClick={() => handleOpenReceipt(tenant)}>
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Generate Receipt
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`https://wa.me/91${tenant.phone.replace(/\D/g, '')}`}
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
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">Room {tenant.roomNo}</div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-muted-foreground">Rent:</span>
                        <div className="font-medium">₹{tenant.monthlyRent.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paid:</span>
                        <div className="font-medium text-paid">₹{tenant.amountPaid.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Balance:</span>
                        <div className="font-medium text-amber-600">₹{tenant.remaining.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge 
                        className={tenant.status === 'Partial' ? 'bg-partial text-partial-foreground' : 'bg-pending text-pending-foreground'}
                      >
                        {tenant.status}
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenPaymentDialog(tenant)}
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

              {stillPendingTenants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  All {months[prevMonth - 1]} dues have been collected! 🎉
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Payment Dialog for pending tenants */}
      <OverduePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        tenant={selectedPendingTenant ? {
          id: selectedPendingTenant.id,
          name: selectedPendingTenant.name,
          roomNo: selectedPendingTenant.roomNo,
          monthlyRent: selectedPendingTenant.monthlyRent,
          remaining: selectedPendingTenant.remaining,
          amountPaid: selectedPendingTenant.amountPaid,
          startDate: selectedPendingTenant.startDate,
          endDate: selectedPendingTenant.endDate,
          paymentEntries: selectedPendingTenant.paymentEntries,
        } : null}
        month={prevMonth}
        year={prevYear}
        onConfirmPayment={handleConfirmPayment}
      />
      
      {/* Receipt Dialog */}
      <WhatsAppReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receiptData={receiptData}
        onWhatsappSent={() => {}}
      />
      
      {/* Payment Reminder Dialog */}
      <PaymentReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />
    </>
  );
};
