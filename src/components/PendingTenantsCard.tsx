import { useState, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, Plus, Phone, MessageCircle, Bell, ArrowLeft, CalendarClock, X as XIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations, TenantWithPayment } from '@/hooks/useRentCalculations';
import { PaymentReminderDialog } from '@/components/PaymentReminderDialog';
import { useElectricityReadings, calcAcTenantShares, calculateAPCommercialBill } from '@/hooks/useElectricityReadings';
import { usePG } from '@/contexts/PGContext';
import { isTenantActiveInMonth, parseDateOnly } from '@/utils/dateOnly';
import { format as fmtDate } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

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

export const PendingTenantsCard = forwardRef<PendingTenantsCardRef, PendingTenantsCardProps>(({ rooms, open, onClose, showSummaryCard = true, defaultTab = 'overdue' }, ref) => {
  const isMobile = useIsMobile();
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { byRoom: acByRoom } = useElectricityReadings(selectedMonth, selectedYear);
  const { currentPG } = usePG();
  const [localOpen, setLocalOpen] = useState(false);
  const isSheetOpen = open !== undefined ? open : localOpen;

  useImperativeHandle(ref, () => ({
    openSheet: () => setLocalOpen(true),
  }));
  const [activeTab, setActiveTab] = useState<'overdue' | 'not-yet-due'>('overdue');
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTenant, setReminderTenant] = useState<TenantWithPayment | null>(null);

  const handleOpenReminder = (tenant: TenantWithPayment) => {
    setReminderTenant(tenant);
    setReminderOpen(true);
  };

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

  // Combine overdue + advance-not-paid for "Overdue" tab (excluding left tenants), sorted by joining date
  const overdueCombined = useMemo(() => {
    return [...overdueTenants, ...advanceNotPaidTenants].filter(t => !t.isLocked && !isLeftTenant(t)).sort(sortByJoiningDate);
  }, [overdueTenants, advanceNotPaidTenants]);

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
        } as TenantWithPayment);
      } else if (payment.paymentStatus === 'Partial') {
        pendingList.push({
          ...tenant,
          paymentStatus: 'Partial',
          amountPaid: payment.amountPaid || 0,
          paymentEntries: payment.paymentEntries || [],
          monthlyRent: tenant.monthlyRent,
        } as TenantWithPayment);
      }
    });

    return pendingList.sort(sortByJoiningDate);
  }, [rooms, payments, prevMonth, prevYear]);

  // Not yet due (excluding locked and left), sorted by joining date
  const notYetDue = useMemo(() => {
    return notDueTenants.filter(t => !t.isLocked && !isLeftTenant(t)).sort(sortByJoiningDate);
  }, [notDueTenants]);

  const overdueTotal = overdueCombined.reduce((sum, t) => sum + t.monthlyRent, 0);
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
      .reduce((sum, t) => sum + (t.monthlyRent - (t.amountPaid || 0)), 0);
  }, [currentTenants, selectedTenants]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'overdue' | 'not-yet-due' | 'previous-month');
    setSelectedTenants(new Set()); // Clear selection when switching tabs
  };

  return (
    <>
      {showSummaryCard && (
        <Card 
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setSheetOpen(true)}
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

      <Sheet open={isSheetOpen} onOpenChange={(val) => { if (!val) { setLocalOpen(false); onClose?.(); } }}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden bg-background" : "w-full sm:max-w-xl p-0 bg-background"}
        >
          <div className="flex flex-col h-full bg-background">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => { setLocalOpen(false); onClose?.(); }}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <SheetTitle className="text-base text-foreground font-bold text-left">Select Pending Tenants</SheetTitle>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col h-full">
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

  <PaymentReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        reminderData={reminderTenant ? {
          tenantName: reminderTenant.name,
          tenantPhone: reminderTenant.phone || '',
          joiningDate: reminderTenant.startDate || '',
          forMonth: activeTab === 'previous-month' ? `${monthNames[prevMonth - 1]} ${prevYear}` : `${monthNames[selectedMonth - 1]} ${selectedYear}`,
          roomNo: reminderTenant.roomNo || '',
          sharingType: '',
          amount: reminderTenant.monthlyRent,
          amountPaid: reminderTenant.amountPaid || 0,
          balance: reminderTenant.monthlyRent - (reminderTenant.amountPaid || 0),
        } : null}
      />
    </>
  );
});

interface TenantSelectItemProps {
  tenant: TenantWithPayment;
  isSelected: boolean;
  onToggle: (id: string) => void;
  categoryColor: 'pending' | 'blue' | 'amber';
}

const TenantSelectItem = ({ tenant, isSelected, onToggle, categoryColor, onReminder }: TenantSelectItemProps & { onReminder?: (tenant: TenantWithPayment) => void }) => {
  const bgClass = categoryColor === 'pending' 
    ? 'bg-pending-muted border-pending/30' 
    : categoryColor === 'amber'
    ? 'bg-amber-500/10 border-amber-500/30'
    : 'bg-blue-500/10 border-blue-500/30';

  return (
    <div 
      className={`p-3 rounded-lg border ${bgClass} ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onToggle(tenant.id)}
    >
      <div className="flex items-center gap-3">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onToggle(tenant.id)}
          className="pointer-events-none"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{tenant.name}</span>
            {tenant.phone && tenant.phone !== '••••••••••' && (
              <>
                <a
                  href={`tel:${tenant.phone}`}
                  className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3 w-3" />
                </a>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
                      <MessageCircle className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setTimeout(() => {
                          onReminder?.(tenant); 
                        }, 100);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Bell className="h-4 w-4" />
                      Payment Reminder
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        const phone = tenant.phone.replace(/\D/g, '');
                        window.location.href = `https://wa.me/${phone}`;
                      }}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Chat with Tenant
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Room {tenant.roomNo}
            {tenant.startDate && (
              <span className="ml-2 text-xs">
                Joined: {new Date(tenant.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
              </span>
            )}
            {tenant.amountPaid > 0 && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                Paid: ₹{tenant.amountPaid.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <Badge className={
          categoryColor === 'pending' 
            ? 'bg-pending text-pending-foreground font-bold' 
            : categoryColor === 'amber'
            ? 'bg-amber-500 text-white font-bold'
            : 'bg-blue-500 text-white font-bold'
        }>
          ₹{(tenant.monthlyRent - (tenant.amountPaid || 0)).toLocaleString()}
        </Badge>
      </div>
    </div>
  );
};
