import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { usePG } from '@/contexts/PGContext';
import {
  useElectricityReadings,
  useAllElectricityReadings,
  calcAcTenantShares,
  calculateAPCommercialBill,
} from '@/hooks/useElectricityReadings';
import { isTenantActiveInMonth, hasTenantLeftNow, tenantLeftInMonth } from '@/utils/dateOnly';
import { calculateProRataRent } from '@/utils/proRataRent';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, ArrowLeft, History, Receipt, Bell, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  
  let prevMonth = selectedMonth - 1;
  let prevYear = selectedYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = selectedYear - 1;
  }

  const { payments, upsertPayment } = useTenantPayments();
  const { rooms } = useRooms();
  const { currentPG } = usePG();
  const isMobile = useIsMobile();

  const { byRoom: acByRoom } = useElectricityReadings(prevMonth, prevYear);
  const { data: allReadings = [] } = useAllElectricityReadings();

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

  const getOverdueAcBills = (tenantId: string, room: Room) => {
    const overdue: { month: number; year: number; share: number; monthLabel: string }[] = [];
    const tenant = room.tenants.find((t) => t.id === tenantId);
    if (!tenant) return overdue;

    const joinDate = new Date(tenant.startDate);
    const checkMonths: { month: number; year: number }[] = [];
    
    let curM = prevMonth - 1;
    let curY = prevYear;
    if (curM === 0) {
      curM = 12;
      curY = prevYear - 1;
    }

    const currentDate = new Date();
    const limitDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1); // 12 months limit
    const startDateLimit = joinDate > limitDate ? joinDate : limitDate;

    while (true) {
      const checkDate = new Date(curY, curM - 1, 1);
      if (checkDate < startDateLimit) break;
      checkMonths.push({ month: curM, year: curY });
      curM--;
      if (curM === 0) {
        curM = 12;
        curY--;
      }
    }

    for (const { month: m, year: y } of checkMonths) {
      if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, y, m)) continue;

      const payment = payments.find((p) => p.tenantId === tenantId && p.month === m && p.year === y);
      const isPaid = payment?.acPaymentStatus === "Paid";

      if (!isPaid) {
        const reading = allReadings.find((r) => r.room_id === room.id && r.month === m && r.year === y);
        if (reading && reading.units > 0) {
          const activeTenants = room.tenants.filter((t) =>
            isTenantActiveInMonth(t.startDate, t.endDate, y, m)
          );
          const apBill = calculateAPCommercialBill(reading.units);
          const isCustom = localStorage.getItem(`ac_bill_mode_${room.id}`) === "custom";
          const totalAmount = isCustom ? reading.units * reading.unit_price : apBill.totalBill;

          const shares = calcAcTenantShares(
            reading.units,
            reading.unit_price,
            activeTenants,
            y,
            m,
            room.capacity,
            totalAmount
          );
          const myShare = shares.find((s) => s.name === tenant.name)?.share || 0;
          if (myShare > 0) {
            overdue.push({
              month: m,
              year: y,
              share: myShare,
              monthLabel: `${months[m - 1]} ${y}`,
            });
          }
        }
      }
    }

    return overdue;
  };

  const { overdueTenants, leftUnpaidTenants, totalOverdue, leftUnpaidTotal } = useMemo(() => {
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
    collectedBy?: string;
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
      mode: data.mode,
      collectedBy: data.collectedBy,
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



    // Auto-open Send Payment Receipt dialog after recording
    const tenant = selectedTenant;
    if (tenant) {
      const room = rooms.find(r => r.tenants.some(t => t.id === tenant.id));
      const sharingType = room ? `${room.capacity} Sharing` : '';
      setReceiptData({
        tenantName: tenant.name,
        tenantPhone: tenant.phone,
        paymentMode: data.mode,
        paymentDate: format(new Date(data.date), 'dd-MMM-yyyy'),
        joiningDate: tenant.startDate,
        forMonth: `${months[data.month - 1]} ${data.year}`,
        roomNo: tenant.roomNo,
        sharingType,
        amount: data.monthlyRent,
        amountPaid: data.amount,
        isFullPayment,
        remainingBalance: isFullPayment ? 0 : effectiveMonthlyRent - totalPaid,
        tenantId: tenant.id,
        paymentEntries: [...existingEntries, newEntry],
        pgName: currentPG?.name,
        pgLogoUrl: currentPG?.logoUrl,
      });
      setReceiptDialogOpen(true);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onOpenChange(false)}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <SheetTitle className="text-base text-destructive flex-1">
                Previous Month Overdue
              </SheetTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setHistoryOpen(true)} 
                className="h-8 w-8 shrink-0"
                title="Payment History"
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {months[prevMonth - 1]} {prevYear} • {overdueTenants.length} tenant(s) • ₹{totalOverdue.toLocaleString()}
              {leftUnpaidTotal > 0 && (
                <span className="text-destructive"> • Left Unpaid: ₹{leftUnpaidTotal.toLocaleString()}</span>
              )}
            </p>
          </SheetHeader>

          <div className="space-y-3 pb-8 mt-4">
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
                  setTimeout(() => {
                    setReceiptDialogOpen(true);
                  }, 100);
                };

                const handleOpenReminder = () => {
                  const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                  let acSurcharge: any = undefined;
                  let acBill: any = undefined;

                  if (room && room.isAc) {
                    const reading = acByRoom.get(room.id);
                    const units = reading?.units ?? 0;
                    const unitPrice = reading?.unit_price ?? currentPG?.electricityUnitPrice ?? 12;
                    const activeTenants = room.tenants.filter((roomTenant) =>
                      isTenantActiveInMonth(roomTenant.startDate, roomTenant.endDate, prevYear, prevMonth),
                    );
                    const apBill = calculateAPCommercialBill(units);
                    const totalAmount = apBill.totalBill;
                    const tenantShares = calcAcTenantShares(units, unitPrice, activeTenants, prevYear, prevMonth, room.capacity, totalAmount);
                    const tenantShare = tenantShares.find((shareItem) => shareItem.name === tenant.name);

                    const currentPayment = payments.find((p) => p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear);
                    const isCurrentPaid = currentPayment?.acPaymentStatus === "Paid";
                    const currentShare = isCurrentPaid ? 0 : (tenantShare?.share || 0);

                    const overdueAc = getOverdueAcBills(tenant.id, room);
                    const overdueAcTotal = overdueAc.reduce((sum, om) => sum + om.share, 0);

                    if (currentShare > 0 || overdueAcTotal > 0) {
                      acSurcharge = {
                        units,
                        unitPrice,
                        share: currentShare,
                        overdueMonths: overdueAc.map((om) => ({
                          monthLabel: om.monthLabel,
                          share: om.share,
                        })),
                      };
                      acBill = {
                        roomNo: room.roomNo,
                        units,
                        unitPrice,
                        totalAmount: totalAmount,
                        tenants: tenantShares.map((shareItem) => ({
                          name: `${shareItem.name} (${shareItem.daysStayed}d)`,
                          share: shareItem.share,
                        })),
                        monthLabel: `${months[prevMonth - 1]} ${prevYear}`,
                        pgName: currentPG?.name,
                        pgLogoUrl: currentPG?.logoUrl,
                      };
                    }
                  }

                  setReminderData({
                    tenantName: tenant.name,
                    tenantPhone: tenant.phone,
                    joiningDate: tenant.startDate,
                    roomNo: tenant.roomNo,
                    forMonth: `${months[prevMonth - 1]} ${prevYear}`,
                    sharingType: room ? `${room.capacity} Sharing` : '',
                    amount: tenant.monthlyRent,
                    amountPaid: tenant.amountPaid,
                    balance: tenant.remaining,
                    overrideMonth: prevMonth,
                    overrideYear: prevYear,
                    pgName: currentPG?.name,
                    pgLogoUrl: currentPG?.logoUrl,
                    acSurcharge,
                    acBill,
                  });
                  setTimeout(() => {
                    setReminderDialogOpen(true);
                  }, 100);
                };

                const bgClass = tenant.status === 'Partial'
                  ? 'bg-partial-muted border-l-4 border-partial'
                  : 'bg-advance-not-paid-muted border-l-4 border-advance-not-paid';
                const textClass = tenant.status === 'Partial'
                  ? 'text-partial font-bold'
                  : 'text-advance-not-paid font-bold';

                return (
                  <div 
                    key={tenant.id} 
                    className={cn("p-3 rounded-xl transition-all duration-200", bgClass)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{tenant.name}</span>
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
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                                >
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
                                <DropdownMenuItem
                                  onClick={() => {
                                    const phone = tenant.phone.replace(/\D/g, '');
                                    window.location.href = `https://wa.me/91${phone}`;
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Chat with Tenant
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                      <span className={cn("text-sm", textClass)}>
                        ₹{tenant.remaining.toLocaleString()}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground mb-2">Room {tenant.roomNo}</div>

                    <div className="flex justify-between items-end mt-2">
                      <div className="space-y-0.5">
                        <div className="text-xs text-muted-foreground">
                          Joined: {format(new Date(tenant.startDate), "dd MMM yyyy")}
                        </div>
                        {/* Display payment entries if partial */}
                        {tenant.status === 'Partial' && tenant.paymentEntries.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {tenant.paymentEntries.map((entry, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>
                                  Paid: ₹{entry.amount.toLocaleString()} on {format(new Date(entry.date), "dd MMM yyyy")}
                                </span>
                                {entry.mode && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === 'upi' ? 'bg-upi-muted text-upi' : 'bg-cash-muted text-cash'}`}>
                                    {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-3 bg-background hover:bg-muted text-foreground border-border"
                        onClick={() => handleMarkPaidClick(tenant)}
                        disabled={upsertPayment.isPending}
                      >
                        Mark Paid
                      </Button>
                    </div>
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
                      const bgClass = tenant.status === 'Partial'
                          ? 'bg-partial-muted border-l-4 border-partial'
                          : 'bg-destructive/10 border-l-4 border-destructive';
                        const textClass = tenant.status === 'Partial'
                          ? 'text-partial font-bold'
                          : 'text-destructive font-bold';

                        return (
                          <div 
                            key={tenant.id} 
                            className={cn("p-3 rounded-xl transition-all duration-200", bgClass)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{tenant.name}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive font-medium">LEFT</span>
                                {hasPhone && (
                                  <a 
                                    href={`tel:${tenant.phone}`}
                                    className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              <span className={cn("text-sm", textClass)}>
                                ₹{tenant.remaining.toLocaleString()}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground mb-2">
                              Room {tenant.roomNo}
                              {tenant.endDate && (
                                <span className="ml-2">• Left: {format(new Date(tenant.endDate), 'dd MMM yyyy')}</span>
                              )}
                            </div>

                            {tenant.proRataInfo && (
                              <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted/40 rounded max-w-max">
                                Pro-rata: {tenant.proRataInfo.daysStayed} days × ₹{tenant.proRataInfo.dailyRate}/day = ₹{tenant.proRataInfo.effectiveRent.toLocaleString()}
                              </div>
                            )}

                            <div className="flex justify-between items-end mt-2">
                              <div className="space-y-0.5">
                                <div className="text-xs text-muted-foreground">
                                  Joined: {format(new Date(tenant.startDate), "dd MMM yyyy")}
                                </div>
                                {/* Display payment entries if partial */}
                                {tenant.status === 'Partial' && tenant.paymentEntries.length > 0 && (
                                  <div className="mt-1 space-y-1">
                                    {tenant.paymentEntries.map((entry, idx) => (
                                      <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                        <span>
                                          Paid: ₹{entry.amount.toLocaleString()} on {format(new Date(entry.date), "dd MMM yyyy")}
                                        </span>
                                        {entry.mode && (
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === 'upi' ? 'bg-upi-muted text-upi' : 'bg-cash-muted text-cash'}`}>
                                            {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleMarkPaidClick(tenant)}
                                disabled={upsertPayment.isPending}
                                className="text-xs h-7 px-3"
                              >
                                Mark Paid
                              </Button>
                            </div>
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
