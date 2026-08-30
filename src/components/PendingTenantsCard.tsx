import { useState, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, Plus, Phone, MessageCircle, MessageSquare, Bell, ArrowLeft, CalendarClock, Wallet, Receipt, PartyPopper, BookOpen, X as XIcon } from 'lucide-react';

import { PaymentEntry, Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations, TenantWithPayment } from '@/hooks/useRentCalculations';
import { PaymentReminderDialog } from '@/components/PaymentReminderDialog';
import { useElectricityReadings, calcAcTenantShares, calculateAPCommercialBill } from '@/hooks/useElectricityReadings';
import { usePG } from '@/contexts/PGContext';
import { isTenantActiveInMonth, parseDateOnly } from '@/utils/dateOnly';
import { format as fmtDate } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { OverduePaymentDialog } from '@/components/OverduePaymentDialog';
import { WhatsAppReceiptDialog } from '@/components/WhatsAppReceiptDialog';
import { WelcomeDialog } from '@/components/WelcomeDialog';
import { RulesShareDialog } from '@/components/RulesShareDialog';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useOnboardingProfileMap } from '@/features/tenant-onboarding';
import { TenantChatMenu } from '@/components/TenantChatMenu';
import whatsappRemindersBanner from '@/assets/whatsapp-reminders-banner.png';

interface PendingTenantsCardProps {
  showSummaryCard?: boolean;
  rooms: Room[];
  open?: boolean;
  onClose?: () => void;
  defaultTab?: 'overdue' | 'not-yet-due' | 'previous-month';
}

export interface PendingTenantsCardRef {
  openSheet: () => void;
}

interface PaymentReceiptDialogData {
  tenantName: string;
  tenantPhone: string;
  paymentMode: 'upi' | 'cash';
  paymentDate: string;
  joiningDate: string;
  forMonth: string;
  roomNo: string;
  sharingType: string;
  amount: number;
  amountPaid: number;
  isFullPayment: boolean;
  remainingBalance: number;
  paymentEntries: PaymentEntry[];
  pgName?: string;
  pgLogoUrl?: string;
}

