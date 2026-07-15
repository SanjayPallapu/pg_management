import { useState, useMemo, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBackGesture } from "@/hooks/useBackGesture";
import { useMonthContext } from "@/contexts/MonthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Download,
  MessageCircle,
  Phone,
  Receipt,
  MessageSquare,
  Bell,
  History,
  Search,
  X,
  Users,
  Calendar as CalendarIcon,
  Wallet,
  PartyPopper,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Send,
  Snowflake,
  ArrowLeft,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Room, PaymentEntry } from "@/types";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import {
  useElectricityReadings,
  useAllElectricityReadings,
  calcAcTenantShares,
  calcCustomAcSplitShares,
  calculateAPCommercialBill,
} from "@/hooks/useElectricityReadings";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { applyStyledExport, XLSX as styledXLSX, saveAndShareExcel } from "@/utils/excelStyles";
import { toast } from "@/hooks/use-toast";
import { WhatsAppReceiptDialog } from "./WhatsAppReceiptDialog";
import { PaymentReminderDialog } from "./PaymentReminderDialog";
import { PreviousOverdueSheet } from "./PreviousOverdueSheet";
import { PreviousMonthOverdueCard } from "./PreviousMonthOverdueCard";
import { ACElectricitySheet } from "./ACElectricitySheet";
import { PaymentHistorySheet } from "./PaymentHistorySheet";
import { DeletePaymentDialog } from "./DeletePaymentDialog";
import { OverduePaidCard } from "./OverduePaidCard";
import { BulkReminderDialog } from "./BulkReminderDialog";
import { LeftTenantsCleanupSheet } from "./LeftTenantsCleanupSheet";
import { WelcomeDialog } from "./WelcomeDialog";
import { RulesShareDialog } from "./RulesShareDialog";
import { ACBillTemplate, type ACBillData } from "./ACBillTemplate";
import { isTenantActiveInMonth, parseDateOnly } from "@/utils/dateOnly";
import { calculateProRataRent } from "@/utils/proRataRent";
import { MONTHS } from "@/constants/pricing";
import { StayPeriodIndicator } from "./StayPeriodIndicator";
import { useCollectorNames } from "@/hooks/useCollectorNames";
import { usePG } from "@/contexts/PGContext";
import { useSearchParams } from "react-router-dom";
import { RoomQuickNav } from "./RoomQuickNav";
import { useTenantSnoozes } from "@/hooks/useTenantSnoozes";
import { CalendarClock, X as XIcon } from "lucide-react";
import { generateReceiptImage, dataURLtoBlob } from "@/utils/generateReceiptImage";
interface MonthlyRentSheetProps {
  rooms: Room[];
}

type PaymentDisplayExtras = {
  notes?: string;
  whatsappSent?: boolean;
};

