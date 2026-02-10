import { useState, useMemo, useEffect } from "react";
import { useBackGesture } from "@/hooks/useBackGesture";
import { useMonthContext } from "@/contexts/MonthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Room, PaymentEntry } from "@/types";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import { WhatsAppReceiptDialog } from "./WhatsAppReceiptDialog";
import { PaymentReminderDialog } from "./PaymentReminderDialog";
import { PreviousOverdueSheet } from "./PreviousOverdueSheet";
import { PreviousMonthOverdueCard } from "./PreviousMonthOverdueCard";
import { PaymentHistorySheet } from "./PaymentHistorySheet";
import { DeletePaymentDialog } from "./DeletePaymentDialog";
import { OverduePaidCard } from "./OverduePaidCard";
import { BulkReminderDialog } from "./BulkReminderDialog";
import { LeftTenantsCleanupSheet } from "./LeftTenantsCleanupSheet";
import { WelcomeDialog } from "./WelcomeDialog";
import { isTenantActiveInMonth } from "@/utils/dateOnly";
import { calculateProRataRent } from "@/utils/proRataRent";
import { MONTHS } from "@/constants/pricing";
import { StayPeriodIndicator } from "./StayPeriodIndicator";
import { useCollectorNames } from "@/hooks/useCollectorNames";
interface MonthlyRentSheetProps {
  rooms: Room[];
}
export const MonthlyRentSheet = ({ rooms }: MonthlyRentSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { collectors, getCollectorDisplayName } = useCollectorNames();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [hideLeftTenants, setHideLeftTenants] = useState(true);
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

  useEffect(() => {
    if (collectors.length === 0) return;
    setCollectedBy((prev) => (collectors.some((c) => c.id === prev) ? prev : defaultCollectorId));
    setRemainingCollectedBy((prev) => (collectors.some((c) => c.id === prev) ? prev : defaultCollectorId));
  }, [collectors, defaultCollectorId]);

  // Handle OS back gesture to close dialogs
  useBackGesture(!!paymentAmountTenant, () => setPaymentAmountTenant(null));
  useBackGesture(!!payRemainingTenant, () => setPayRemainingTenant(null));
  useBackGesture(!!deletePaymentTenant, () => setDeletePaymentTenant(null));
  const { payments, upsertPayment, markWhatsappSent } = useTenantPayments();
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

    // Hide left tenants if toggle is on
    if (hideLeftTenants) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((tenant) => {
        if (!tenant.endDate) return true;
        const endDate = new Date(tenant.endDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate > today;
      });
    }

    if (!searchQuery.trim()) return filtered;
    const query = searchQuery.toLowerCase().trim();
    return filtered.filter(
      (tenant) => tenant.name.toLowerCase().includes(query) || tenant.roomNo.toLowerCase().includes(query),
    );
  }, [tenantsWithPayments, searchQuery, hideLeftTenants]);

  // Count left tenants still in the rent sheet (not locked)
  const leftTenantsCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tenantsWithPayments.filter((tenant) => {
      if (tenant.isLocked) return false;
      if (!tenant.endDate) return false;
      const endDate = new Date(tenant.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Tenant has left if endDate is today or in the past
      return endDate <= today;
    }).length;
  }, [tenantsWithPayments]);
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
  const stats = useMemo(() => {
    // Exclude locked tenants from stats
    const unlockedTenants = tenantsWithPayments.filter((t) => !t.isLocked);
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
  const handlePaymentToggle = (tenantId: string, tenantName: string, currentStatus: "Paid" | "Pending" | "Partial") => {
    if (currentStatus === "Pending") {
      const tenant = tenantsWithPayments.find((t) => t.id === tenantId);
      if (tenant) {
        setPaymentAmountTenant(tenantId);
        setPaymentAmount(tenant.monthlyRent);
        setPaymentDate(new Date());
      }
    } else {
      // For Paid or Partial, only allow delete if edit mode is enabled
      if (!editModeEnabled) {
        return; // Do nothing if edit mode is off
      }
      const tenant = tenantsWithPayments.find((t) => t.id === tenantId);
      if (tenant && tenant.payment.paymentEntries.length > 0) {
        setDeletePaymentTenant({
          id: tenantId,
          name: tenantName,
          monthlyRent: tenant.monthlyRent,
          paymentEntries: tenant.payment.paymentEntries,
        });
      }
    }
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

    // Build new payment entry
    const newEntry = {
      amount: paymentAmount,
      date: formattedDate,
      type: isFullPayment ? ("full" as const) : ("partial" as const),
      mode: paymentMode,
      collectedBy,
    };
    const existingEntries = tenant.payment.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];

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
    toast({
      title: isFullPayment ? "Payment marked as Paid" : "Partial payment recorded",
      description: `₹${paymentAmount.toLocaleString()} paid${isOverpayment ? ` (includes extra ₹${(paymentAmount - tenant.monthlyRent).toLocaleString()})` : !isFullPayment ? ` • ₹${(tenant.monthlyRent - totalPaid).toLocaleString()} remaining` : ""}`,
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
      joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: tenant.roomNo,
      sharingType: sharingType,
      amount: tenant.monthlyRent,
      amountPaid: paymentAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
      tenantId: tenant.id,
      paymentEntries: updatedEntries as any,
      previousMonthPending: prevMonthPending > 0 ? prevMonthPending : undefined,
    });
    setWhatsappDialogOpen(true);
    setPaymentAmountTenant(null);
    setPaymentAmount(0);
    setOverpaymentReason("");
    setCollectedBy(defaultCollectorId);
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
    let notes = (tenant.payment as any).notes || "";
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
    toast({
      title: isFullPayment ? "Payment completed" : "Partial payment recorded",
      description: isFullPayment
        ? `Full payment of ₹${finalAmount.toLocaleString()} recorded${tenant.isProRata ? ` (${tenant.daysStayed} days)` : ""}${payRemainingDiscount > 0 ? ` (Discount: ₹${payRemainingDiscount})` : ""}${payRemainingExtra > 0 ? ` (Extra: ₹${payRemainingExtra})` : ""}`
        : `₹${totalPaid.toLocaleString()} paid • ₹${(adjustedTarget - totalPaid).toLocaleString()} remaining`,
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
      joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: tenant.roomNo,
      sharingType: sharingType,
      amount: tenant.monthlyRent,
      amountPaid: finalAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : adjustedTarget - totalPaid,
      tenantId: tenant.id,
      paymentEntries: updatedEntries as any,
      previousMonthPending: prevMonthPending > 0 ? prevMonthPending : undefined,
    });
    setWhatsappDialogOpen(true);
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
    toast({
      title: `${entriesToDelete.length} payment(s) deleted`,
      description:
        newAmountPaid > 0
          ? `Balance to pay: ₹${(deletePaymentTenant.monthlyRent - newAmountPaid).toLocaleString()}`
          : "Status updated to Pending",
    });
    setDeletePaymentTenant(null);
  };
  const exportToExcel = () => {
    const allTenants = rooms.flatMap((room) =>
      room.tenants.map((tenant) => ({
        ...tenant,
        roomNo: room.roomNo,
      })),
    );
    const excelData = allTenants.map((tenant) => {
      const row: any = {
        Name: tenant.name,
        "Room No": tenant.roomNo,
        "Join Date": format(new Date(tenant.startDate), "dd-MMM-yyyy"),
        Phone: tenant.phone,
        "Monthly Rent": tenant.monthlyRent,
      };
      months.forEach((month) => {
        const payment = payments.find(
          (p) => p.tenantId === tenant.id && p.month === month.value && p.year === selectedYear,
        );
        if (payment) {
          if (payment.paymentStatus === "Partial") {
            row[month.label] = `Partial ₹${payment.amountPaid}`;
          } else if (payment.paymentDate) {
            row[month.label] = format(new Date(payment.paymentDate), "dd-MMM");
          } else {
            row[month.label] = payment.paymentStatus;
          }
        } else {
          row[month.label] = "-";
        }
      });
      return row;
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    const colWidths = [
      {
        wch: 20,
      },
      {
        wch: 10,
      },
      {
        wch: 15,
      },
      {
        wch: 15,
      },
      {
        wch: 12,
      },
    ];
    months.forEach(() =>
      colWidths.push({
        wch: 12,
      }),
    );
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, `Rent ${selectedYear}`);
    XLSX.writeFile(wb, `Rent_Sheet_${selectedYear}.xlsx`);
    toast({
      title: "Excel file exported with full year data",
    });
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 px-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Rent Sheet</CardTitle>
              {leftTenantsCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCleanupSheetOpen(true)}
                  className="h-7 px-2 text-xs text-destructive border-destructive/50 hover:bg-destructive/10 mr-[15px]"
                  title="Left Tenants Cleanup"
                >
                  {leftTenantsCount} left
                </Button>
              )}
            </div>
            <div className="flex gap-1 items-center">
              {/* Edit Mode Toggle */}
              <div className="flex items-center gap-1.5 mr-2">
                <Switch
                  id="edit-mode"
                  checked={editModeEnabled}
                  onCheckedChange={setEditModeEnabled}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
              <Button
                onClick={() => setBulkReminderOpen(true)}
                variant="outline"
                size="icon"
                title="Bulk WhatsApp Reminders"
                className="text-cash hover:text-cash hover:bg-cash-muted"
              >
                <Users className="h-4 w-4" />
              </Button>
              <Button onClick={() => setHistoryOpen(true)} variant="outline" size="icon" title="Payment History">
                <History className="h-4 w-4" />
              </Button>
              <Button onClick={exportToExcel} variant="outline" size="icon" title="Export Excel">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <div className="grid gap-3 md:grid-cols-2 mb-4">
            <div className="p-3 bg-paid-muted rounded-lg">
              <div className="text-2xl font-bold text-paid">₹{stats.totalCollected.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Collected ({stats.paidCount} tenants)</div>
            </div>
            <div className="p-3 bg-pending-muted rounded-lg">
              <div className="text-2xl font-bold text-pending">₹{stats.totalPending.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Pending ({stats.pendingCount} tenants)</div>
            </div>
          </div>

          {/* Previous Month Overdue Card - Interactive */}
          <div className="mb-4">
            <PreviousMonthOverdueCard />
          </div>

          {/* Overdue Paid Card - shows previous month overdue that was paid this month */}
          <OverduePaidCard rooms={rooms} />

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
              const whatsappSent = (tenant.payment as any).whatsappSent;
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
                  joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
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
                setWhatsappDialogOpen(true);
              };
              const openPaymentReminder = () => {
                const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                const sharingType = room ? `${room.capacity} Sharing` : "N/A";
                const amountPaid = tenant.payment.amountPaid || 0;
                const balance = targetRent - amountPaid;
                setReminderData({
                  tenantName: tenant.name,
                  tenantPhone: tenant.phone,
                  joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
                  forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                  roomNo: tenant.roomNo,
                  sharingType: sharingType,
                  amount: tenant.monthlyRent,
                  amountPaid: amountPaid > 0 ? amountPaid : undefined,
                  balance: balance,
                });
                setReminderDialogOpen(true);
              };
              return (
                <div key={tenant.id} className={cn("p-3 rounded-xl transition-all duration-200", bgClass)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">
                        {tenant.isLocked && "🔒 "}
                        {tenant.name}
                      </div>
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
                              className={`h-6 w-6 flex items-center justify-center rounded-full transition-colors ${whatsappSent ? "text-green-600 bg-green-100 dark:bg-green-900/30" : "text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"}`}
                              title={whatsappSent ? "Receipt sent - Click for options" : "WhatsApp options"}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(tenant.payment.paymentStatus === "Paid" ||
                              tenant.payment.paymentStatus === "Partial") && (
                              <DropdownMenuItem onClick={handleResendReceipt} className="gap-2">
                                <Receipt className="h-4 w-4" />
                                Generate Receipt
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => window.open(`https://wa.me/${tenant.phone.replace(/\D/g, "")}`, "_blank")}
                              className="gap-2"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Chat with Tenant
                            </DropdownMenuItem>
                            {tenant.payment.paymentStatus !== "Paid" && (
                              <DropdownMenuItem onClick={openPaymentReminder} className="gap-2">
                                <Bell className="h-4 w-4" />
                                Payment Reminder
                              </DropdownMenuItem>
                            )}
                            {(!tenant.securityDepositAmount || tenant.securityDepositAmount === 0) && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                                  // Dispatch custom event to open security deposit dialog directly
                                  window.dispatchEvent(
                                    new CustomEvent("openSecurityDeposit", {
                                      detail: {
                                        tenantId: tenant.id,
                                        tenantName: tenant.name,
                                        tenantPhone: tenant.phone,
                                        roomNo: tenant.roomNo,
                                        roomCapacity: room?.capacity,
                                      },
                                    }),
                                  );
                                }}
                                className="gap-2"
                              >
                                <Wallet className="h-4 w-4" />
                                Security Deposit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                const room = rooms.find((r) => r.tenants.some((t) => t.id === tenant.id));
                                setWelcomeData({
                                  tenantName: tenant.name,
                                  tenantPhone: tenant.phone,
                                  joiningDate: tenant.startDate,
                                  roomNo: tenant.roomNo,
                                  sharingType: room ? `${room.capacity} Sharing` : "",
                                  monthlyRent: tenant.monthlyRent,
                                });
                                setWelcomeDialogOpen(true);
                              }}
                              className="gap-2"
                            >
                              <PartyPopper className="h-4 w-4" />
                              Welcome
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
                      {tenant.isLocked && <span className="text-destructive ml-1">(Excluded from totals)</span>}
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
                      {(tenant.payment as any).notes && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                          📝 {(tenant.payment as any).notes}
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
                        onClick={() => handlePaymentToggle(tenant.id, tenant.name, tenant.payment.paymentStatus)}
                      >
                        {tenant.payment.paymentStatus === "Paid" ? "Paid" : "Mark Paid"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Amount Dialog */}
      <AlertDialog open={!!paymentAmountTenant} onOpenChange={() => setPaymentAmountTenant(null)}>
        <AlertDialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Payment Amount</AlertDialogTitle>
            <AlertDialogDescription>Enter the amount received and select date.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(parseInt(e.target.value) || 0);
                  // Reset overpayment reason when amount changes
                  setOverpaymentReason("");
                }}
                className="mt-2"
              />
              {paymentAmountTenant &&
                (() => {
                  const tenant = tenantsWithPayments.find((t) => t.id === paymentAmountTenant);
                  if (tenant) {
                    if (paymentAmount < tenant.monthlyRent) {
                      return (
                        <p className="text-sm text-partial mt-2">
                          This will be recorded as a partial payment. Remaining: ₹
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
              <div className="flex gap-2 mt-2">
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
                className={cn("rounded-md border mt-2 pointer-events-auto")}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentAmountTenant(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPaymentAmount} disabled={paymentAmount <= 0}>
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pay Remaining Dialog */}
      <AlertDialog open={!!payRemainingTenant} onOpenChange={() => setPayRemainingTenant(null)}>
        <AlertDialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
          <AlertDialogHeader>
            <AlertDialogTitle>Pay Remaining Amount</AlertDialogTitle>
            <AlertDialogDescription>Enter amount and select payment date.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={payRemainingAmount}
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
                className={cn("rounded-md border mt-2 pointer-events-auto")}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPayRemainingTenant(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPayRemaining} disabled={payRemainingAmount <= 0}>
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Payment History Sheet */}
      <PaymentHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />

      {/* Bulk Reminder Dialog */}
      <BulkReminderDialog open={bulkReminderOpen} onOpenChange={setBulkReminderOpen} rooms={rooms} />

      {/* Left Tenants Cleanup Sheet */}
      <LeftTenantsCleanupSheet open={cleanupSheetOpen} onOpenChange={setCleanupSheetOpen} rooms={rooms} />

      {/* Welcome Dialog */}
      <WelcomeDialog open={welcomeDialogOpen} onOpenChange={setWelcomeDialogOpen} welcomeData={welcomeData} />
    </div>
  );
};
