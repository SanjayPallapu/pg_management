import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  CreditCard,
  FileText,
  Users,
  ChevronUp,
  ChevronDown,
  UserPlus,
  UserCheck,
  MessageCircle,
  Phone,
  Receipt,
  MessageSquare,
  Bell,
  Sparkles,
  Wallet,
  PartyPopper,
  Settings,
  Snowflake,
  Zap,
  Key,
  CalendarClock,
  X as XIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Room } from "@/types";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useRent } from "@/contexts/RentContext";
import { useMonthContext } from "@/contexts/MonthContext";
import { useAuth } from "@/hooks/useAuth";
import { usePG } from "@/contexts/PGContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { DayGuest } from "@/hooks/useDayGuests";
import { WhatsAppReceiptDialog } from "./WhatsAppReceiptDialog";
import { PaymentReminderDialog } from "./PaymentReminderDialog";
import { WelcomeDialog } from "./WelcomeDialog";
import { format, differenceInDays } from "date-fns";
import { useElectricityReadings, calcAcTenantShares, calculateAPCommercialBill } from "@/hooks/useElectricityReadings";
import {
  isTenantActiveInMonth,
  isTenantActiveNow,
  tenantJoinedInMonth,
  tenantLeftInMonth,
  parseDateOnly,
} from "@/utils/dateOnly";