export const MonthlyRentSheet = ({ rooms }: MonthlyRentSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const { collectors, getCollectorDisplayName } = useCollectorNames();
  const { isSnoozed, getSnoozedUntil, removeSnooze } = useTenantSnoozes();
  const isMobile = useIsMobile();
  const [acMonth, setAcMonth] = useState(selectedMonth);
  const [acYear, setAcYear] = useState(selectedYear);
  const { byRoom: acByRoom, setReading } = useElectricityReadings(acMonth, acYear);
  const { data: allReadings = [] } = useAllElectricityReadings();
  const [acSheetOpen, setAcSheetOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromDashboardRef = useRef(false);

  useEffect(() => {
    if (searchParams.get("openAc") === "true") {
      setAcSheetOpen(true);
      openedFromDashboardRef.current = true;
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("openAc");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  useEffect(() => {
    setAcMonth(selectedMonth);
    setAcYear(selectedYear);
  }, [selectedMonth, selectedYear]);
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const [acShareData, setAcShareData] = useState<ACBillData | null>(null);
  const [acPaymentRecord, setAcPaymentRecord] = useState<{
    tenantId: string;
    tenantName: string;
    roomNo: string;
    amount: number;
  } | null>(null);
  const [acPaymentModeState, setAcPaymentModeState] = useState<"upi" | "cash">("upi");
  const [acPaymentDateState, setAcPaymentDateState] = useState<Date>(new Date());
  const [acPaymentCollectedBy, setAcPaymentCollectedBy] = useState<string>("Me");
  const [splitMode, setSplitMode] = useState(false);
  const [upiAmount, setUpiAmount] = useState(0);
  const [cashAmount, setCashAmount] = useState(0);
  const defaultCollectorId = useMemo(() => collectors[0]?.id ?? "Me", [collectors]);
  const [deletePaymentTenant, setDeletePaymentTenant] = useState<{
    id: string;
    name: string;
    monthlyRent: number;
    paymentEntries: PaymentEntry[];
  } | null>(null);
  const [paymentAmountTenant, setPaymentAmountTenant] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [payRemainingTenant, setPayRemainingTenant] = useState<string | null>(null);
  const [payRemainingAmount, setPayRemainingAmount] = useState<number>(0);
  const [payRemainingDate, setPayRemainingDate] = useState<Date>(new Date());
  const [payRemainingDiscount, setPayRemainingDiscount] = useState<number>(0);
  const [payRemainingExtra, setPayRemainingExtra] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi");
  const [remainingPaymentMode, setRemainingPaymentMode] = useState<"upi" | "cash">("upi");
  const [collectedBy, setCollectedBy] = useState<string>("Me");
  const [remainingCollectedBy, setRemainingCollectedBy] = useState<string>("Me");
  const [overpaymentReason, setOverpaymentReason] = useState<string>("");
  const [overpaymentError, setOverpaymentError] = useState<boolean>(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [previousOverdueOpen, setPreviousOverdueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [cleanupSheetOpen, setCleanupSheetOpen] = useState(false);
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [rulesShareData, setRulesShareData] = useState<{ tenantName: string; tenantPhone: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [customModeRooms, setCustomModeRooms] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    rooms.forEach((r) => {
      initial[r.id] = localStorage.getItem(`ac_bill_mode_${r.id}`) === "custom";
    });
    return initial;
  });

  useEffect(() => {
    const updated: Record<string, boolean> = {};
    rooms.forEach((r) => {
      updated[r.id] = localStorage.getItem(`ac_bill_mode_${r.id}`) === "custom";
    });
    setCustomModeRooms(updated);
  }, [rooms]);

  const [welcomeData, setWelcomeData] = useState<{
    tenantName: string;
    tenantPhone: string;
    joiningDate: string;
    roomNo: string;
    sharingType: string;
    monthlyRent: number;
  } | null>(null);
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
      calcMode?: "commercial" | "custom";
    };
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
    tenantId?: string;
    paymentEntries?: PaymentEntry[];
    previousMonthPending?: number;
  } | null>(null);

  // Close all open dialogs/sheets when switching tabs via bottom navigation
  useEffect(() => {
    const handleCloseAll = () => {
      setWhatsappDialogOpen(false);
      setReminderDialogOpen(false);
      setPreviousOverdueOpen(false);
      setHistoryOpen(false);
      setBulkReminderOpen(false);
      setCleanupSheetOpen(false);
      setWelcomeDialogOpen(false);
      setRulesDialogOpen(false);
      setAcSheetOpen(false);
      setQuickNavOpen(false);
      setDeletePaymentTenant(null);
      setPaymentAmountTenant(null);
      setPayRemainingTenant(null);
    };

    window.addEventListener('tab-click', handleCloseAll);
    return () => window.removeEventListener('tab-click', handleCloseAll);
  }, []);

  useEffect(() => {
    if (collectors.length === 0) return;
    setCollectedBy((prev) => (collectors.some((c) => c.id === prev) ? prev : defaultCollectorId));
    setRemainingCollectedBy((prev) => (collectors.some((c) => c.id === prev) ? prev : defaultCollectorId));
  }, [collectors, defaultCollectorId]);

  const openRulesDialog = (tenantName: string, tenantPhone: string) => {
    setRulesShareData({ tenantName, tenantPhone });
    setTimeout(() => {
      setRulesDialogOpen(true);
    }, 100);
  };

  // Handle OS back gesture to close dialogs
  useBackGesture(!!paymentAmountTenant, () => setPaymentAmountTenant(null));
  useBackGesture(!!payRemainingTenant, () => setPayRemainingTenant(null));
  useBackGesture(!!deletePaymentTenant, () => setDeletePaymentTenant(null));
  const { payments, upsertPayment, markWhatsappSent } = useTenantPayments();

  const getOverdueAcBills = (
    tenantId: string, 
    room: Room, 
    refMonth: number = selectedMonth, 
    refYear: number = selectedYear
  ) => {
    const overdue: { month: number; year: number; share: number; monthLabel: string }[] = [];
    const tenant = room.tenants.find((t) => t.id === tenantId);
    if (!tenant) return overdue;

    const joinDate = new Date(tenant.startDate);
    const checkMonths: { month: number; year: number }[] = [];
    
    let curM = refMonth - 1;
    let curY = refYear;
    if (curM === 0) {
      curM = 12;
      curY = refYear - 1;
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
          const splitType = reading.split_type || 'active_tenants';
          const splitCount = reading.split_count ?? undefined;
          const isCustom = localStorage.getItem(`ac_bill_mode_${room.id}`) === "custom" || splitType === "custom";
          const totalAmount = isCustom ? reading.units * reading.unit_price : apBill.totalBill;

          const shares = calcAcTenantShares(
            reading.units,
            reading.unit_price,
            activeTenants,
            y,
            m,
            room.capacity,
            totalAmount,
            splitType,
            splitCount
          );
          const myShare = shares.find((s) => s.name === tenant.name)?.share || 0;
          if (myShare > 0) {
            overdue.push({
              month: m,
              year: y,
              share: myShare,
              monthLabel: `${MONTHS[m - 1]?.label} ${y}`,
            });
          }
        }
      }
    }

    return overdue;
  };


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
  const years = Array.from(
    {
      length: 5,
    },
    (_, i) => new Date().getFullYear() - 2 + i,
  );
  const eligibleTenants = useMemo(() => {
    const allTenants = rooms.flatMap((room) =>
      room.tenants.map((tenant) => ({
        ...tenant,
        roomNo: room.roomNo,
      })),
    );
    // Filter tenants who are active in the selected month (joined before end of month AND not left before month started)
    return allTenants.filter((tenant) =>
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth),
    );
  }, [rooms, selectedMonth, selectedYear]);
  const tenantsWithPayments = useMemo(() => {
    const tenantsData = eligibleTenants.map((tenant) => {
      const payment = payments.find(
        (p) => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear,
      );
      const joinDate = new Date(tenant.startDate);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const today = new Date();
      const todayDate = today.getDate();
      const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth);
      const isFutureMonth =
        selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);
      const tenantDueDay = joinDate.getDate();

      // Calculate pro-rata rent for mid-month leavers
      const amountPaid = payment?.amountPaid || 0;
      const { effectiveRent, daysStayed, isProRata } = calculateProRataRent(
        tenant.monthlyRent,
        tenant.startDate,
        tenant.endDate,
        selectedYear,
        selectedMonth,
        amountPaid,
      );

      const targetRent = isProRata ? effectiveRent : tenant.monthlyRent;

      let paymentCategory: "paid" | "partial" | "overdue" | "not-due" | "advance-not-paid";
      if (payment?.paymentStatus === "Paid" || (amountPaid >= targetRent && targetRent > 0)) {
        paymentCategory = "paid";
      } else if (payment?.paymentStatus === "Partial" || (amountPaid > 0 && amountPaid < targetRent)) {
        paymentCategory = "partial";
      } else if (isPastMonth) {
        paymentCategory = "overdue";
      } else if (isFutureMonth) {
        paymentCategory = "not-due";
      } else {
        if (todayDate < tenantDueDay) {
          paymentCategory = "not-due";
        } else {
          paymentCategory = "advance-not-paid";
        }
      }
      return {
        ...tenant,
        payment: payment || {
          paymentStatus: "Pending" as const,
          amount: tenant.monthlyRent,
          paymentDate: undefined,
          amountPaid: 0,
          paymentEntries: [],
        },
        paymentCategory,
        dueDay: tenantDueDay,
        effectiveRent,
        daysStayed,
        isProRata,
      };
    });

    // Sort by: Paid > Partial > Pending (overdue/advance-not-paid) > Not-due
    // Within pending categories, sort by due day (earliest first)
    const categoryOrder: Record<string, number> = {
      paid: 1,
      partial: 2,
      overdue: 3,
      "advance-not-paid": 4,
      "not-due": 5,
    };
    return tenantsData.sort((a, b) => {
      const aOrder = categoryOrder[a.paymentCategory] || 99;
      const bOrder = categoryOrder[b.paymentCategory] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Within same category, sort by due day for pending/overdue
      if (
        a.paymentCategory === "overdue" ||
        a.paymentCategory === "advance-not-paid" ||
        a.paymentCategory === "not-due"
      ) {
        return a.dueDay - b.dueDay;
      }
      return 0;
    });
  }, [eligibleTenants, selectedMonth, selectedYear, payments]);

  // Filter tenants based on search query, exclude locked tenants, and optionally hide left tenants
  const filteredTenants = useMemo(() => {
    let filtered = tenantsWithPayments.filter((tenant) => !tenant.isLocked);

    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase().trim();
    return filtered.filter(
      (tenant) => tenant.name.toLowerCase().includes(query) || tenant.roomNo.toLowerCase().includes(query),
    );
  }, [tenantsWithPayments, searchQuery]);


  const previousMonthOverdue = useMemo(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    // Get all tenants who were active in the previous month
    const allTenants = rooms.flatMap((room) =>
      room.tenants.map((tenant) => ({
        ...tenant,
        roomNo: room.roomNo,
      })),
    );
    const prevMonthActiveTenants = allTenants.filter((tenant) =>
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth),
    );
    const prevMonthActiveTenantIds = new Set(prevMonthActiveTenants.map((t) => t.id));

    // Find tenants who were active in prev month but have no payment or unpaid payment
    let overdueTotal = 0;
    let overdueCount = 0;
    prevMonthActiveTenants.forEach((tenant) => {
      if (tenant.isLocked) return; // Skip locked tenants

      const payment = payments.find((p) => p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear);
      if (!payment || payment.paymentStatus === "Pending") {
        // No payment record or pending = full rent overdue
        overdueTotal += tenant.monthlyRent;
        overdueCount++;
      } else if (payment.paymentStatus === "Partial") {
        // Partial payment = remaining amount overdue
        overdueTotal += tenant.monthlyRent - (payment.amountPaid || 0);
        overdueCount++;
      }
      // 'Paid' = not overdue, skip
    });
    return {
      total: overdueTotal,
      count: overdueCount,
    };
  }, [selectedMonth, selectedYear, payments, rooms]);
  const previousOverdueCollections = useMemo(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    let count = 0;
    let total = 0;
    rooms.forEach((room) => {
      room.tenants.forEach((tenant) => {
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)) return;

        const payment = payments.find((p) => p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear);
        const currentMonthEntries =
          payment?.paymentEntries?.filter((entry) => {
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() + 1 === selectedMonth && entryDate.getFullYear() === selectedYear;
          }) || [];

        if (currentMonthEntries.length > 0) {
          count += 1;
          total += currentMonthEntries.reduce((sum, entry) => sum + entry.amount, 0);
        }
      });
    });

    return { count, total };
  }, [payments, rooms, selectedMonth, selectedYear]);
  const showPreviousDuesPanel = previousMonthOverdue.count > 0 || previousOverdueCollections.count > 0;
  const activeRoomFilter = useMemo(
    () => rooms.some((room) => room.roomNo.toLowerCase() === searchQuery.trim().toLowerCase()),
    [rooms, searchQuery],
  );
  const stats = useMemo(() => {
    // Exclude locked tenants AND left tenants from stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const unlockedTenants = tenantsWithPayments.filter((t) => {
      if (t.isLocked) return false;
      // Exclude left tenants from pending/collected stats
      if (t.endDate) {
        const endDate = new Date(t.endDate);
        endDate.setHours(0, 0, 0, 0);
        if (endDate <= today) return false;
      }
      return true;
    });
    const paid = unlockedTenants.filter((t) => t.payment.paymentStatus === "Paid");
    const partial = unlockedTenants.filter((t) => t.payment.paymentStatus === "Partial");
    const pending = unlockedTenants.filter((t) => t.payment.paymentStatus === "Pending");
    const partialCollected = partial.reduce((sum, t) => sum + (t.payment.amountPaid || 0), 0);
    const partialRemaining = partial.reduce((sum, t) => sum + (t.monthlyRent - (t.payment.amountPaid || 0)), 0);
    // Use actual amount paid (includes extras/overpayments) for paid tenants
    const paidCollected = paid.reduce((sum, t) => sum + (t.payment.amountPaid || t.monthlyRent), 0);
    return {
      totalCollected: paidCollected + partialCollected,
      totalPending: pending.reduce((sum, t) => sum + t.monthlyRent, 0) + partialRemaining,
      paidCount: paid.length,
      pendingCount: pending.length + partial.length,
    };
  }, [tenantsWithPayments]);

  const acRooms = useMemo(() => {
    return rooms
      .filter((room) => room.isAc)
      .map((room) => {
        const activeTenants = room.tenants.filter((tenant) =>
          isTenantActiveInMonth(tenant.startDate, tenant.endDate, acYear, acMonth),
        );
        const reading = acByRoom.get(room.id);
        const units = reading?.units ?? 0;
        const unitPrice = reading?.unit_price ?? currentPG?.electricityUnitPrice ?? 12;
        const isCustom = !!customModeRooms[room.id];
        const apBill = calculateAPCommercialBill(units);
        const splitType = reading?.split_type || 'active_tenants';
        const splitCount = reading?.split_count ?? null;

        const total = splitType === 'custom' && splitCount && splitCount > 0
          ? units * unitPrice
          : isCustom
            ? units * unitPrice
            : apBill.totalBill;

        const baseShares = calcAcTenantShares(
          units,
          unitPrice,
          activeTenants,
          acYear,
          acMonth,
          room.capacity,
          total,
          splitType,
          splitCount ?? undefined
        );
        const tenantShares = baseShares.map((share) => {
          const tenantObj = activeTenants.find((t) => t.name === share.name);
          const overdueAc = tenantObj ? getOverdueAcBills(tenantObj.id, room, acMonth, acYear) : [];
          const overdueAcTotal = overdueAc.reduce((sum, om) => sum + om.share, 0);
          const payment = tenantObj ? payments.find((p) => p.tenantId === tenantObj.id && p.month === acMonth && p.year === acYear) : undefined;
          return {
            ...share,
            id: tenantObj?.id,
            acPaymentStatus: payment?.acPaymentStatus || 'Pending',
            overdueAc,
            overdueAcTotal,
          };
        });

        let prevMonth = acMonth - 1;
        let prevYear = acYear;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear = acYear - 1;
        }
        const prevReading = allReadings.find((r) => r.room_id === room.id && r.month === prevMonth && r.year === prevYear);
        const autoStartReading = prevReading?.end_reading ?? null;

        const startReading = reading?.start_reading !== undefined && reading?.start_reading !== null
          ? reading.start_reading
          : autoStartReading;
        const endReading = reading?.end_reading ?? null;

        return {
          room,
          activeTenants,
          units,
          unitPrice,
          total,
          tenantShares,
          isCustom,
          startReading,
          endReading,
          splitType,
          splitCount,
        };
      });
  }, [rooms, acByRoom, acMonth, acYear, currentPG?.electricityUnitPrice, customModeRooms, payments, allReadings]);

  const handleShareAC = async (
    item: typeof acRooms[number],
    draftUnits: number,
    draftUnitPrice: number,
    startReading?: number | null,
    endReading?: number | null,
    splitType?: string,
    splitCount?: number | null,
    targetTenantName?: string,
  ) => {
    if (draftUnits <= 0) {
      toast({ title: "Enter units first", variant: "destructive" });
      return;
    }
    if (draftUnitPrice <= 0) {
      toast({ title: "Enter unit price first", variant: "destructive" });
      return;
    }

    try {
      await setReading.mutateAsync({
        roomId: item.room.id,
        units: draftUnits,
        unitPrice: draftUnitPrice,
        startReading,
        endReading,
        splitType,
        splitCount,
      });
    } catch {
      return;
    }

    const isCustom = localStorage.getItem(`ac_bill_mode_${item.room.id}`) === "custom";
    const apBill = calculateAPCommercialBill(draftUnits);
    const total = splitType === "custom" && splitCount && splitCount > 0
      ? draftUnits * draftUnitPrice
      : isCustom
        ? draftUnits * draftUnitPrice
        : apBill.totalBill;

    const tenantShares = calcAcTenantShares(
      draftUnits,
      draftUnitPrice,
      item.activeTenants,
      acYear,
      acMonth,
      item.room.capacity,
      total,
      splitType || 'active_tenants',
      splitCount ?? undefined
    );

    const targetTenant = targetTenantName ? item.activeTenants.find((t) => t.name === targetTenantName) : undefined;
    const existingPayment = targetTenant ? payments.find(p => p.tenantId === targetTenant.id && p.month === acMonth && p.year === acYear) : undefined;
    const isPaid = existingPayment?.acPaymentStatus === 'Paid';
    const acEntry = existingPayment?.paymentEntries?.find((e: any) => e.type === 'ac');
    const paymentDate = acEntry ? format(new Date(acEntry.date), 'dd MMM yyyy') : (existingPayment?.paymentDate ? format(new Date(existingPayment.paymentDate), 'dd MMM yyyy') : undefined);
    const paymentMode = acEntry?.mode;
    const collectedBy = acEntry?.collectedBy;

    const tenantsWithOverdue = tenantShares.map((share) => {
      const tenantObj = item.activeTenants.find((t) => t.name === share.name);
      const overdueAc = tenantObj ? getOverdueAcBills(tenantObj.id, item.room, acMonth, acYear) : [];
      const overdueAcTotal = overdueAc.reduce((sum, om) => sum + om.share, 0);
      return {
        name: share.daysStayed > 0 ? `${share.name} (${share.daysStayed}d)` : share.name,
        share: share.share,
        overdueAc,
        overdueAcTotal,
      };
    });

    setAcShareData({
      roomNo: item.room.roomNo,
      units: draftUnits,
      unitPrice: draftUnitPrice,
      totalAmount: total,
      tenants: tenantsWithOverdue,
      monthLabel: `${MONTHS[acMonth - 1]?.label} ${acYear}`,
      pgName: currentPG?.name,
      pgLogoUrl: currentPG?.logoUrl,
      tenantName: targetTenantName,
      calcMode: isCustom ? "custom" : "commercial",
      startReading,
      endReading,
      splitType,
      splitCount,
      isPaid,
      paymentDate,
      paymentMode,
      collectedBy,
    });

    setTimeout(async () => {
      const el = document.getElementById("rent-ac-bill-template-host");
      if (!el) return;
      try {
        const dataUrl = await generateReceiptImage(el);
        const blob = dataURLtoBlob(dataUrl);
        const fileName = targetTenantName ? `ac-bill-${item.room.roomNo}-${targetTenantName.replace(/\s+/g, '-')}.png` : `ac-bill-${item.room.roomNo}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        const targetTenant = targetTenantName ? item.activeTenants.find((t) => t.name === targetTenantName) : undefined;
        let phone = targetTenant?.phone?.replace(/\D/g, "");

        if (phone) {
          const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;
          try {
            await navigator.clipboard.writeText(displayPhone);
          } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = displayPhone;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }

          const shareNavigator = navigator as Navigator & {
            canShare?: (data?: ShareData) => boolean;
          };
          if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
            await shareNavigator.share({ files: [file], title: "AC Electricity Bill" });
          } else {
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = fileName;
            a.click();
            const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
            window.location.href = `https://wa.me/${cleanPhone}`;
          }
        } else {
          const shareNavigator = navigator as Navigator & {
            canShare?: (data?: ShareData) => boolean;
          };
          if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
            await shareNavigator.share({ files: [file], title: "AC Electricity Bill" });
          } else {
            const a = document.createElement("a");
            a.href = dataUrl;
            a.download = fileName;
            a.click();
          }
        }
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === 'AbortError';
        if (isAbort) return;
        
        console.warn('Native AC share failed, falling back to download + redirect:', error);
        try {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = fileName;
          a.click();
          
          const targetTenant = targetTenantName ? item.activeTenants.find((t) => t.name === targetTenantName) : undefined;
          let phone = targetTenant?.phone?.replace(/\D/g, "");
          if (phone) {
            const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
            window.location.href = `https://wa.me/${cleanPhone}`;
          }
        } catch (fallbackError) {
          const message = error instanceof Error ? error.message : "";
          toast({ title: "Share failed", description: message, variant: "destructive" });
        }
      } finally {
        setAcShareData(null);
      }
    }, 250);
  };

  const handleToggleAcPaymentStatus = (tenantId: string, currentStatus: 'Paid' | 'Pending') => {
    const allTenants = rooms.flatMap(r => r.tenants);
    const tenant = allTenants.find(t => t.id === tenantId);
    if (!tenant) return;

    if (currentStatus === 'Paid') {
      // Toggle back to Pending
      const existingPayment = payments.find(p => p.tenantId === tenantId && p.month === acMonth && p.year === acYear);
      upsertPayment.mutate({
        tenantId,
        month: acMonth,
        year: acYear,
        paymentStatus: existingPayment?.paymentStatus || 'Pending',
        paymentDate: existingPayment?.paymentDate,
        amount: existingPayment?.amount || tenant.monthlyRent,
        amountPaid: existingPayment?.amountPaid || 0,
        paymentEntries: existingPayment?.paymentEntries?.filter((e: any) => e.type !== 'ac') || [],
        notes: existingPayment?.notes,
        acPaymentStatus: 'Pending',
        tenantName: tenant.name,
        roomNo: rooms.find(r => r.tenants.some(t => t.id === tenantId))?.roomNo,
      });
    } else {
      // Open AC Payment Record Dialog!
      const room = rooms.find(r => r.tenants.some(t => t.id === tenantId));
      const roomNo = room?.roomNo || "";
      const roomItem = acRooms.find(r => r.room.roomNo === roomNo);
      
      let share = 0;
      let overdueAcTotal = 0;

      if (roomItem) {
        const total = localStorage.getItem(`ac_bill_mode_${roomItem.room.id}`) === "custom"
          ? roomItem.units * (currentPG?.electricityUnitPrice ?? 12)
          : calculateAPCommercialBill(roomItem.units).totalBill;
          
        const tenantShares = calcAcTenantShares(
          roomItem.units,
          currentPG?.electricityUnitPrice ?? 12,
          roomItem.activeTenants,
          acYear,
          acMonth,
          roomItem.room.capacity,
          total,
          roomItem.splitType || 'active_tenants',
          roomItem.splitCount ?? undefined
        );
        
        const tenantShare = tenantShares.find(s => s.id === tenantId || s.name === tenant.name);
        share = tenantShare?.share ?? 0;
        
        const overdue = getOverdueAcBills(tenantId, roomItem.room, acMonth, acYear);
        overdueAcTotal = overdue.reduce((sum, om) => sum + om.share, 0);
      }

      setAcPaymentRecord({
        tenantId,
        tenantName: tenant.name,
        roomNo,
        amount: share + overdueAcTotal,
      });
      setAcPaymentModeState("upi");
      setAcPaymentDateState(new Date());
      setAcPaymentCollectedBy(defaultCollectorId);
    }
  };

  const handleConfirmAcPayment = () => {
    if (!acPaymentRecord) return;
    const { tenantId, tenantName, roomNo, amount } = acPaymentRecord;

    const existingPayment = payments.find(p => p.tenantId === tenantId && p.month === acMonth && p.year === acYear);
    const existingEntries = existingPayment?.paymentEntries || [];
    
    // Add AC payment entry
    const formattedDate = format(acPaymentDateState, "yyyy-MM-dd");
    const collectorName = getCollectorDisplayName(acPaymentCollectedBy);
    const acEntry: PaymentEntry = {
      amount,
      date: formattedDate,
      type: 'ac' as any,
      mode: acPaymentModeState,
      collectedBy: collectorName,
    };

    upsertPayment.mutate({
      tenantId,
      month: acMonth,
      year: acYear,
      paymentStatus: existingPayment?.paymentStatus || 'Pending',
      paymentDate: existingPayment?.paymentDate,
      amount: existingPayment?.amount || 0,
      amountPaid: existingPayment?.amountPaid || 0,
      paymentEntries: [...existingEntries, acEntry],
      notes: existingPayment?.notes,
      acPaymentStatus: 'Paid',
      tenantName,
      roomNo,
    }, {
      onSuccess: () => {
        toast({ title: "AC Bill Payment recorded successfully!" });
        setAcPaymentRecord(null);

        // Sequence flow: Open the share dialog automatically after marking paid!
        // We find the room item to share
        const roomItem = acRooms.find(r => r.room.roomNo === roomNo);
        if (roomItem) {
          const reading = allReadings.find(r => r.roomId === roomItem.room.id && r.month === acMonth && r.year === acYear);
          const units = reading?.units ?? 0;
          const unitPrice = reading?.unitPrice ?? currentPG?.electricityUnitPrice ?? 12;
          const startReading = reading?.startReading ?? null;
          const endReading = reading?.endReading ?? null;
          const splitType = reading?.splitType ?? "active_tenants";
          const splitCount = reading?.splitCount ?? null;

          handleShareAC(
            roomItem,
            units,
            unitPrice,
            startReading,
            endReading,
            splitType,
            splitCount,
            tenantName
          );
        }
      }
    });
  };


  // Helper function to get previous month pending for a tenant
  const getPreviousMonthPendingForTenant = (tenantId: string): number => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    // Find tenant's details
    const allTenants = rooms.flatMap((room) => room.tenants);
    const tenant = allTenants.find((t) => t.id === tenantId);
    if (!tenant) return 0;

    // Check if tenant was active in that previous month
    if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)) {
      return 0;
    }
    const payment = payments.find((p) => p.tenantId === tenantId && p.month === prevMonth && p.year === prevYear);
    if (!payment || payment.paymentStatus === "Pending") {
      return tenant.monthlyRent;
    } else if (payment.paymentStatus === "Partial") {
      return tenant.monthlyRent - (payment.amountPaid || 0);
    }
    return 0; // Fully paid
  };
  const handlePaymentToggle = async (tenantId: string, tenantName: string, currentStatus: "Paid" | "Pending" | "Partial") => {
    const tenant = tenantsWithPayments.find((t) => t.id === tenantId);
    if (!tenant) return;

    if (currentStatus === "Paid") {
      setDeletePaymentTenant({
        id: tenant.id,
        name: tenant.name,
        monthlyRent: tenant.monthlyRent,
        paymentEntries: tenant.payment?.paymentEntries || []
      });
      return;
    }

    setPaymentAmountTenant(tenantId);
    const remainingRent = tenant.monthlyRent - (tenant.payment.amountPaid || 0);
    setPaymentAmount(remainingRent > 0 ? remainingRent : tenant.monthlyRent);
    setPaymentDate(new Date());
  };
  const handlePayRemaining = (tenantId: string) => {
    const tenant = tenantsWithPayments.find((t) => t.id === tenantId);
    if (tenant) {
      const amountPaid = tenant.payment.amountPaid || 0;

      // Calculate pro-rata if tenant is leaving mid-month
      const { effectiveRent, daysStayed, isProRata } = calculateProRataRent(
        tenant.monthlyRent,
        tenant.startDate,
        tenant.endDate,
        selectedYear,
        selectedMonth,
        amountPaid,
      );

      // Use pro-rata remaining if applicable, otherwise use normal calculation
      const targetRent = isProRata ? effectiveRent : tenant.monthlyRent;
      const remaining = Math.max(0, targetRent - amountPaid);

      setPayRemainingTenant(tenantId);
      setPayRemainingAmount(remaining);
      setPayRemainingDate(new Date());
      setPayRemainingDiscount(0);
      setPayRemainingExtra(0);
      setRemainingCollectedBy(defaultCollectorId);
    }
  };
  const confirmPaymentAmount = () => {
    if (!paymentAmountTenant) return;
    const tenant = tenantsWithPayments.find((t) => t.id === paymentAmountTenant);
    if (!tenant) return;

    // Check for overpayment without reason
    const isOverpayment = paymentAmount > tenant.monthlyRent;
    if (isOverpayment && !overpaymentReason.trim()) {
      setOverpaymentError(true);
      return;
    }
    setOverpaymentError(false);
    const formattedDate = format(paymentDate, "yyyy-MM-dd");
    const existingPaid = tenant.payment.amountPaid || 0;
    const totalPaid = existingPaid + paymentAmount;
    const isFullPayment = totalPaid >= tenant.monthlyRent;
    const status = isFullPayment ? "Paid" : "Partial";

    // Build new payment entry/entries (split = two rows: UPI + Cash)
    const existingEntries = tenant.payment.paymentEntries || [];
    const newEntries: PaymentEntry[] = [];
    if (splitMode && (upiAmount > 0 || cashAmount > 0)) {
      if (upiAmount > 0) newEntries.push({
        amount: upiAmount, date: formattedDate,
        type: isFullPayment ? "full" : "partial", mode: "upi", collectedBy,
      });
      if (cashAmount > 0) newEntries.push({
        amount: cashAmount, date: formattedDate,
        type: isFullPayment ? "full" : "partial", mode: "cash", collectedBy,
      });
    } else {
      newEntries.push({
        amount: paymentAmount, date: formattedDate,
        type: isFullPayment ? "full" : "partial", mode: paymentMode, collectedBy,
      });
    }
    const updatedEntries = [...existingEntries, ...newEntries];

    // Build notes for overpayment
    const notes = isOverpayment
      ? `Extra ₹${(paymentAmount - tenant.monthlyRent).toLocaleString()}: ${overpaymentReason.trim()}`
      : undefined;
    upsertPayment.mutate({
      tenantId: tenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: paymentAmount,
      // Store actual paid amount for overpayment tracking
      paymentEntries: updatedEntries,
      notes,
      tenantName: tenant.name,
      roomNo: tenant.roomNo,
    });


    // Prepare receipt data for WhatsApp
    const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
    const sharingType = room ? `${room.capacity} Sharing` : "N/A";
    const prevMonthPending = getPreviousMonthPendingForTenant(tenant.id);
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: paymentMode,
      paymentDate: format(paymentDate, "dd-MMM-yyyy"),
      joiningDate: tenant.startDate ? format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy") : "",
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: tenant.roomNo,
      sharingType: sharingType,
      amount: tenant.monthlyRent,
      amountPaid: paymentAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
      tenantId: tenant.id,
      paymentEntries: updatedEntries,
      previousMonthPending: prevMonthPending > 0 ? prevMonthPending : undefined,
    });
    setTimeout(() => {
      setWhatsappDialogOpen(true);
    }, 100);
    setPaymentAmountTenant(null);
    setPaymentAmount(0);
    setOverpaymentReason("");
    setCollectedBy(defaultCollectorId);
    setSplitMode(false);
    setUpiAmount(0);
    setCashAmount(0);
  };
  const confirmPayRemaining = () => {
    if (!payRemainingTenant) return;
    const tenant = tenantsWithPayments.find((t) => t.id === payRemainingTenant);
    if (!tenant) return;
    const formattedDate = format(payRemainingDate, "yyyy-MM-dd");
    const previousPaid = tenant.payment.amountPaid || 0;

    // Calculate final amount: base amount - discount + extra
    const finalAmount = payRemainingAmount - payRemainingDiscount + payRemainingExtra;
    const totalPaid = previousPaid + finalAmount;

    // Use pro-rata effective rent if applicable
    const targetRent =
      tenant.isProRata && tenant.effectiveRent !== undefined ? tenant.effectiveRent : tenant.monthlyRent;
    const adjustedTarget = targetRent - payRemainingDiscount + payRemainingExtra;
    const isFullPayment = totalPaid >= adjustedTarget;

    // Add remaining payment entry
    const newEntry = {
      amount: finalAmount,
      date: formattedDate,
      type: isFullPayment ? ("remaining" as const) : ("partial" as const),
      mode: remainingPaymentMode,
      collectedBy: remainingCollectedBy,
    };
    const existingEntries = tenant.payment.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];
    const status = isFullPayment ? "Paid" : "Partial";

    // Build notes for discount/extra
    let notes = (tenant.payment as PaymentDisplayExtras).notes || "";
    if (payRemainingDiscount > 0) {
      notes += (notes ? " | " : "") + `Discount: ₹${payRemainingDiscount.toLocaleString()}`;
    }
    if (payRemainingExtra > 0) {
      notes += (notes ? " | " : "") + `Extra: ₹${payRemainingExtra.toLocaleString()}`;
    }

    upsertPayment.mutate({
      tenantId: tenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: adjustedTarget,
      amountPaid: Math.min(totalPaid, adjustedTarget),
      paymentEntries: updatedEntries,
      tenantName: tenant.name,
      roomNo: tenant.roomNo,
      notes: notes || undefined,
    });


    // Prepare receipt data for WhatsApp
    const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
    const sharingType = room ? `${room.capacity} Sharing` : "N/A";
    const prevMonthPending = getPreviousMonthPendingForTenant(tenant.id);
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: remainingPaymentMode,
      paymentDate: format(payRemainingDate, "dd-MMM-yyyy"),
      joiningDate: tenant.startDate ? format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy") : "",
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: tenant.roomNo,
      sharingType: sharingType,
      amount: tenant.monthlyRent,
      amountPaid: finalAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : adjustedTarget - totalPaid,
      tenantId: tenant.id,
      paymentEntries: updatedEntries,
      previousMonthPending: prevMonthPending > 0 ? prevMonthPending : undefined,
    });
    setTimeout(() => {
      setWhatsappDialogOpen(true);
    }, 100);
    setPayRemainingTenant(null);
    setPayRemainingAmount(0);
    setPayRemainingDiscount(0);
    setPayRemainingExtra(0);
    setRemainingCollectedBy(defaultCollectorId);
  };
  const handleDeletePayments = (entriesToDelete: number[], newAmountPaid: number, newEntries: PaymentEntry[]) => {
    if (!deletePaymentTenant) return;
    const newStatus =
      newAmountPaid >= deletePaymentTenant.monthlyRent ? "Paid" : newAmountPaid > 0 ? "Partial" : "Pending";
    const lastEntry = newEntries[newEntries.length - 1];
    upsertPayment.mutate({
      tenantId: deletePaymentTenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: newStatus,
      paymentDate: lastEntry?.date || undefined,
      amount: deletePaymentTenant.monthlyRent,
      amountPaid: newAmountPaid,
      paymentEntries: newEntries,
    });

    setDeletePaymentTenant(null);
  };
  const exportToExcel = async () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const allTenants = rooms.flatMap((room) =>
      room.tenants.map((tenant) => ({
        ...tenant,
        roomNo: room.roomNo,
      })),
    );

    const excelData = allTenants.map((tenant) => {
      // Compute status across all months
      const isActiveNow = !tenant.endDate;
      const endLabel = tenant.endDate ? format(parseDateOnly(tenant.endDate), "dd-MMM-yyyy") : "Active";

      const row: Record<string, string | number> = {
        "Tenant Name": tenant.name,
        "Room No": tenant.roomNo,
        "Status": isActiveNow ? "Active" : "Checked Out",
        "Join Date": tenant.startDate ? format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy") : "",
        "End Date": endLabel,
        "Phone": tenant.phone,
        "Monthly Rent (₹)": tenant.monthlyRent,
        "Security Deposit (₹)": tenant.securityDepositAmount || 0,
        "Deposit Mode": tenant.securityDepositMode || "",
      };

      let yearTotalPaid = 0;
      let yearTotalPending = 0;

      months.forEach((month) => {
        const payment = payments.find(
          (p) => p.tenantId === tenant.id && p.month === month.value && p.year === selectedYear,
        );

        if (payment) {
          const mode = payment.paymentEntries?.length
            ? payment.paymentEntries.map(e => e.mode?.toUpperCase()).filter(Boolean).join('+')
            : '';
          const dateStr = payment.paymentDate
            ? format(new Date(payment.paymentDate), "dd-MMM")
            : '';

          if (payment.paymentStatus === "Paid") {
            row[month.label] = `Paid ₹${payment.amountPaid.toLocaleString()}${mode ? ` (${mode})` : ''}${dateStr ? ` · ${dateStr}` : ''}`;
            yearTotalPaid += payment.amountPaid;
          } else if (payment.paymentStatus === "Partial") {
            const remaining = Math.max(0, payment.amount - payment.amountPaid);
            row[month.label] = `Partial ₹${payment.amountPaid.toLocaleString()} / ₹${payment.amount.toLocaleString()}${mode ? ` (${mode})` : ''}`;
            yearTotalPaid += payment.amountPaid;
            yearTotalPending += remaining;
          } else {
            row[month.label] = `Pending ₹${payment.amount.toLocaleString()}`;
            yearTotalPending += payment.amount;
          }
        } else {
          row[month.label] = "-";
        }
      });

      row["Total Paid (Year) ₹"] = yearTotalPaid;
      row["Total Pending (Year) ₹"] = yearTotalPending;

      return row;
    });

    // Summary totals row
    const summaryRow: Record<string, string | number> = {
      "Tenant Name": "─── TOTALS ───",
      "Room No": "",
      "Status": "",
      "Join Date": "",
      "End Date": "",
      "Phone": "",
      "Monthly Rent (₹)": allTenants.reduce((s, t) => s + t.monthlyRent, 0),
      "Security Deposit (₹)": "",
      "Deposit Mode": "",
    };
    months.forEach((month) => {
      const monthPaid = allTenants.reduce((s, tenant) => {
        const p = payments.find(pp => pp.tenantId === tenant.id && pp.month === month.value && pp.year === selectedYear);
        return s + (p?.amountPaid || 0);
      }, 0);
      summaryRow[month.label] = monthPaid > 0 ? `₹${monthPaid.toLocaleString()}` : "₹0";
    });
    summaryRow["Total Paid (Year) ₹"] = allTenants.reduce((s, tenant) => {
      return s + payments.filter(p => p.tenantId === tenant.id && p.year === selectedYear).reduce((ps, p) => ps + (p.amountPaid || 0), 0);
    }, 0);
    summaryRow["Total Pending (Year) ₹"] = "";
    excelData.push(summaryRow);

    const baseColWidths = [
      { wch: 22 }, // Tenant Name
      { wch: 10 }, // Room No
      { wch: 12 }, // Status
      { wch: 15 }, // Join Date
      { wch: 15 }, // End Date
      { wch: 14 }, // Phone
      { wch: 18 }, // Monthly Rent
      { wch: 18 }, // Security Deposit
      { wch: 14 }, // Deposit Mode
    ];
    const statusCols: number[] = [];
    const colWidths = [...baseColWidths];
    months.forEach((_, i) => {
      colWidths.push({ wch: 30 });
      statusCols.push(9 + i);
    });
    colWidths.push({ wch: 20 }, { wch: 20 }); // year totals

    const wb = applyStyledExport(excelData, `Rent ${selectedYear}`, colWidths, {
      statusColumns: statusCols,
      currencyColumns: [6, 7],
      fileName: `Rent_Ledger_${selectedYear}.xlsx`,
    });

    try {
      await saveAndShareExcel(wb, `Rent_Ledger_${selectedYear}.xlsx`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };
  return (
    <div className="space-y-4 px-0 pb-20">
      {/* Header Row */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground">Rent Sheet</h2>
        </div>
        <div className="flex gap-1.5 items-center">
          {/* Edit Mode Toggle */}
          <div className="flex items-center gap-1.5 mr-1 bg-muted/50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-border">
            <label htmlFor="edit-mode" className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap cursor-pointer select-none">
              Edit Mode
            </label>
            <Switch
              id="edit-mode"
              checked={editModeEnabled}
              onCheckedChange={setEditModeEnabled}
              className="data-[state=checked]:bg-destructive scale-75 origin-right"
            />
          </div>
          <Button
            onClick={() => setBulkReminderOpen(true)}
            variant="outline"
            size="icon"
            title="Bulk WhatsApp Reminders"
            className="text-cash hover:text-cash hover:bg-cash-muted h-8 w-8 shrink-0"
          >
            <Users className="h-4 w-4" />
          </Button>
          <Button onClick={() => setHistoryOpen(true)} variant="outline" size="icon" title="Payment History" className="h-8 w-8 shrink-0">
            <History className="h-4 w-4" />
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="icon" title="Export Excel" className="h-8 w-8 shrink-0">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
          {/* Room quick-nav — tap a room number to jump to its tenant card */}
          <div className="mb-3 space-y-1.5">
            <RoomQuickNav
              rooms={rooms}
              payments={payments}
              month={selectedMonth}
              year={selectedYear}
              onSelect={(roomNo) => {
                setSearchQuery(roomNo);
                setTimeout(() => {
                  const el = document.querySelector(`[data-room-no="${roomNo}"]`);
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 50);
              }}
            />
          </div>


          {/* Search Bar */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant name or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            {filteredTenants.length === 0 && (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">
                  {searchQuery.trim() ? "No matching tenants" : "No tenants for this month"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {searchQuery.trim()
                    ? "Clear the search or choose another room number."
                    : "Add tenants in Rooms, or change the selected month."}
                </div>
                {searchQuery.trim() && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                )}
              </div>
            )}
            {filteredTenants.map((tenant) => {
              const isPartial = tenant.paymentCategory === "partial";
              // Use pro-rata effective rent if applicable
              const targetRent =
                tenant.isProRata && tenant.effectiveRent !== undefined ? tenant.effectiveRent : tenant.monthlyRent;
              const remaining = isPartial ? Math.max(0, targetRent - (tenant.payment.amountPaid || 0)) : 0;
              const bgClass =
                tenant.paymentCategory === "paid"
                  ? "bg-paid-muted border-l-4 border-paid"
                  : tenant.paymentCategory === "partial"
                    ? "bg-partial-muted border-l-4 border-partial"
                    : tenant.paymentCategory === "overdue"
                      ? "bg-overdue-muted border-l-4 border-overdue"
                      : tenant.paymentCategory === "advance-not-paid"
                        ? "bg-advance-not-paid-muted border-l-4 border-advance-not-paid"
                        : "bg-not-due-muted border-l-4 border-not-due";
              const statusLabel =
                tenant.paymentCategory === "paid"
                  ? "Paid"
                  : tenant.paymentCategory === "partial"
                    ? "Due"
                    : tenant.paymentCategory === "overdue"
                      ? "Overdue"
                      : tenant.paymentCategory === "advance-not-paid"
                        ? "Advance Due"
                        : "Pending";
              const whatsappSent = (tenant.payment as PaymentDisplayExtras).whatsappSent;
              const handleResendReceipt = () => {
                const lastEntry = tenant.payment.paymentEntries?.[tenant.payment.paymentEntries.length - 1];
                const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                const sharingType = room ? `${room.capacity} Sharing` : "N/A";
                setReceiptData({
                  tenantName: tenant.name,
                  tenantPhone: tenant.phone,
                  paymentMode: lastEntry?.mode || "cash",
                  paymentDate: lastEntry?.date
                    ? format(new Date(lastEntry.date), "dd-MMM-yyyy")
                    : format(new Date(), "dd-MMM-yyyy"),
                  joiningDate: tenant.startDate ? format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy") : "",
                  forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                  roomNo: tenant.roomNo,
                  sharingType: sharingType,
                  amount: tenant.monthlyRent,
                  amountPaid: tenant.payment.amountPaid || tenant.monthlyRent,
                  isFullPayment: tenant.payment.paymentStatus === "Paid",
                  remainingBalance: isPartial ? remaining : 0,
                  tenantId: tenant.id,
                  paymentEntries: tenant.payment.paymentEntries as PaymentEntry[],
                });
                setTimeout(() => {
                  setWhatsappDialogOpen(true);
                }, 100);
              };
              const openPaymentReminder = () => {
                const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                const sharingType = room ? `${room.capacity} Sharing` : "N/A";
                const amountPaid = tenant.payment.amountPaid || 0;
                const balance = targetRent - amountPaid;
                let acSurcharge: { 
                  units: number; 
                  unitPrice: number; 
                  share: number; 
                  startReading?: number | null; 
                  endReading?: number | null; 
                  splitType?: string; 
                  splitCount?: number | null; 
                  overdueMonths?: { monthLabel: string; share: number }[] 
                } | undefined;
                let acBill: any | undefined;

                if (room?.isAc) {
                  const reading = acByRoom.get(room.id);
                  const units = reading?.units ?? 0;
                  const unitPrice = reading?.unit_price ?? currentPG?.electricityUnitPrice ?? 12;
                  const startReading = reading?.start_reading ?? null;
                  const endReading = reading?.end_reading ?? null;
                  const splitType = reading?.split_type || 'active_tenants';
                  const splitCount = reading?.split_count ?? null;
                  const isCustom = localStorage.getItem(`ac_bill_mode_${room.id}`) === "custom" || splitType === "custom";

                  const activeTenants = room.tenants.filter((roomTenant) =>
                    isTenantActiveInMonth(roomTenant.startDate, roomTenant.endDate, selectedYear, selectedMonth),
                  );
                  const apBill = calculateAPCommercialBill(units);
                  const totalAmount = isCustom ? units * unitPrice : apBill.totalBill;
                  const tenantShares = calcAcTenantShares(
                    units,
                    unitPrice,
                    activeTenants,
                    selectedYear,
                    selectedMonth,
                    room.capacity,
                    totalAmount,
                    splitType,
                    splitCount ?? undefined
                  );
                  const tenantShare = tenantShares.find((shareItem) => shareItem.name === tenant.name);

                  const currentPayment = payments.find((p) => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear);
                  const isCurrentPaid = currentPayment?.acPaymentStatus === "Paid";
                  const currentShare = isCurrentPaid ? 0 : (tenantShare?.share || 0);

                  const overdueAc = getOverdueAcBills(tenant.id, room, selectedMonth, selectedYear);
                  const overdueAcTotal = overdueAc.reduce((sum, om) => sum + om.share, 0);

                  if (currentShare > 0 || overdueAcTotal > 0) {
                    acSurcharge = {
                      units,
                      unitPrice,
                      share: currentShare,
                      startReading,
                      endReading,
                      splitType,
                      splitCount,
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
                      monthLabel: `${months[selectedMonth - 1].label} ${selectedYear}`,
                      pgName: currentPG?.name,
                      pgLogoUrl: currentPG?.logoUrl,
                      startReading,
                      endReading,
                      splitType,
                      splitCount,
                    };
                  }
                }

                setReminderData({
                  tenantName: tenant.name,
                  tenantPhone: tenant.phone,
                  joiningDate: tenant.startDate ? format(parseDateOnly(tenant.startDate), "dd-MMM-yyyy") : "",
                  forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                  roomNo: tenant.roomNo,
                  sharingType: sharingType,
                  amount: tenant.monthlyRent,
                  amountPaid: amountPaid > 0 ? amountPaid : undefined,
                  balance: balance,
                });
                setTimeout(() => {
                  setReminderDialogOpen(true);
                }, 100);
              };
              return (
                <div key={tenant.id} data-room-no={tenant.roomNo} className={cn("p-3 rounded-xl transition-all duration-200", bgClass)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">
                        {tenant.name}
                      </div>
                      {isSnoozed(tenant.id) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeSnooze.mutate(tenant.id); }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-medium border border-amber-500/30"
                          title="Click to remove snooze"
                        >
                          <CalendarClock className="h-3 w-3" />
                          Promised by {format(new Date(getSnoozedUntil(tenant.id)!), "dd MMM")}
                          <XIcon className="h-2.5 w-2.5 opacity-60" />
                        </button>
                      )}
                      {/* Call badge */}
                      {tenant.phone && tenant.phone !== "••••••••••" && (
                        <a
                          href={`tel:${tenant.phone}`}
                          className="h-6 w-6 flex items-center justify-center rounded-full transition-colors text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          title={`Call ${tenant.name}`}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {/* WhatsApp dropdown menu - shows for paid/partial, or dropdown for others */}
                      {tenant.phone && tenant.phone !== "••••••••••" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className={`h-6 w-6 flex items-center justify-center rounded-full transition-colors ${whatsappSent ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"}`}
                              title={whatsappSent ? "Receipt sent - Click for options" : "WhatsApp options"}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(tenant.payment.paymentStatus === "Paid" ||
                              tenant.payment.paymentStatus === "Partial") && (
                              <DropdownMenuItem 
                                onClick={handleResendReceipt}
                                className="gap-2"
                              >
                                <Receipt className="h-4 w-4" />
                                Generate Receipt
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                const phone = tenant.phone.replace(/\D/g, "");
                                window.location.href = `https://wa.me/${phone}`;
                              }}
                              className="gap-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Chat with Tenant
                            </DropdownMenuItem>
                            {tenant.payment.paymentStatus !== "Paid" && (
                              <DropdownMenuItem 
                                onClick={openPaymentReminder}
                                className="gap-2"
                              >
                                <Bell className="h-4 w-4" />
                                Payment Reminder
                              </DropdownMenuItem>
                            )}
                            {(!tenant.securityDepositAmount || tenant.securityDepositAmount === 0) && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                                  const event = new CustomEvent("openSecurityDeposit", {
                                    detail: {
                                      tenantId: tenant.id,
                                      tenantName: tenant.name,
                                      tenantPhone: tenant.phone,
                                      roomNo: tenant.roomNo,
                                      roomCapacity: room?.capacity,
                                    },
                                  });
                                  setTimeout(() => window.dispatchEvent(event), 100);
                                }}
                                className="gap-2"
                              >
                                <Wallet className="h-4 w-4" />
                                Security Deposit
                              </DropdownMenuItem>
                            )}
                            {tenant.securityDepositAmount && tenant.securityDepositAmount > 0 && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const event = new CustomEvent("openSecurityDepositReceipt", {
                                    detail: {
                                      tenantId: tenant.id
                                    },
                                  });
                                  setTimeout(() => window.dispatchEvent(event), 100);
                                }}
                                className="gap-2"
                              >
                                <Receipt className="h-4 w-4" />
                                Security Deposit Receipt
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                                setWelcomeData({
                                  tenantName: tenant.name,
                                  tenantPhone: tenant.phone,
                                  joiningDate: tenant.startDate,
                                  roomNo: tenant.roomNo,
                                  sharingType: room ? `${room.capacity} Sharing` : "",
                                  monthlyRent: tenant.monthlyRent,
                                });
                                setTimeout(() => setWelcomeDialogOpen(true), 100);
                              }}
                              className="gap-2"
                            >
                              <PartyPopper className="h-4 w-4" />
                              Welcome
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setTimeout(() => openRulesDialog(tenant.name, tenant.phone), 100);
                              }}
                              className="gap-2"
                            >
                              <BookOpen className="h-4 w-4" />
                              Rules & Regulations
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {isPartial ? (
                      <Badge className="bg-overdue text-overdue-foreground">₹{remaining.toLocaleString()}</Badge>
                    ) : (
                      <div className="font-semibold text-sm">₹{tenant.monthlyRent.toLocaleString()}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">
                      Room {tenant.roomNo}
                    </div>
                    {/* Collected By badges - right of room number */}
                    {tenant.payment.paymentEntries && tenant.payment.paymentEntries.length > 0 && (() => {
                      const uniqueCollectors = [...new Set(tenant.payment.paymentEntries.map(e => e.collectedBy).filter(Boolean))];
                      if (uniqueCollectors.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {uniqueCollectors.map((collector, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                              {getCollectorDisplayName(collector)}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Pro-rata visual indicator for mid-month leavers */}
                  {tenant.isProRata && tenant.daysStayed && tenant.effectiveRent !== undefined && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <button className="w-full text-xs bg-muted/50 rounded px-2 py-1.5 mb-2 flex items-center justify-between hover:bg-muted/70 transition-colors">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">Pro-rata:</span>
                            <span className="font-medium">
                              {tenant.daysStayed} days × ₹{Math.round(tenant.monthlyRent / 30).toLocaleString()}/day = ₹
                              {tenant.effectiveRent.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">▼</span>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mb-2">
                          <StayPeriodIndicator
                            startDate={tenant.startDate}
                            endDate={tenant.endDate}
                            year={selectedYear}
                            month={selectedMonth}
                            daysStayed={tenant.daysStayed}
                            dailyRate={Math.round(tenant.monthlyRent / 30)}
                            effectiveRent={tenant.effectiveRent}
                            paymentEntries={tenant.payment.paymentEntries as PaymentEntry[]}
                            allowCustomStart
                            compact
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {isPartial && (
                    <div className="text-sm font-medium mb-2">
                      <span className="text-paid">Paid: ₹{(tenant.payment.amountPaid || 0).toLocaleString()}</span>
                      <span className="mx-2">•</span>
                      <span className="text-partial">Due: ₹{remaining.toLocaleString()}</span>
                      {tenant.isProRata && tenant.daysStayed && (
                        <span className="text-xs text-muted-foreground ml-2">({tenant.daysStayed} days)</span>
                      )}
                    </div>
                  )}

                  {/* Collected By badges moved to room number row */}

                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">
                        Joined: {format(new Date(tenant.startDate), "dd MMM yyyy")}
                      </div>
                      {/* Display payment entries */}
                      {tenant.payment.paymentEntries && tenant.payment.paymentEntries.length > 0
                        ? tenant.payment.paymentEntries.map((entry, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>
                                {entry.type === "partial"
                                  ? "Partial"
                                  : entry.type === "remaining"
                                    ? "Remaining"
                                    : "Paid"}
                                : ₹{entry.amount.toLocaleString()} on {format(new Date(entry.date), "dd MMM yyyy")}
                              </span>
                              {entry.mode && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === "upi" ? "bg-upi-muted text-upi" : "bg-cash-muted text-cash"}`}
                                >
                                  {entry.mode === "upi" ? "UPI" : "Cash"}
                                </span>
                              )}
                            </div>
                          ))
                        : tenant.payment.paymentDate && (
                            <div className="text-xs text-muted-foreground">
                              Paid on: {format(new Date(tenant.payment.paymentDate), "dd MMM yyyy")}
                            </div>
                          )}
                      {/* Display overpayment notes */}
                      {(tenant.payment as PaymentDisplayExtras).notes && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                          📝 {(tenant.payment as PaymentDisplayExtras).notes}
                        </div>
                      )}
                    </div>
                    {isPartial ? (
                      <Button
                        onClick={() => handlePayRemaining(tenant.id)}
                        size="sm"
                        className="text-xs h-7 px-3 bg-foreground text-background hover:bg-foreground/90"
                      >
                        Pay
                      </Button>
                    ) : (
                      <Button
                        variant={tenant.payment.paymentStatus === "Paid" ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7 px-3"
                        disabled={tenant.payment.paymentStatus === "Paid" && !editModeEnabled}
                        onClick={() => handlePaymentToggle(tenant.id, tenant.name, tenant.payment.paymentStatus)}
                      >
                        {tenant.payment.paymentStatus === "Paid"
                          ? (editModeEnabled ? "Undo Paid" : "Paid")
                          : "Mark Paid"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* Payment Amount Sheet */}
      <Sheet open={!!paymentAmountTenant} onOpenChange={(open) => !open && setPaymentAmountTenant(null)}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-lg p-0"}
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setPaymentAmountTenant(null)} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col text-left">
                  <SheetTitle className="text-base text-foreground font-bold">Enter Payment Amount</SheetTitle>
                  <p className="text-xs text-muted-foreground">Enter the amount received and select date.</p>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Amount (₹)</Label>
                  {paymentAmountTenant && (() => {
                    const tenant = tenantsWithPayments.find((t) => t.id === paymentAmountTenant);
                    if (!tenant) return null;
                    return (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant={paymentAmount === tenant.monthlyRent ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => { setPaymentAmount(tenant.monthlyRent); setOverpaymentReason(""); }}
                        >
                          Full Rent
                        </Button>
                        <Button
                          type="button"
                          variant={paymentAmount !== tenant.monthlyRent && paymentAmount > 0 ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => { setPaymentAmount(0); setOverpaymentReason(""); }}
                        >
                          Custom / Luggage
                        </Button>
                      </div>
                    );
                  })()}
                </div>
                <Input
                  type="number"
                  value={paymentAmount || ""}
                  onChange={(e) => {
                    setPaymentAmount(parseInt(e.target.value) || 0);
                    setOverpaymentReason("");
                  }}
                  className="mt-2"
                  placeholder="Enter custom amount"
                />
                {paymentAmountTenant &&
                  (() => {
                    const tenant = tenantsWithPayments.find((t) => t.id === paymentAmountTenant);
                    if (tenant) {
                      if (paymentAmount < tenant.monthlyRent && paymentAmount > 0) {
                        return (
                          <p className="text-sm text-partial mt-2">
                            Partial payment. Remaining: ₹
                            {(tenant.monthlyRent - paymentAmount).toLocaleString()}
                          </p>
                        );
                      } else if (paymentAmount > tenant.monthlyRent) {
                        const extra = paymentAmount - tenant.monthlyRent;
                        return (
                          <div className="mt-2 space-y-2">
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              Extra payment: ₹{extra.toLocaleString()} above rent of ₹
                              {tenant.monthlyRent.toLocaleString()}
                            </p>
                            <div>
                              <Label className="text-sm">Reason for extra amount *</Label>
                              <Input
                                type="text"
                                value={overpaymentReason}
                                onChange={(e) => {
                                  setOverpaymentReason(e.target.value);
                                  setOverpaymentError(false);
                                }}
                                placeholder="e.g., Advance, Electricity, Next month"
                                className={cn("mt-1", overpaymentError && "border-destructive")}
                              />
                              {overpaymentError && (
                                <p className="text-sm text-destructive mt-1">Reason is required for extra payment</p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}
              </div>

              <div>
                <Label>Payment Mode</Label>
                <div className="flex items-center justify-between mt-2 mb-2">
                  <span className="text-xs text-muted-foreground">
                    {splitMode ? `Split total: ₹${(upiAmount + cashAmount).toLocaleString()}` : "Single mode"}
                  </span>
                  <Button
                    type="button" size="sm" variant={splitMode ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => {
                      const next = !splitMode;
                      setSplitMode(next);
                      if (next) { setUpiAmount(paymentAmount); setCashAmount(0); }
                      else { setPaymentAmount(upiAmount + cashAmount || paymentAmount); }
                    }}
                  >
                    {splitMode ? "Single mode" : "Split UPI + Cash"}
                  </Button>
                </div>
                {splitMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">UPI ₹</Label>
                      <Input type="number" value={upiAmount || ""}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          setUpiAmount(v); setPaymentAmount(v + cashAmount);
                        }} />
                    </div>
                    <div>
                      <Label className="text-xs">Cash ₹</Label>
                      <Input type="number" value={cashAmount || ""}
                        onChange={(e) => {
                          const v = parseInt(e.target.value) || 0;
                          setCashAmount(v); setPaymentAmount(upiAmount + v);
                        }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={paymentMode === "upi" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPaymentMode("upi")}
                    >
                      UPI/Online
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMode === "cash" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setPaymentMode("cash")}
                    >
                      Cash
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label>Collected By</Label>
                <div className="flex gap-2 mt-2">
                  {collectors.map((collector) => (
                    <Button
                      key={collector.id}
                      type="button"
                      variant={collectedBy === collector.id ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setCollectedBy(collector.id)}
                    >
                      {collector.displayName}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Payment Date</Label>
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  className={cn("rounded-md border mt-2 pointer-events-auto w-full flex justify-center")}
                />
              </div>

              <div className="flex gap-2 pt-4 pb-2 border-t mt-4 shrink-0">
                <Button variant="outline" className="flex-1" onClick={() => setPaymentAmountTenant(null)}>Cancel</Button>
                <Button className="flex-1" onClick={confirmPaymentAmount} disabled={paymentAmount <= 0}>
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pay Remaining Dialog */}
      <Sheet open={!!payRemainingTenant} onOpenChange={(open) => !open && setPayRemainingTenant(null)}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-lg p-0"}
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setPayRemainingTenant(null)} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col text-left">
                  <SheetTitle className="text-base text-foreground font-bold">Pay Remaining Amount</SheetTitle>
                  <p className="text-xs text-muted-foreground">Enter amount and select payment date.</p>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={payRemainingAmount || ""}
                  onChange={(e) => setPayRemainingAmount(parseInt(e.target.value) || 0)}
                  className="mt-2"
                />
                {payRemainingTenant &&
                  (() => {
                    const tenant = tenantsWithPayments.find((t) => t.id === payRemainingTenant);
                    if (tenant) {
                      // Use pro-rata effective rent if applicable
                      const targetRent =
                        tenant.isProRata && tenant.effectiveRent !== undefined
                          ? tenant.effectiveRent
                          : tenant.monthlyRent;
                      const remaining = targetRent - (tenant.payment.amountPaid || 0);
                      const newTotal = (tenant.payment.amountPaid || 0) + payRemainingAmount;

                      // Show pro-rata info if applicable
                      if (tenant.isProRata && tenant.daysStayed) {
                        return (
                          <div className="mt-2 space-y-2">
                            {/* Visual Stay Period Calendar */}
                            <StayPeriodIndicator
                              startDate={tenant.startDate}
                              endDate={tenant.endDate}
                              year={selectedYear}
                              month={selectedMonth}
                              daysStayed={tenant.daysStayed}
                              dailyRate={Math.round(tenant.monthlyRent / 30)}
                              effectiveRent={targetRent}
                              paymentEntries={tenant.payment.paymentEntries as PaymentEntry[]}
                              allowCustomStart
                            />
                            {payRemainingAmount < remaining && (
                              <p className="text-sm text-partial">
                                Partial payment. Total paid: ₹{newTotal.toLocaleString()} • Still due: ₹
                                {(targetRent - newTotal).toLocaleString()}
                              </p>
                            )}
                          </div>
                        );
                      }

                      if (payRemainingAmount < remaining) {
                        return (
                          <p className="text-sm text-partial mt-2">
                            Partial payment. Total paid: ₹{newTotal.toLocaleString()} • Still due: ₹
                            {(targetRent - newTotal).toLocaleString()}
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
              </div>

              {/* Discount and Extra Amount boxes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Discount (₹)</Label>
                  <Input
                    type="number"
                    value={payRemainingDiscount || ""}
                    onChange={(e) => setPayRemainingDiscount(parseInt(e.target.value) || 0)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Extra Amount (₹)</Label>
                  <Input
                    type="number"
                    value={payRemainingExtra || ""}
                    onChange={(e) => setPayRemainingExtra(parseInt(e.target.value) || 0)}
                    className="mt-1"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Show final calculation */}
              {(payRemainingDiscount > 0 || payRemainingExtra > 0) && (
                <div className="p-2 bg-muted rounded text-xs">
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span>₹{payRemainingAmount.toLocaleString()}</span>
                  </div>
                  {payRemainingDiscount > 0 && (
                    <div className="flex justify-between text-paid">
                      <span>Discount:</span>
                      <span>-₹{payRemainingDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {payRemainingExtra > 0 && (
                    <div className="flex justify-between text-pending">
                      <span>Extra:</span>
                      <span>+₹{payRemainingExtra.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                    <span>Final Amount:</span>
                    <span>₹{(payRemainingAmount - payRemainingDiscount + payRemainingExtra).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div>
                <Label>Payment Mode</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={remainingPaymentMode === "upi" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRemainingPaymentMode("upi")}
                  >
                    UPI/Online
                  </Button>
                  <Button
                    type="button"
                    variant={remainingPaymentMode === "cash" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setRemainingPaymentMode("cash")}
                  >
                    Cash
                  </Button>
                </div>
              </div>

              <div>
                <Label>Collected By</Label>
                <div className="flex gap-2 mt-2">
                  {collectors.map((collector) => (
                    <Button
                      key={collector.id}
                      type="button"
                      variant={remainingCollectedBy === collector.id ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setRemainingCollectedBy(collector.id)}
                    >
                      {collector.displayName}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Payment Date</Label>
                <Calendar
                  mode="single"
                  selected={payRemainingDate}
                  onSelect={(date) => date && setPayRemainingDate(date)}
                  className={cn("rounded-md border mt-2 pointer-events-auto w-full flex justify-center")}
                />
              </div>

              <div className="flex gap-2 pt-4 pb-2 border-t mt-4 shrink-0">
                <Button variant="outline" className="flex-1" onClick={() => setPayRemainingTenant(null)}>Cancel</Button>
                <Button className="flex-1" onClick={confirmPayRemaining} disabled={payRemainingAmount <= 0}>
                  Confirm Payment
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Payment Dialog */}
      <DeletePaymentDialog
        open={!!deletePaymentTenant}
        onOpenChange={(open) => !open && setDeletePaymentTenant(null)}
        tenantName={deletePaymentTenant?.name || ""}
        monthlyRent={deletePaymentTenant?.monthlyRent || 0}
        paymentEntries={deletePaymentTenant?.paymentEntries || []}
        onConfirmDelete={handleDeletePayments}
      />

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

      {/* Previous Month Overdue Sheet */}
      <PreviousOverdueSheet open={previousOverdueOpen} onOpenChange={setPreviousOverdueOpen} />

      {/* AC Electricity Sheet */}
      <ACElectricitySheet
        open={acSheetOpen}
        onOpenChange={(open) => {
          setAcSheetOpen(open);
          if (!open && openedFromDashboardRef.current) {
            openedFromDashboardRef.current = false;
            const newParams = new URLSearchParams(searchParams);
            newParams.set("tab", "dashboard");
            setSearchParams(newParams);
          }
        }}
        acRooms={acRooms}
        acMonth={acMonth}
        acYear={acYear}
        setAcMonth={setAcMonth}
        setAcYear={setAcYear}
        setReading={setReading}
        customModeRooms={customModeRooms}
        setCustomModeRooms={setCustomModeRooms}
        onShare={(item, units, unitPrice, startReading, endReading, splitType, splitCount, targetTenantName) => {
          handleShareAC(
            item,
            units,
            unitPrice,
            startReading,
            endReading,
            splitType,
            splitCount,
            targetTenantName
          );
        }}
        onTogglePaymentStatus={handleToggleAcPaymentStatus}
        months={months}
        years={years}
      />

      {/* Payment History Sheet */}
      <PaymentHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* Bulk Reminder Dialog */}
      <BulkReminderDialog open={bulkReminderOpen} onOpenChange={setBulkReminderOpen} rooms={rooms} />

      {/* Left Tenants Cleanup Sheet */}
      <LeftTenantsCleanupSheet open={cleanupSheetOpen} onOpenChange={setCleanupSheetOpen} rooms={rooms} />

      {/* Welcome Dialog */}
      <WelcomeDialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen} welcomeData={welcomeData} />
      <RulesShareDialog open={rulesDialogOpen} onOpenChange={setRulesDialogOpen} shareData={rulesShareData} />
      
      {acPaymentRecord && (
        <AlertDialog open={acPaymentRecord !== null} onOpenChange={(open) => !open && setAcPaymentRecord(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Record AC Bill Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Record AC electricity bill payment for <span className="font-semibold text-foreground">{acPaymentRecord.tenantName}</span> (Room {acPaymentRecord.roomNo}).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={acPaymentRecord.amount}
                  disabled
                  className="rounded-xl text-lg h-11 bg-muted text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={acPaymentModeState === "upi" ? "default" : "outline"}
                    className="flex-1 rounded-xl h-11"
                    onClick={() => setAcPaymentModeState("upi")}
                  >
                    UPI
                  </Button>
                  <Button
                    type="button"
                    variant={acPaymentModeState === "cash" ? "default" : "outline"}
                    className="flex-1 rounded-xl h-11"
                    onClick={() => setAcPaymentModeState("cash")}
                  >
                    Cash
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Calendar
                  mode="single"
                  selected={acPaymentDateState}
                  onSelect={(date) => date && setAcPaymentDateState(date)}
                  className="rounded-xl border mt-2 pointer-events-auto flex justify-center"
                />
              </div>

              <div className="space-y-2">
                <Label>Collected By</Label>
                <div className="flex gap-2">
                  {collectors.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={acPaymentCollectedBy === c.id ? "default" : "outline"}
                      className="flex-1 h-10 rounded-xl"
                      onClick={() => setAcPaymentCollectedBy(c.id)}
                    >
                      {c.displayName}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" onClick={() => setAcPaymentRecord(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5"
                onClick={handleConfirmAcPayment}
              >
                Confirm Payment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {acShareData && (
        <div
          id="rent-ac-bill-template-host"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            transform: "translateX(-200vw)",
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          <ACBillTemplate data={acShareData} />
        </div>
      )}
    </div>
  );
};

export const RentACRoomCard = ({
  roomNo,
  tenantCount,
  sharingCount,
  units,
  unitPrice,
  total,
  tenantShares,
  isCustom,
  startReading,
  endReading,
  splitType,
  splitCount,
  onModeToggle,
  onSaveReading,
  onShare,
  onTogglePaymentStatus,
}: {
  roomNo: string;
  tenantCount: number;
  sharingCount: number;
  units: number;
  unitPrice: number;
  total: number;
  tenantShares: { 
    name: string; 
    daysStayed: number; 
    share: number;
    id?: string;
    acPaymentStatus?: 'Paid' | 'Pending';
    overdueAc?: { monthLabel: string; share: number }[];
    overdueAcTotal?: number;
  }[];
  isCustom: boolean;
  startReading: number | null;
  endReading: number | null;
  splitType: string;
  splitCount: number | null;
  onModeToggle: (isCustom: boolean) => void;
  onSaveReading: (
    units: number,
    unitPrice: number,
    startReading: number | null,
    endReading: number | null,
    splitType: string,
    splitCount: number | null
  ) => void;
  onShare: (
    units: number,
    unitPrice: number,
    startReading: number | null,
    endReading: number | null,
    splitType: string,
    splitCount: number | null,
    targetTenantName?: string
  ) => void;
  onTogglePaymentStatus?: (tenantId: string, currentStatus: 'Paid' | 'Pending') => void;
}) => {
  const [startReadingDraft, setStartReadingDraft] = useState(startReading !== null ? String(startReading) : "");
  const [endReadingDraft, setEndReadingDraft] = useState(endReading !== null ? String(endReading) : "");
  const [unitsDraft, setUnitsDraft] = useState(String(units ?? 0));
  const [priceDraft, setPriceDraft] = useState(String(unitPrice ?? 12));
  const [selectedSplitType, setSelectedSplitType] = useState(splitType || "active_tenants");
  const [splitCountDraft, setSplitCountDraft] = useState(splitCount !== null ? String(splitCount) : "");

  useEffect(() => {
    setStartReadingDraft(startReading !== null ? String(startReading) : "");
  }, [startReading]);

  useEffect(() => {
    setEndReadingDraft(endReading !== null ? String(endReading) : "");
  }, [endReading]);

  useEffect(() => {
    setUnitsDraft(String(units ?? 0));
  }, [units]);

  useEffect(() => {
    setPriceDraft(String(unitPrice ?? 12));
  }, [unitPrice]);

  useEffect(() => {
    setSelectedSplitType(splitType || "active_tenants");
  }, [splitType]);

  useEffect(() => {
    setSplitCountDraft(splitCount !== null ? String(splitCount) : "");
  }, [splitCount]);

  const draftUnits = parseInt(unitsDraft) || 0;
  const draftUnitPrice = parseInt(priceDraft) || 0;
  const startVal = startReadingDraft === "" ? null : parseInt(startReadingDraft);
  const endVal = endReadingDraft === "" ? null : parseInt(endReadingDraft);
  const draftSplitCount = splitCountDraft === "" ? null : parseInt(splitCountDraft);

  const apBill = calculateAPCommercialBill(draftUnits);
  const draftTotal = selectedSplitType === "custom" && draftSplitCount && draftSplitCount > 0
    ? draftUnits * draftUnitPrice
    : isCustom
      ? draftUnits * draftUnitPrice
      : apBill.totalBill;

  // Day wise shares scaling
  const dayWiseShares = draftTotal > 0
    ? tenantShares.map((tenant) => ({
        ...tenant,
        share: total > 0 ? Math.round((draftTotal * tenant.share) / total) : tenant.share,
      }))
    : tenantShares;

  const customShare = selectedSplitType === "custom" && draftSplitCount && draftSplitCount > 0
    ? Math.round(draftTotal / draftSplitCount)
    : 0;

  const shareValues = dayWiseShares.map((tenant) => tenant.share).filter((share) => share > 0);
  const minShare = shareValues.length ? Math.min(...shareValues) : 0;
  const maxShare = shareValues.length ? Math.max(...shareValues) : 0;

  let shareLabel = "";
  if (selectedSplitType === "custom" && customShare > 0) {
    shareLabel = `₹${customShare.toLocaleString()} each`;
  } else if (selectedSplitType === "capacity") {
    const activeShare = minShare === maxShare
      ? `₹${minShare.toLocaleString()}`
      : `₹${minShare.toLocaleString()} - ₹${maxShare.toLocaleString()}`;
    shareLabel = `${activeShare} (Vacancy absorbed)`;
  } else {
    shareLabel = minShare === maxShare
      ? `₹${minShare.toLocaleString()}`
      : `₹${minShare.toLocaleString()} - ₹${maxShare.toLocaleString()}`;
  }

  const triggerSave = (
    newUnits: number,
    newPrice: number,
    newStart: number | null,
    newEnd: number | null,
    newSplit: string,
    newSplitCnt: number | null
  ) => {
    onSaveReading(newUnits, newPrice, newStart, newEnd, newSplit, newSplitCnt);
  };

  const handleStartBlur = () => {
    const s = startReadingDraft === "" ? null : parseInt(startReadingDraft);
    const e = endReadingDraft === "" ? null : parseInt(endReadingDraft);
    let u = parseInt(unitsDraft) || 0;
    if (s !== null && e !== null) {
      u = Math.max(0, e - s);
      setUnitsDraft(String(u));
    }
    triggerSave(u, parseInt(priceDraft) || 0, s, e, selectedSplitType, draftSplitCount);
  };

  const handleEndBlur = () => {
    const s = startReadingDraft === "" ? null : parseInt(startReadingDraft);
    const e = endReadingDraft === "" ? null : parseInt(endReadingDraft);
    let u = parseInt(unitsDraft) || 0;
    if (s !== null && e !== null) {
      u = Math.max(0, e - s);
      setUnitsDraft(String(u));
    }
    triggerSave(u, parseInt(priceDraft) || 0, s, e, selectedSplitType, draftSplitCount);
  };

  const handleUnitsBlur = () => {
    const u = parseInt(unitsDraft) || 0;
    triggerSave(u, parseInt(priceDraft) || 0, startVal, endVal, selectedSplitType, draftSplitCount);
  };

  const handlePriceBlur = () => {
    triggerSave(draftUnits, parseInt(priceDraft) || 0, startVal, endVal, selectedSplitType, draftSplitCount);
  };

  const handleSplitTypeChange = (type: string) => {
    setSelectedSplitType(type);
    let sCount = draftSplitCount;
    if (type === 'custom' && !sCount) {
      sCount = tenantCount || sharingCount;
      setSplitCountDraft(String(sCount));
    }
    triggerSave(draftUnits, draftUnitPrice, startVal, endVal, type, sCount);
  };

  const handleSplitCountBlur = () => {
    const sCount = splitCountDraft === "" ? null : parseInt(splitCountDraft);
    triggerSave(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, sCount);
  };

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-background p-3">
      {/* Title & Share button */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Snowflake className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-300" />
            <span className="truncate text-sm font-semibold">Room {roomNo}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {sharingCount} sharing · {tenantCount} tenant{tenantCount === 1 ? "" : "s"} this month
          </div>
          <div className="flex items-center space-x-2 mt-1.5">
            <input
              type="checkbox"
              id={`ac-mode-${roomNo}`}
              checked={isCustom}
              onChange={(e) => onModeToggle(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500 dark:border-cyan-800 dark:bg-slate-900"
            />
            <label htmlFor={`ac-mode-${roomNo}`} className="text-[11px] text-muted-foreground cursor-pointer select-none">
              Use flat rate (₹{draftUnitPrice}/unit)
            </label>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0 text-xs"
            >
              <Send className="mr-1 h-3 w-3" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem
              onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount)}
              className="cursor-pointer"
            >
              Share Room Bill (All)
            </DropdownMenuItem>
            {dayWiseShares.length > 0 && <DropdownMenuSeparator />}
            {dayWiseShares.map((tenant) => {
              const isPaid = tenant.acPaymentStatus === "Paid";
              return (
                <DropdownMenuItem
                  key={tenant.name}
                  onClick={() => onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount, tenant.name)}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <span className="truncate flex items-center gap-1">
                    {isPaid ? "🧾" : "⚡"} {isPaid ? "Share Receipt with" : "Share Bill with"} {tenant.name.split(" ")[0]}
                  </span>
                  <span className="font-semibold text-[10px] text-muted-foreground ml-2">₹{tenant.share.toLocaleString()}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grid of inputs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-2">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Prev Reading</Label>
          <Input
            type="number"
            value={startReadingDraft}
            onChange={(event) => setStartReadingDraft(event.target.value)}
            onBlur={handleStartBlur}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder="Start"
            className="h-8 text-xs px-2"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Curr Reading</Label>
          <Input
            type="number"
            value={endReadingDraft}
            onChange={(event) => setEndReadingDraft(event.target.value)}
            onBlur={handleEndBlur}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder="End"
            className="h-8 text-xs px-2"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Units Consumed</Label>
          <Input
            type="number"
            value={unitsDraft}
            onChange={(event) => setUnitsDraft(event.target.value)}
            onBlur={handleUnitsBlur}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            placeholder="0"
            className="h-8 text-xs px-2"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">₹/unit</Label>
          <Input
            type="number"
            value={priceDraft}
            onChange={(event) => setPriceDraft(event.target.value)}
            onBlur={handlePriceBlur}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="h-8 text-xs px-2"
          />
        </div>
      </div>

      {/* Split Strategy Selection */}
      <div className="grid grid-cols-2 gap-2 mb-2 items-end">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Split Strategy</Label>
          <select
            value={selectedSplitType}
            onChange={(e) => handleSplitTypeChange(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground w-full cursor-pointer"
          >
            <option value="active_tenants">Split by Active Tenants</option>
            <option value="capacity">Split by Capacity ({sharingCount} sharing)</option>
            <option value="custom">Split Equally (Custom Count)</option>
          </select>
        </div>
        <div>
          {selectedSplitType === "custom" ? (
            <>
              <Label className="text-[10px] uppercase text-muted-foreground">Persons Count</Label>
              <Input
                type="number"
                min="1"
                value={splitCountDraft}
                onChange={(event) => setSplitCountDraft(event.target.value)}
                onBlur={handleSplitCountBlur}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="Count"
                className="h-8 text-xs px-2"
              />
            </>
          ) : (
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Total Bill</Label>
              <div className="flex h-8 items-center text-sm font-bold text-cyan-800 dark:text-cyan-300">
                ₹{draftTotal.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Split Strategy Summary Label */}
      <div className="mt-2 flex items-center justify-between rounded-md bg-cyan-500/5 px-2 py-1.5 text-xs text-muted-foreground">
        <span>
          {selectedSplitType === "custom"
            ? `Custom split by ${draftSplitCount} persons`
            : selectedSplitType === "capacity"
              ? `Split by ${sharingCount} slots (capacity)`
              : `Proportional split by active tenants`}
        </span>
        <span className="font-bold text-cyan-700 dark:text-cyan-300">{shareLabel}</span>
      </div>

      {dayWiseShares.length > 0 && (
        <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2">
          {dayWiseShares.map((tenant) => {
            const isPaid = tenant.acPaymentStatus === "Paid";
            const hasOverdue = tenant.overdueAcTotal > 0;
            
            let cardClass = "";
            let btnClass = "";
            let shareBtnClass = "";
            let textClass = "";
            
            if (isPaid) {
              cardClass = "bg-paid-muted border-paid/20 dark:border-paid/10 text-paid";
              btnClass = "bg-paid text-paid-foreground hover:bg-paid/90 border-none";
              shareBtnClass = "border-paid/30 text-paid hover:bg-paid-muted/80";
              textClass = "text-paid";
            } else if (hasOverdue) {
              cardClass = "bg-overdue-muted border-overdue/25 dark:border-overdue/10 text-overdue";
              btnClass = "border-overdue/35 text-overdue hover:bg-overdue-muted/80 bg-background dark:bg-slate-900";
              shareBtnClass = "border-overdue/35 text-overdue hover:bg-overdue-muted/80";
              textClass = "text-overdue";
            } else {
              cardClass = "bg-not-due-muted border-not-due/25 dark:border-not-due/10 text-not-due";
              btnClass = "border-not-due/35 text-not-due hover:bg-not-due-muted/80 bg-background dark:bg-slate-900";
              shareBtnClass = "border-not-due/35 text-not-due hover:bg-not-due-muted/80";
              textClass = "text-not-due";
            }

            return (
              <div
                key={tenant.name}
                className={cn(
                  "p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-1.5 shadow-sm",
                  cardClass
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="truncate text-xs font-semibold text-foreground/90 block">
                      {tenant.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground/85 block mt-0.5">
                      {tenant.daysStayed} days stayed
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="xs"
                      variant="outline"
                      className={cn("h-6 w-6 p-0 rounded-lg font-medium", shareBtnClass)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onShare(draftUnits, draftUnitPrice, startVal, endVal, selectedSplitType, draftSplitCount, tenant.name);
                      }}
                      title={`Send payment reminder to ${tenant.name}`}
                    >
                      <Send className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant={isPaid ? "default" : "outline"}
                      className={cn("h-6 px-2 text-[10px] font-semibold rounded-lg", btnClass)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tenant.id && onTogglePaymentStatus) {
                          onTogglePaymentStatus(tenant.id, tenant.acPaymentStatus || 'Pending');
                        }
                      }}
                    >
                      {isPaid ? "Paid" : "Mark Paid"}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-border/10">
                  <span className="text-[10px] text-muted-foreground/85">AC Share:</span>
                  <span className={cn("font-bold text-xs", textClass)}>
                    ₹{tenant.share.toLocaleString()}
                    {tenant.overdueAcTotal > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 ml-1 font-bold text-[10px]">
                        + ₹{tenant.overdueAcTotal.toLocaleString()}
                      </span>
                    ) : null}
                  </span>
                </div>
                {tenant.overdueAc && tenant.overdueAc.map((om) => (
                  <div key={om.monthLabel} className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 pl-2">
                    <span>↳ Overdue AC ({om.monthLabel})</span>
                    <span>₹{om.share.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