export const PendingTenantsCard = forwardRef<PendingTenantsCardRef, PendingTenantsCardProps>(({ rooms, open, onClose, showSummaryCard = true, defaultTab = 'overdue' }, ref) => {
  const isMobile = useIsMobile();
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, upsertPayment } = useTenantPayments();
  const { byRoom: acByRoom } = useElectricityReadings(selectedMonth, selectedYear);
  const { currentPG } = usePG();
  const onboardingProfileMap = useOnboardingProfileMap();
  const [localOpen, setLocalOpen] = useState(false);
  const isSheetOpen = open !== undefined ? open : localOpen;

  useImperativeHandle(ref, () => ({
    openSheet: () => setLocalOpen(true),
  }));
  const [activeTab, setActiveTab] = useState<'overdue' | 'not-yet-due' | 'previous-month'>('overdue');
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTenant, setReminderTenant] = useState<TenantWithPayment | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{
    tenantName: string;
    tenantPhone: string;
    joiningDate: string;
    roomNo: string;
    sharingType: string;
    monthlyRent: number;
  } | null>(null);
  const [rulesShareData, setRulesShareData] = useState<{ tenantName: string; tenantPhone: string } | null>(null);
  const [receiptData, setReceiptData] = useState<PaymentReceiptDialogData | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{
    tenant: TenantWithPayment;
    month: number;
    year: number;
    monthlyRent: number;
    amountPaid: number;
    remaining: number;
    paymentEntries: PaymentEntry[];
  } | null>(null);

  const handleOpenReminder = (tenant: TenantWithPayment) => {
    setReminderTenant(tenant);
    setReminderOpen(true);
  };

  useBackGesture(isSheetOpen, () => {
    if (reminderOpen) setReminderOpen(false);
    else if (paymentDialogOpen) setPaymentDialogOpen(false);
    else if (receiptDialogOpen) setReceiptDialogOpen(false);
    else if (welcomeDialogOpen) setWelcomeDialogOpen(false);
    else if (rulesDialogOpen) setRulesDialogOpen(false);
    else {
      setLocalOpen(false);
      onClose?.();
    }
  });

  useEffect(() => {
    if (isSheetOpen) {
      setActiveTab(defaultTab);
    }
  }, [isSheetOpen, defaultTab]);

  const getAcSurchargeFor = (tenant: TenantWithPayment) => {
    const room = rooms.find((r) => r.roomNo === tenant.roomNo);
    if (!room || !room.isAc) return undefined;
    const reading = acByRoom.get(room.id);
    const units = reading?.units ?? 0;
    const unitPrice = reading?.unit_price ?? currentPG?.electricityUnitPrice ?? 12;
    const isCustom = localStorage.getItem(`ac_bill_mode_${room.id}`) === "custom";
    const apBill = calculateAPCommercialBill(units);
    const totalAmount = isCustom ? units * unitPrice : apBill.totalBill;
    const active = room.tenants.filter((t) =>
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth),
    );
    const tenantShare = calcAcTenantShares(units, unitPrice, active, selectedYear, selectedMonth, room.capacity, totalAmount)
      .find((share) => share.name === tenant.name);
    return tenantShare && tenantShare.share > 0 ? { units, unitPrice, share: tenantShare.share } : undefined;
  };

  const getAcBillFor = (tenant: TenantWithPayment) => {
    const room = rooms.find((r) => r.roomNo === tenant.roomNo);
    if (!room || !room.isAc) return undefined;

    const reading = acByRoom.get(room.id);
    const units = reading?.units ?? 0;
    const unitPrice = reading?.unit_price ?? currentPG?.electricityUnitPrice ?? 12;
    const isCustom = localStorage.getItem(`ac_bill_mode_${room.id}`) === "custom";
    const apBill = calculateAPCommercialBill(units);
    const totalAmount = isCustom ? units * unitPrice : apBill.totalBill;
    const active = room.tenants.filter((t) =>
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth),
    );
    const tenantShares = calcAcTenantShares(units, unitPrice, active, selectedYear, selectedMonth, room.capacity, totalAmount);
    const tenantShare = tenantShares.find((share) => share.name === tenant.name);

    if (!tenantShare || tenantShare.share <= 0) return undefined;

    return {
      roomNo: room.roomNo,
      units,
      unitPrice,
      totalAmount: totalAmount,
      tenants: tenantShares.map((share) => ({ name: `${share.name} (${share.daysStayed}d)`, share: share.share })),
      monthLabel: `${monthNames[selectedMonth - 1]} ${selectedYear}`,
      pgName: currentPG?.name,
      pgLogoUrl: currentPG?.logoUrl,
      calcMode: isCustom ? ("custom" as const) : ("commercial" as const),
    };
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const { overdueTenants, advanceNotPaidTenants, notDueTenants, partialTenants } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  // Helper to check if tenant has left
  const isLeftTenant = (tenant: { endDate?: string }) => {
    if (!tenant.endDate) return false;
    const endDate = new Date(tenant.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return endDate <= today;
  };

  // Sort by day-of-month from startDate (due date order for reminders)
  const sortByJoiningDate = (a: TenantWithPayment, b: TenantWithPayment) => {
    const dayA = a.startDate ? new Date(a.startDate).getDate() : 0;
    const dayB = b.startDate ? new Date(b.startDate).getDate() : 0;
    return dayA - dayB;
  };

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

  // Combine every tenant who still owes money for the selected month.
  const overdueCombined = useMemo(() => {
    return [...overdueTenants, ...advanceNotPaidTenants, ...partialTenants]
      .filter(t => !t.isLocked && !isLeftTenant(t))
      .sort(sortByJoiningDate);
  }, [overdueTenants, advanceNotPaidTenants, partialTenants]);

  // Previous month pending tenants
  const stillPendingTenants = useMemo(() => {
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));

    const tenantsActiveInPrevMonth = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth) && 
      !tenant.isLocked &&
      !isLeftTenant(tenant)
    );

    const prevMonthPayments = payments.filter(p => 
      p.month === prevMonth && p.year === prevYear
    );

    const pendingList: TenantWithPayment[] = [];

    tenantsActiveInPrevMonth.forEach(tenant => {
      const payment = prevMonthPayments.find(p => p.tenantId === tenant.id);
      const hasLeft = isLeftTenant(tenant);

      if (!payment || payment.paymentStatus === 'Pending') {
        pendingList.push({
          ...tenant,
          paymentStatus: 'Pending',
          amountPaid: 0,
          paymentEntries: [],
          monthlyRent: tenant.monthlyRent,
          paymentCategory: 'overdue',
        } as unknown as TenantWithPayment);
      } else if (payment.paymentStatus === 'Partial') {
        pendingList.push({
          ...tenant,
          paymentStatus: 'Partial',
          amountPaid: payment.amountPaid || 0,
          paymentEntries: payment.paymentEntries || [],
          monthlyRent: tenant.monthlyRent,
          paymentCategory: 'partial',
        } as unknown as TenantWithPayment);
      }
    });

    return pendingList.sort(sortByJoiningDate);
  }, [rooms, payments, prevMonth, prevYear]);

  // Not yet due (excluding locked and left), sorted by joining date
  const notYetDue = useMemo(() => {
    return notDueTenants.filter(t => !t.isLocked && !isLeftTenant(t)).sort(sortByJoiningDate);
  }, [notDueTenants]);

  const overdueTotal = overdueCombined.reduce((sum, t) => sum + Math.max(0, (t.effectiveRent || t.monthlyRent) - (t.amountPaid || 0)), 0);
  const stillPendingTotal = stillPendingTenants.reduce((sum, t) => sum + (t.monthlyRent - (t.amountPaid || 0)), 0);
  const notYetDueTotal = notYetDue.reduce((sum, t) => sum + t.monthlyRent, 0);

  const currentTenants = useMemo(() => {
    if (activeTab === 'overdue') return overdueCombined;
    if (activeTab === 'previous-month') return stillPendingTenants;
    return notYetDue;
  }, [activeTab, overdueCombined, stillPendingTenants, notYetDue]);

  const handleToggleTenant = (tenantId: string) => {
    const newSet = new Set(selectedTenants);
    if (newSet.has(tenantId)) {
      newSet.delete(tenantId);
    } else {
      newSet.add(tenantId);
    }
    setSelectedTenants(newSet);
  };

  const selectedTotal = useMemo(() => {
    return currentTenants
      .filter(t => selectedTenants.has(t.id))
      .reduce((sum, t) => sum + Math.max(0, (t.effectiveRent || t.monthlyRent) - (t.amountPaid || 0)), 0);
  }, [currentTenants, selectedTenants]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'overdue' | 'not-yet-due' | 'previous-month');
    setSelectedTenants(new Set()); // Clear selection when switching tabs
  };

  const handleMarkPaid = (tenant: TenantWithPayment) => {
    const month = activeTab === 'previous-month' ? prevMonth : selectedMonth;
    const year = activeTab === 'previous-month' ? prevYear : selectedYear;
    const existingPayment = payments.find(
      (payment) => payment.tenantId === tenant.id && payment.month === month && payment.year === year,
    );
    const amountPaid = existingPayment?.amountPaid || tenant.amountPaid || 0;
    const monthlyRent = existingPayment?.amount || tenant.monthlyRent;

    setPaymentTarget({
      tenant,
      month,
      year,
      monthlyRent,
      amountPaid,
      remaining: Math.max(0, monthlyRent - amountPaid),
      paymentEntries: existingPayment?.paymentEntries || [],
    });
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async (data: {
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
    collectedBy?: string;
  }) => {
    if (!paymentTarget) return;

    const discount = data.discount || 0;
    const effectiveRent = Math.max(0, data.monthlyRent - discount);
    const totalPaid = data.existingPaid + data.amount;
    const isFullPayment = totalPaid >= effectiveRent;
    const existingPayment = payments.find(
      (payment) => payment.tenantId === data.tenantId && payment.month === data.month && payment.year === data.year,
    );
    const existingEntries = existingPayment?.paymentEntries || [];
    const newEntry: PaymentEntry = {
      amount: data.amount,
      date: data.date,
      type: isFullPayment ? 'full' : 'partial',
      mode: data.mode,
      collectedBy: data.collectedBy,
    };
    const notes = [existingPayment?.notes, data.notes].filter(Boolean).join(' | ') || undefined;

    await upsertPayment.mutateAsync({
      tenantId: data.tenantId,
      month: data.month,
      year: data.year,
      paymentStatus: isFullPayment ? 'Paid' : 'Partial',
      paymentDate: data.date,
      amount: data.monthlyRent,
      amountPaid: isFullPayment ? effectiveRent : totalPaid,
      paymentEntries: [...existingEntries, newEntry],
      notes,
      tenantName: paymentTarget.tenant.name,
      roomNo: paymentTarget.tenant.roomNo,
    });

    const room = rooms.find((item) => item.roomNo === paymentTarget.tenant.roomNo);
    setReceiptData({
      tenantName: paymentTarget.tenant.name,
      tenantPhone: paymentTarget.tenant.phone || '',
      paymentMode: data.mode,
      paymentDate: fmtDate(parseDateOnly(data.date), 'dd-MMM-yyyy'),
      joiningDate: paymentTarget.tenant.startDate,
      forMonth: `${monthNames[data.month - 1]} ${data.year}`,
      roomNo: paymentTarget.tenant.roomNo,
      sharingType: room ? `${room.capacity} Sharing` : '',
      amount: data.monthlyRent,
      amountPaid: data.amount,
      isFullPayment,
      remainingBalance: isFullPayment ? 0 : Math.max(0, effectiveRent - totalPaid),
      paymentEntries: [...existingEntries, newEntry],
      pgName: currentPG?.name,
      pgLogoUrl: currentPG?.logoUrl,
    });
    setReceiptDialogOpen(true);
  };

  return (
    <>
      {showSummaryCard && (
        <Card 
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setLocalOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium">Pending Tenants</CardTitle>
          <AlertTriangle className="h-4 w-4 text-pending" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded-lg bg-pending-muted">
              <div className="text-xs text-muted-foreground">Overdue</div>
              <div className="font-bold text-pending">{overdueCombined.length}</div>
              <div className="text-xs text-muted-foreground">₹{overdueTotal.toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <div className="text-xs text-muted-foreground">Not Yet Due</div>
              <div className="font-bold text-blue-600 dark:text-blue-400">{notYetDue.length}</div>
              <div className="text-xs text-muted-foreground">₹{notYetDueTotal.toLocaleString()}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Tap to select tenants</p>
        </CardContent>
      </Card>
      )}

      <Sheet
        open={isSheetOpen}
        onOpenChange={(val) => {
          if (!val) {
            if (reminderOpen || paymentDialogOpen || receiptDialogOpen || welcomeDialogOpen || rulesDialogOpen) {
              return;
            }
            setLocalOpen(false);
            onClose?.();
          }
        }}
      >
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden bg-background" : "w-full sm:max-w-xl p-0 bg-background"}
        >
          <div className="flex flex-col h-full bg-background">
            <SheetHeader className="mx-auto w-full max-w-screen-2xl px-2 pb-2 pt-4 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
          if (reminderOpen) {
            setReminderOpen(false);
          } else if (paymentDialogOpen) {
            setPaymentDialogOpen(false);
          } else if (receiptDialogOpen) {
            setReceiptDialogOpen(false);
          } else if (welcomeDialogOpen) {
            setWelcomeDialogOpen(false);
          } else if (rulesDialogOpen) {
            setRulesDialogOpen(false);
          } else {
            setLocalOpen(false);
            onClose?.();
          }
        }}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <SheetTitle className="text-base text-foreground font-bold text-left">Select Pending Tenants</SheetTitle>
              </div>
            </SheetHeader>

            <div className="mx-auto flex w-full max-w-screen-2xl flex-1 overflow-y-auto px-2 py-2 bg-background space-y-3">
              {/* WhatsApp Reminders Hero Banner */}
              <div className="w-full overflow-hidden rounded-2xl shadow-sm border border-border/50 shrink-0">
                <img
                  src={whatsappRemindersBanner}
                  alt="WhatsApp Reminders - Send smart follow-ups"
                  className="w-full h-auto object-cover rounded-2xl block"
                  loading="eager"
                />
              </div>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col flex-1">
                <TabsList className="grid w-full grid-cols-3 shrink-0">
                  <TabsTrigger value="overdue" className="gap-1 text-[11px] px-1 truncate">
                    <AlertTriangle className="h-3.5 w-3.5 text-pending shrink-0" />
                    Overdue ({overdueCombined.length})
                  </TabsTrigger>
                  <TabsTrigger value="previous-month" className="gap-1 text-[11px] px-1 truncate">
                    <CalendarClock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    Prev Month ({stillPendingTenants.length})
                  </TabsTrigger>
                  <TabsTrigger value="not-yet-due" className="gap-1 text-[11px] px-1 truncate">
                    <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    Upcoming ({notYetDue.length})
                  </TabsTrigger>
                </TabsList>

                {/* Select All Toggle */}
                {currentTenants.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 shrink-0">
                    <Checkbox
                      checked={currentTenants.length > 0 && currentTenants.every(t => selectedTenants.has(t.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTenants(new Set(currentTenants.map(t => t.id)));
                        } else {
                          setSelectedTenants(new Set());
                        }
                      }}
                    />
                    <span className="text-sm font-medium">Select All ({currentTenants.length})</span>
                  </div>
                )}

                {/* Selected Summary */}
                {selectedTenants.size > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30 shrink-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{selectedTenants.size} tenant(s) selected</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">₹{selectedTotal.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Total amount</div>
                      </div>
                    </div>
                  </div>
                )}

                <ScrollArea className="flex-1 mt-4">
                  <TabsContent value="overdue" className="mt-0 pb-12 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="space-y-2">
                      {overdueCombined.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No overdue tenants</p>
                      ) : (
                        overdueCombined.map(tenant => (
                          <TenantSelectItem 
                            key={tenant.id}
                            tenant={tenant}
                            isSelected={selectedTenants.has(tenant.id)}
                            onToggle={handleToggleTenant}
                            categoryColor="pending"
                            onReminder={handleOpenReminder}
                            rooms={rooms}
                            onWelcome={(tenant) => {
                              const room = rooms.find((item) => item.roomNo === tenant.roomNo);
                              setWelcomeData({ tenantName: tenant.name, tenantPhone: tenant.phone || '', joiningDate: tenant.startDate || '', roomNo: tenant.roomNo, sharingType: room ? `${room.capacity} Sharing` : '', monthlyRent: tenant.monthlyRent });
                              setWelcomeDialogOpen(true);
                            }}
                            onRules={(tenant) => { setRulesShareData({ tenantName: tenant.name, tenantPhone: tenant.phone || '' }); setRulesDialogOpen(true); }}
                            onMarkPaid={handleMarkPaid}
                            isMarkingPaid={upsertPayment.isPending}
                          />
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="previous-month" className="mt-0 pb-12 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="space-y-2">
                      {stillPendingTenants.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No previous month pending dues</p>
                      ) : (
                        stillPendingTenants.map(tenant => (
                          <TenantSelectItem 
                            key={tenant.id}
                            tenant={tenant}
                            isSelected={selectedTenants.has(tenant.id)}
                            onToggle={handleToggleTenant}
                            categoryColor="amber"
                            onReminder={handleOpenReminder}
                            rooms={rooms}
                            onWelcome={(tenant) => {
                              const room = rooms.find((item) => item.roomNo === tenant.roomNo);
                              setWelcomeData({ tenantName: tenant.name, tenantPhone: tenant.phone || '', joiningDate: tenant.startDate || '', roomNo: tenant.roomNo, sharingType: room ? `${room.capacity} Sharing` : '', monthlyRent: tenant.monthlyRent });
                              setWelcomeDialogOpen(true);
                            }}
                            onRules={(tenant) => { setRulesShareData({ tenantName: tenant.name, tenantPhone: tenant.phone || '' }); setRulesDialogOpen(true); }}
                            onMarkPaid={handleMarkPaid}
                            isMarkingPaid={upsertPayment.isPending}
                          />
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="not-yet-due" className="mt-0 pb-12 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="space-y-2">
                      {notYetDue.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No upcoming dues</p>
                      ) : (
                        notYetDue.map(tenant => (
                          <TenantSelectItem 
                            key={tenant.id}
                            tenant={tenant}
                            isSelected={selectedTenants.has(tenant.id)}
                            onToggle={handleToggleTenant}
                            categoryColor="blue"
                            onReminder={handleOpenReminder}
                            rooms={rooms}
                            onWelcome={(tenant) => {
                              const room = rooms.find((item) => item.roomNo === tenant.roomNo);
                              setWelcomeData({ tenantName: tenant.name, tenantPhone: tenant.phone || '', joiningDate: tenant.startDate || '', roomNo: tenant.roomNo, sharingType: room ? `${room.capacity} Sharing` : '', monthlyRent: tenant.monthlyRent });
                              setWelcomeDialogOpen(true);
                            }}
                            onRules={(tenant) => { setRulesShareData({ tenantName: tenant.name, tenantPhone: tenant.phone || '' }); setRulesDialogOpen(true); }}
                            onMarkPaid={handleMarkPaid}
                            isMarkingPaid={upsertPayment.isPending}
                          />
                        ))
                      )}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>

  {(() => {
    const reminderRoom = reminderTenant ? rooms.find(r => r.roomNo === reminderTenant.roomNo) : null;
    const reminderSharingType = reminderRoom ? `${reminderRoom.capacity} Sharing` : 'N/A';
    return (
      <PaymentReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        reminderData={reminderTenant ? {
          tenantName: reminderTenant.name,
          tenantPhone: reminderTenant.phone || '',
          joiningDate: reminderTenant.startDate || '',
          forMonth: activeTab === 'previous-month' ? `${monthNames[prevMonth - 1]} ${prevYear}` : `${monthNames[selectedMonth - 1]} ${selectedYear}`,
          roomNo: reminderTenant.roomNo || '',
          sharingType: reminderSharingType,
          amount: reminderTenant.monthlyRent,
          amountPaid: reminderTenant.amountPaid || 0,
          balance: reminderTenant.monthlyRent - (reminderTenant.amountPaid || 0),
        } : null}
      />
    );
  })()}
      <OverduePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        tenant={paymentTarget ? {
          id: paymentTarget.tenant.id,
          name: paymentTarget.tenant.name,
          roomNo: paymentTarget.tenant.roomNo,
          monthlyRent: paymentTarget.monthlyRent,
          remaining: paymentTarget.remaining,
          amountPaid: paymentTarget.amountPaid,
          startDate: paymentTarget.tenant.startDate,
          endDate: paymentTarget.tenant.endDate,
          paymentEntries: paymentTarget.paymentEntries,
        } : null}
        month={paymentTarget?.month || selectedMonth}
        year={paymentTarget?.year || selectedYear}
        previousMonthPending={null}
        onConfirmPayment={handleConfirmPayment}
      />
      <WhatsAppReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receiptData={receiptData}
        onWhatsappSent={() => {}}
      />
      <WelcomeDialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen} welcomeData={welcomeData} />
      <RulesShareDialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen} shareData={rulesShareData} />
    </>
  );
});