// Helper to check if tenant joined within last 5 days
const isNewTenant = (startDate: string): boolean => {
  const joinDate = parseDateOnly(startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceJoining = differenceInDays(today, joinDate);
  return daysSinceJoining >= 0 && daysSinceJoining <= 5;
};
interface RoomCardProps {
  room: Room;
  onViewDetails: (room: Room) => void;
  onEditRoom?: (room: Room) => void;
  dayGuests?: DayGuest[];
}

interface ACRoomPricingEditorProps {
  roomId: string;
  reading: any;
  setReading: any;
}

const ACRoomPricingEditor = ({ roomId, reading, setReading }: ACRoomPricingEditorProps) => {
  const [startReadingDraft, setStartReadingDraft] = useState(
    reading?.start_reading !== null && reading?.start_reading !== undefined ? String(reading.start_reading) : ""
  );
  const [endReadingDraft, setEndReadingDraft] = useState(
    reading?.end_reading !== null && reading?.end_reading !== undefined ? String(reading.end_reading) : ""
  );
  const [unitsDraft, setUnitsDraft] = useState(String(reading?.units ?? 0));
  const [priceDraft, setPriceDraft] = useState(String(reading?.unit_price ?? 12));

  useEffect(() => {
    setStartReadingDraft(
      reading?.start_reading !== null && reading?.start_reading !== undefined ? String(reading.start_reading) : ""
    );
  }, [reading?.start_reading]);

  useEffect(() => {
    setEndReadingDraft(
      reading?.end_reading !== null && reading?.end_reading !== undefined ? String(reading.end_reading) : ""
    );
  }, [reading?.end_reading]);

  useEffect(() => {
    setUnitsDraft(String(reading?.units ?? 0));
  }, [reading?.units]);

  useEffect(() => {
    setPriceDraft(String(reading?.unit_price ?? 12));
  }, [reading?.unit_price]);

  const triggerSave = (u: number, p: number, s: number | null, e: number | null) => {
    setReading.mutate({
      roomId,
      units: u,
      unitPrice: p,
      startReading: s,
      endReading: e,
      splitType: reading?.split_type || "active_tenants",
      splitCount: reading?.split_count || null
    });
  };

  const handleStartBlur = () => {
    const s = startReadingDraft === "" ? null : parseInt(startReadingDraft);
    const e = endReadingDraft === "" ? null : parseInt(endReadingDraft);
    let u = parseInt(unitsDraft) || 0;
    if (s !== null && e !== null) {
      u = Math.max(0, e - s);
      setUnitsDraft(String(u));
    }
    triggerSave(u, parseInt(priceDraft) || 12, s, e);
  };

  const handleEndBlur = () => {
    const s = startReadingDraft === "" ? null : parseInt(startReadingDraft);
    const e = endReadingDraft === "" ? null : parseInt(endReadingDraft);
    let u = parseInt(unitsDraft) || 0;
    if (s !== null && e !== null) {
      u = Math.max(0, e - s);
      setUnitsDraft(String(u));
    }
    triggerSave(u, parseInt(priceDraft) || 12, s, e);
  };

  const handleUnitsBlur = () => {
    const s = startReadingDraft === "" ? null : parseInt(startReadingDraft);
    const e = endReadingDraft === "" ? null : parseInt(endReadingDraft);
    triggerSave(parseInt(unitsDraft) || 0, parseInt(priceDraft) || 12, s, e);
  };

  const handlePriceBlur = () => {
    const s = startReadingDraft === "" ? null : parseInt(startReadingDraft);
    const e = endReadingDraft === "" ? null : parseInt(endReadingDraft);
    triggerSave(parseInt(unitsDraft) || 0, parseInt(priceDraft) || 12, s, e);
  };

  const draftUnits = parseInt(unitsDraft) || 0;
  const draftPrice = parseInt(priceDraft) || 0;
  const totalBill = draftUnits * draftPrice;

  return (
    <div className="space-y-3 mt-2">
      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Prev Reading</label>
          <input
            type="number"
            value={startReadingDraft}
            onChange={(e) => setStartReadingDraft(e.target.value)}
            onBlur={handleStartBlur}
            placeholder="Start"
            className="h-8 w-full text-xs px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Curr Reading</label>
          <input
            type="number"
            value={endReadingDraft}
            onChange={(e) => setEndReadingDraft(e.target.value)}
            onBlur={handleEndBlur}
            placeholder="End"
            className="h-8 w-full text-xs px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Units Used</label>
          <input
            type="number"
            value={unitsDraft}
            onChange={(e) => setUnitsDraft(e.target.value)}
            onBlur={handleUnitsBlur}
            placeholder="0"
            className="h-8 w-full text-xs px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Price / Unit</label>
          <input
            type="number"
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            onBlur={handlePriceBlur}
            placeholder="12"
            className="h-8 w-full text-xs px-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
      <div className="pt-2.5 border-t border-border flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-bold uppercase text-[9px]">Calculated Bill:</span>
        <span className="font-extrabold text-sm text-amber-500">₹{totalBill.toLocaleString()}</span>
      </div>
    </div>
  );
};

export const RoomCard = ({ room, onViewDetails, onEditRoom, dayGuests = [] }: RoomCardProps) => {
  const { payments, markWhatsappSent } = useTenantPayments();
  const { rentRecords } = useRent();
  const { selectedMonth, selectedYear } = useMonthContext();
  const { isOwner } = useAuth();
  const { currentPG } = usePG();
  const { byRoom: acByRoom, setReading } = useElectricityReadings(selectedMonth, selectedYear);
  const canManageTenants = isOwner;
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderData, setReminderData] = useState<{
    tenantName: string;
    tenantPhone: string;
    joiningDate: string;
    forMonth: string;
    roomNo: string;
    sharingType: string;
    amount: number;
    amountPaid?: number;
    balance: number;
    acSurcharge?: { units: number; unitPrice: number; share: number };
    acBill?: {
      roomNo: string;
      units: number;
      unitPrice: number;
      totalAmount: number;
      tenants: { name: string; share: number }[];
      monthLabel: string;
      pgName?: string;
      pgLogoUrl?: string;
    };
  } | null>(null);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [welcomeData, setWelcomeData] = useState<{
    tenantName: string;
    tenantPhone: string;
    joiningDate: string;
    roomNo: string;
    sharingType: string;
    monthlyRent: number;
  } | null>(null);
  const [receiptData, setReceiptData] = useState<{
    tenantName: string;
    tenantPhone: string;
    paymentMode: string;
    paymentDate: string;
    joiningDate: string;
    forMonth: string;
    roomNo: string;
    sharingType: string;
    amount: number;
    amountPaid: number;
    isFullPayment: boolean;
    remainingBalance?: number;
    tenantId: string;
    pgLogoUrl?: string;
    pgName?: string;
  } | null>(null);
  const months = [
    {
      value: 1,
      label: "January",
    },
    {
      value: 2,
      label: "February",
    },
    {
      value: 3,
      label: "March",
    },
    {
      value: 4,
      label: "April",
    },
    {
      value: 5,
      label: "May",
    },
    {
      value: 6,
      label: "June",
    },
    {
      value: 7,
      label: "July",
    },
    {
      value: 8,
      label: "August",
    },
    {
      value: 9,
      label: "September",
    },
    {
      value: 10,
      label: "October",
    },
    {
      value: 11,
      label: "November",
    },
    {
      value: 12,
      label: "December",
    },
  ];

  const isSelectedCurrentMonth = (() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  })();

  // Filter day guests for current month - only show guests whose stay is not over
  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const currentGuests = dayGuests.filter((guest) => {
    // Date-only strings must be parsed as local dates to avoid timezone shifts
    const fromDate = parseDateOnly(guest.from_date);
    const toDate = parseDateOnly(guest.to_date);
    // Only show in room card if guest is currently staying (today is between from_date and to_date inclusive)
    // For past months, show all guests that were present during that month
    if (isSelectedCurrentMonth) {
      // Current month: only show active guests (to_date >= today)
      return fromDate <= today && toDate >= today;
    } else {
      // Other months: show guests that overlapped with that month
      return fromDate <= endOfMonth && toDate >= startOfMonth;
    }
  });
  const guestsPaidCount = currentGuests.filter((g) => g.payment_status === "Paid").length;
  const getStatusColor = (status: string) => {
    if (status === "Occupied") return "bg-occupied text-occupied-foreground";
    if (status === "Partially Occupied") return "bg-warning text-warning-foreground";
    return "bg-vacant text-vacant-foreground";
  };

  // Get payment for selected month
  const getSelectedMonthPayment = (tenantId: string) => {
    return rentRecords.find((p) => p.tenantId === tenantId);
  };

  // Tenants active in selected month (history view) - show tenants whose end_date hasn't passed yet
  const tenantsInSelectedMonth = room.tenants.filter((t) =>
    isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth),
  );

  // For CURRENT month, show occupancy based on who is active NOW (end_date is null or in the future)
  // For past/future months, show occupancy based on month history
  const tenantsForDisplay = isSelectedCurrentMonth
    ? room.tenants.filter((t) => isTenantActiveNow(t.startDate, t.endDate))
    : tenantsInSelectedMonth;

  const eligibleTenants = tenantsForDisplay;

  // Occupancy for the selected month/current month view
  const occupiedCount = tenantsForDisplay.length;

  // Calculate collected amount from tenant_payments for selected month
  const totalCollected = eligibleTenants.reduce((sum, t) => {
    const payment = getSelectedMonthPayment(t.id);
    return sum + (payment?.paymentStatus === "Paid" ? payment.amount : 0);
  }, 0);

  // Calculate expected rent for eligible tenants
  const expectedRent = eligibleTenants.reduce((sum, t) => sum + t.monthlyRent, 0);

  // Calculate paid count from displayed tenants
  const paidCount = tenantsForDisplay.filter((t) => {
    const payment = getSelectedMonthPayment(t.id);
    return payment?.paymentStatus === "Paid";
  }).length;

  const currentStatus =
    occupiedCount === room.capacity ? "Occupied" : occupiedCount === 0 ? "Vacant" : "Partially Occupied";
  return (
    <Card id={`room-card-${room.roomNo}`} className="transition-all hover:shadow-md overflow-hidden w-full min-w-0 rounded-sm">
      <CardHeader className="pb-3">

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-lg font-semibold">Room {room.roomNo}</CardTitle>
            {room.keyNo && (
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                <Key className="h-3 w-3" />
                Key: {room.keyNo}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">

            {room.isAc && (
              <Badge className="bg-sky-500/15 text-sky-600 border border-sky-500/30 gap-1 px-1.5 py-0.5">
                <Snowflake className="h-3 w-3" />
                AC
              </Badge>
            )}
            <Badge className={getStatusColor(currentStatus)}>{currentStatus}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Occupancy Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {occupiedCount}/{room.capacity} occupied
            </span>
          </div>

          {tenantsForDisplay.length > 0 && (
            <Badge
              variant="outline"
              className={`rounded-sm ${paidCount === tenantsForDisplay.length ? "bg-paid text-paid-foreground" : "bg-pending text-pending-foreground"}`}
            >
              {paidCount}/{tenantsForDisplay.length} paid
            </Badge>
          )}
        </div>

        {/* AC Electricity Pricing Sheet Template - Editable */}
        {room.isAc && isExpanded && (
          <div className="rounded-xl border border-border bg-slate-50 dark:bg-slate-900/50 p-3.5 mb-2 shadow-sm text-xs mt-3">
            <div className="flex items-center gap-1.5 font-bold text-amber-500 mb-2 border-b border-border pb-1">
              <Zap className="h-4 w-4" />
              AC Pricing & Rates (Editable)
            </div>
            <ACRoomPricingEditor
              roomId={room.id}
              reading={acByRoom.get(room.id)}
              setReading={setReading}
            />
          </div>
        )}

        {/* Tenant List */}
        {tenantsForDisplay.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Tenants:</div>

            {(isExpanded ? tenantsForDisplay : tenantsForDisplay.slice(0, 2)).map((tenant) => {
              const leftThisMonth = tenantLeftInMonth(tenant.endDate, selectedYear, selectedMonth);
              const joinedThisMonth = tenantJoinedInMonth(tenant.startDate, selectedYear, selectedMonth);
              const payment = getSelectedMonthPayment(tenant.id);
              const isPaid = payment?.paymentStatus === "Paid";
              const isPartial = payment?.paymentStatus === "Partial";
              const whatsappSent = payment?.whatsappSent;
              const handlePaidClick = () => {
                if (!isPaid && !isPartial) return;
                const lastEntry = payment?.paymentEntries?.[payment.paymentEntries.length - 1];
                setReceiptData({
                  tenantName: tenant.name,
                  tenantPhone: tenant.phone,
                  paymentMode: lastEntry?.mode || "cash",
                  paymentDate: lastEntry?.date
                    ? format(new Date(lastEntry.date), "dd-MMM-yyyy")
                    : format(new Date(), "dd-MMM-yyyy"),
                  joiningDate: format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy"),
                  forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                  roomNo: room.roomNo,
                  sharingType: `${room.capacity} Sharing`,
                  amount: tenant.monthlyRent,
                  amountPaid: payment?.amountPaid || tenant.monthlyRent,
                  isFullPayment: isPaid,
                  remainingBalance: isPartial ? tenant.monthlyRent - (payment?.amountPaid || 0) : 0,
                  tenantId: tenant.id,
                  pgLogoUrl: currentPG?.logoUrl,
                  pgName: currentPG?.name,
                });
                setTimeout(() => {
                  setWhatsappDialogOpen(true);
                }, 100);
              };
              const openWhatsAppChat = () => {
                const phone = tenant.phone.replace(/\D/g, "");
                const formattedPhone = phone.startsWith("91") ? phone : `91${phone}`;
                window.location.href = `https://wa.me/${formattedPhone}`;
              };
              const openPaymentReminder = () => {
                const payment = getSelectedMonthPayment(tenant.id);
                const amountPaid = payment?.amountPaid || 0;
                // Compute AC share if applicable
                let acSurcharge: { units: number; unitPrice: number; share: number } | undefined;
                let acBill: {
                  roomNo: string;
                  units: number;
                  unitPrice: number;
                  totalAmount: number;
                  tenants: { name: string; share: number }[];
                  monthLabel: string;
                  pgName?: string;
                  pgLogoUrl?: string;
                } | undefined;
                if (room.isAc) {
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
                  if (tenantShare && tenantShare.share > 0) {
                    acSurcharge = { units, unitPrice, share: tenantShare.share };
                    acBill = {
                      roomNo: room.roomNo,
                      units,
                      unitPrice,
                      totalAmount: totalAmount,
                      tenants: tenantShares.map((share) => ({ name: `${share.name} (${share.daysStayed}d)`, share: share.share })),
                      monthLabel: `${months[selectedMonth - 1].label} ${selectedYear}`,
                      pgName: currentPG?.name,
                      pgLogoUrl: currentPG?.logoUrl,
                      calcMode: isCustom ? ("custom" as const) : ("commercial" as const),
                    };
                  }
                }
                const balance = tenant.monthlyRent - amountPaid;
                setReminderData({
                  tenantName: tenant.name,
                  tenantPhone: tenant.phone,
                  joiningDate: format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy"),
                  forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                  roomNo: room.roomNo,
                  sharingType: `${room.capacity} Sharing`,
                  amount: tenant.monthlyRent,
                  amountPaid: amountPaid > 0 ? amountPaid : undefined,
                  balance: balance,
                });
                setTimeout(() => {
                  setReminderDialogOpen(true);
                }, 100);
              };
              const isNew = isNewTenant(tenant.startDate);
              
              // Determine tenant payment category for color coding
              const getTenantBgClass = () => {
                if (isPaid) return 'bg-paid/10 border border-paid/30 rounded-lg px-2 py-1.5';
                if (isPartial) return 'bg-partial/10 border border-partial/30 rounded-lg px-2 py-1.5';
                // Check if due date has passed (tenant's join day in the current month)
                const joinDay = parseDateOnly(tenant.startDate).getDate();
                const today = new Date();
                const isCurrentMonth = selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();
                if (isCurrentMonth && today.getDate() < joinDay) {
                  // Not yet due - light blue
                  return 'bg-not-due/10 border border-not-due/30 rounded-lg px-2 py-1.5';
                }
                // Overdue / pending - red
                return 'bg-overdue/10 border border-overdue/30 rounded-lg px-2 py-1.5';
              };
              
              return (
                <div
                  key={tenant.id}
                  className={`flex items-center justify-between gap-2 pb-2 border-b last:border-b-0 ${leftThisMonth ? "opacity-60" : ""} ${getTenantBgClass()}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {tenant.name}
                        </span>
                        {isNew && !leftThisMonth && (
                          <Badge className="h-4 px-1.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 animate-pulse">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            NEW
                          </Badge>
                        )}
                      </div>
                      {leftThisMonth && tenant.endDate && (
                        <span className="text-xs text-destructive">
                          Left: {format(parseDateOnly(tenant.endDate), "dd MMM")}
                        </span>
                      )}
                      {joinedThisMonth && !isNew && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Joined: {format(parseDateOnly(tenant.startDate), "dd MMM")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Call badge */}
                    {tenant.phone && tenant.phone !== "••••••••••" && (
                      <a
                        href={`tel:${tenant.phone}`}
                        className="p-1 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        title={`Call ${tenant.name}`}
                      >
                        <Phone className="h-3 w-3" />
                      </a>
                    )}
                    {/* WhatsApp dropdown menu - Always visible */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className={`p-1 rounded-full transition-colors ${whatsappSent ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"}`}
                          title={whatsappSent ? "Receipt sent - Click for options" : "WhatsApp options"}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(isPaid || isPartial) && (
                          <DropdownMenuItem onClick={handlePaidClick} className="gap-2">
                            <Receipt className="h-4 w-4" />
                            Generate Receipt
                          </DropdownMenuItem>
                        )}
                        {tenant.phone && tenant.phone !== "••••••••••" && (
                          <DropdownMenuItem onClick={openWhatsAppChat} className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Chat with Tenant
                          </DropdownMenuItem>
                        )}
                        {tenant.phone && tenant.phone !== "••••••••••" && !isPaid && (
                          <DropdownMenuItem onClick={openPaymentReminder} className="gap-2">
                            <Bell className="h-4 w-4" />
                            Payment Reminder
                          </DropdownMenuItem>
                        )}
                        {(!tenant.securityDepositAmount || tenant.securityDepositAmount === 0) && (
                          <DropdownMenuItem
                            onClick={() => {
                              // Dispatch custom event to open security deposit dialog directly
                              const event = new CustomEvent('openSecurityDeposit', { 
                                detail: { 
                                  tenantId: tenant.id,
                                  tenantName: tenant.name,
                                  tenantPhone: tenant.phone,
                                  roomNo: room.roomNo,
                                  roomCapacity: room.capacity
                                } 
                              });
                              setTimeout(() => {
                                window.dispatchEvent(event);
                              }, 100);
                            }}
                            className="gap-2"
                          >
                            <Wallet className="h-4 w-4" />
                            Security Deposit
                          </DropdownMenuItem>
                        )}
                        {tenant.securityDepositAmount && tenant.securityDepositAmount > 0 && (
                          <DropdownMenuItem
                            onClick={() => {
                              // Dispatch custom event to open security deposit receipt dialog directly
                              const event = new CustomEvent('openSecurityDepositReceipt', { 
                                detail: { 
                                  tenantId: tenant.id
                                } 
                              });
                              setTimeout(() => {
                                window.dispatchEvent(event);
                              }, 100);
                            }}
                            className="gap-2"
                          >
                            <Receipt className="h-4 w-4" />
                            Security Deposit Receipt
                          </DropdownMenuItem>
                        )}
                        {tenant.phone && tenant.phone !== "••••••••••" && (
                          <DropdownMenuItem
                            onClick={() => {
                              setWelcomeData({
                                tenantName: tenant.name,
                                tenantPhone: tenant.phone,
                                joiningDate: tenant.startDate,
                                roomNo: room.roomNo,
                                sharingType: `${room.capacity} Sharing`,
                                monthlyRent: tenant.monthlyRent,
                              });
                              setTimeout(() => {
                                setWelcomeDialogOpen(true);
                              }, 100);
                            }}
                            className="gap-2"
                          >
                            <PartyPopper className="h-4 w-4" />
                            Welcome
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Badge
                      variant="outline"
                      className={
                        isPaid
                          ? "bg-paid text-paid-foreground text-xs cursor-pointer hover:opacity-80"
                          : isPartial
                            ? "bg-partial text-partial-foreground text-xs cursor-pointer hover:opacity-80"
                            : "bg-pending text-pending-foreground text-xs"
                      }
                      onClick={isPaid || isPartial ? handlePaidClick : undefined}
                    >
                      {isPaid ? "Paid" : isPartial ? "Partial" : "Not Paid"}
                    </Badge>
                  </div>
                </div>
              );
            })}

            {!isExpanded && tenantsForDisplay.length > 2 && (
              <div className="text-xs text-muted-foreground">+{tenantsForDisplay.length - 2} more</div>
            )}
          </div>
        )}

        {/* Total Possible / Add Tenant Boxed Row */}
        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-2xl border border-border/40 mt-3.5 pl-3 pr-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-base font-extrabold text-foreground">₹{room.rentAmount.toLocaleString()}</span>
          </div>
          {canManageTenants && isSelectedCurrentMonth && occupiedCount < room.capacity && (
            <Button
              variant="default"
              onClick={() => onViewDetails(room)}
              className="h-9 px-4 rounded-xl flex items-center gap-1.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Tenant</span>
            </Button>
          )}
        </div>

        {/* Notes */}
        {room.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs">{room.notes}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {tenantsForDisplay.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span>Expand tenants</span>
                  </>
                )}
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {onEditRoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditRoom(room);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onViewDetails(room);
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            >
              Manage Room
            </button>
          </div>
        </div>
      </CardContent>

      {/* WhatsApp Receipt Dialog */}
      <WhatsAppReceiptDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        receiptData={receiptData}
        onWhatsappSent={() => {
          if (receiptData?.tenantId) {
            markWhatsappSent.mutate({
              tenantId: receiptData.tenantId,
              month: selectedMonth,
              year: selectedYear,
            });
          }
        }}
      />

      {/* Payment Reminder Dialog */}
      <PaymentReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />

      {/* Welcome Dialog */}
      <WelcomeDialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen} welcomeData={welcomeData} />
    </Card>
  );
};