interface TenantSelectItemProps {
  tenant: TenantWithPayment;
  isSelected: boolean;
  onToggle: (id: string) => void;
  categoryColor: 'pending' | 'blue' | 'amber';
  onMarkPaid?: (tenant: TenantWithPayment) => void;
  isMarkingPaid?: boolean;
  rooms: Room[];
  onWelcome: (tenant: TenantWithPayment) => void;
  onRules: (tenant: TenantWithPayment) => void;
}

const TenantSelectItem = ({ tenant, isSelected, onToggle, categoryColor, onReminder, onMarkPaid, isMarkingPaid = false, rooms, onWelcome, onRules }: TenantSelectItemProps & { onReminder?: (tenant: TenantWithPayment) => void }) => {
  const onboardingProfileMap = useOnboardingProfileMap();
  const isPartiallyPaid = (tenant.amountPaid || 0) > 0;
  const dueAmount = Math.max(0, tenant.monthlyRent - (tenant.amountPaid || 0));

  const formattedJoinedDate = tenant.startDate
    ? fmtDate(parseDateOnly(tenant.startDate), 'dd MMM yyyy')
    : '';

  // Red for pending/overdue (0 paid), Orange for partial payment, Blue for not-yet-due
  const cardColorStyle = isPartiallyPaid || categoryColor === 'amber'
    ? 'bg-[#FFF9EE] border-amber-200 border-l-amber-500 dark:bg-[#251C14] dark:border-amber-900/50'
    : categoryColor === 'blue'
    ? 'bg-[#F0F7FF] border-blue-200 border-l-blue-500 dark:bg-[#142032] dark:border-blue-900/50'
    : 'bg-[#FFF5F5] border-red-200 border-l-red-500 dark:bg-[#2B1717] dark:border-red-900/50';

  return (
    <div 
      className={`rounded-2xl border border-l-[5px] p-4 shadow-sm transition-all ${cardColorStyle} ${isSelected ? 'ring-2 ring-primary/50' : ''}`}
      onClick={() => onToggle(tenant.id)}
    >
      <div className="flex items-stretch justify-between gap-3">
        {/* Left Div */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Top row: Name • Room No */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-base font-bold text-foreground">{tenant.name}</span>
              <span className="text-slate-400 font-medium text-sm">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium text-sm shrink-0">R{tenant.roomNo}</span>
              {isSelected && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">Selected</span>
              )}
            </div>

            {/* Second row: Joined Date */}
            <div className="mt-1">
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                Joined: {formattedJoinedDate}
              </span>
            </div>

            {/* Third section: Payments breakdown (if partial payment) */}
            {isPartiallyPaid && (
              <div className="mt-2 space-y-1">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  Payment:
                </div>
                {tenant.paymentEntries && tenant.paymentEntries.length > 0 ? (
                  tenant.paymentEntries.map((entry, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span>₹{entry.amount.toLocaleString()}{entry.date ? ` on ${fmtDate(parseDateOnly(entry.date), 'dd MMM yyyy')}` : ''}</span>
                      <span className={entry.mode === 'upi' ? 'tag-upi' : 'tag-cash'}>
                        {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span>₹{tenant.amountPaid.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Red price badge on bottom of Left Div */}
          <div className="mt-3 pt-1">
            <span className="price-badge-red shrink-0">
              ₹{dueAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right Div */}
        <div className="flex flex-col justify-between items-end shrink-0 ml-auto text-right">
          {/* Top: Action icons (WhatsApp & Phone) */}
          {tenant.phone && tenant.phone !== '••••••••••' ? (
            <div className="flex w-[84px] items-center justify-between my-2">
              <TenantChatMenu
                tenantId={tenant.id}
                tenantName={tenant.name}
                phone={tenant.phone}
                profileComplete={["profile_completed", "pending_verification", "form_submitted", "verified"].includes(onboardingProfileMap.get(tenant.id)?.status || "")}
                message={`Hi ${tenant.name}, your rent payment of ₹${dueAmount.toLocaleString()} for Room ${tenant.roomNo} is pending. Please pay at your earliest convenience. Thank you!`}
                onReminder={onReminder ? () => onReminder(tenant) : undefined}
              />
              <a
                href={`tel:${tenant.phone}`}
                className="grid h-9 w-9 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                onClick={(e) => e.stopPropagation()}
                title={`Call ${tenant.name}`}
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="w-[84px] my-2" />
          )}

          {/* Bottom: Pay button */}
          <div className="w-[84px]">
            <button
              type="button"
              className="btn-pay-black w-full px-0 text-center shrink-0"
              onClick={(event) => {
                event.stopPropagation();
                onMarkPaid?.(tenant);
              }}
              disabled={isMarkingPaid}
            >
              Pay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
