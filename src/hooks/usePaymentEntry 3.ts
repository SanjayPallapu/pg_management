import { useState } from "react";
import { format } from "date-fns";
import { PaymentEntry, TenantPayment } from "@/types";
import { useTenantPayments } from "./useTenantPayments";
import { useMonthContext } from "@/contexts/MonthContext";
import { toast } from "@/hooks/use-toast";
import { MONTHS } from "@/constants/pricing";

interface UsePaymentEntryOptions {
  onPaymentComplete?: (data: PaymentReceiptData) => void;
}

export interface PaymentReceiptData {
  tenantName: string;
  tenantPhone: string;
  paymentMode: "upi" | "cash";
  paymentDate: string;
  joiningDate: string;
  forMonth: string;
  roomNo: string;
  sharingType: string;
  amount: number;
  amountPaid: number;
  isFullPayment: boolean;
  remainingBalance: number;
  tenantId: string;
  paymentEntries?: PaymentEntry[];
  previousMonthPending?: number;
}

export interface TenantForPayment {
  id: string;
  name: string;
  phone: string;
  startDate: string;
  monthlyRent: number;
  roomNo: string;
  roomCapacity: number;
}

export const usePaymentEntry = (options: UsePaymentEntryOptions = {}) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, upsertPayment } = useTenantPayments();

  // Payment dialog state
  const [paymentTenantId, setPaymentTenantId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi");
  const [overpaymentReason, setOverpaymentReason] = useState<string>("");
  const [overpaymentError, setOverpaymentError] = useState<boolean>(false);

  // Get existing payment for tenant
  const getPaymentForTenant = (tenantId: string): TenantPayment | undefined => {
    return payments.find(
      (p) => p.tenantId === tenantId && p.month === selectedMonth && p.year === selectedYear
    );
  };

  // Open payment dialog for a tenant
  const openPaymentDialog = (tenant: TenantForPayment) => {
    const existingPayment = getPaymentForTenant(tenant.id);
    const remaining = existingPayment 
      ? tenant.monthlyRent - (existingPayment.amountPaid || 0)
      : tenant.monthlyRent;
    
    setPaymentTenantId(tenant.id);
    setPaymentAmount(remaining);
    setPaymentDate(new Date());
    setPaymentMode("upi");
    setOverpaymentReason("");
    setOverpaymentError(false);
  };

  // Close payment dialog
  const closePaymentDialog = () => {
    setPaymentTenantId(null);
    setPaymentAmount(0);
    setOverpaymentReason("");
    setOverpaymentError(false);
  };

  // Confirm and process payment
  const confirmPayment = async (tenant: TenantForPayment) => {
    const existingPayment = getPaymentForTenant(tenant.id);
    const previousPaid = existingPayment?.amountPaid || 0;
    const totalPaid = previousPaid + paymentAmount;
    
    // Check for overpayment without reason
    const isOverpayment = paymentAmount > tenant.monthlyRent;
    if (isOverpayment && !overpaymentReason.trim()) {
      setOverpaymentError(true);
      return false;
    }
    setOverpaymentError(false);

    const formattedDate = format(paymentDate, "yyyy-MM-dd");
    const isFullPayment = totalPaid >= tenant.monthlyRent;
    const status = isFullPayment ? "Paid" : "Partial";

    // Build new payment entry
    const newEntry: PaymentEntry = {
      amount: paymentAmount,
      date: formattedDate,
      type: isFullPayment ? "full" : "partial",
      mode: paymentMode,
    };

    const existingEntries = existingPayment?.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];

    // Build notes for overpayment
    const notes = isOverpayment
      ? `Extra ₹${(paymentAmount - tenant.monthlyRent).toLocaleString()}: ${overpaymentReason.trim()}`
      : undefined;

    await upsertPayment.mutateAsync({
      tenantId: tenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: paymentAmount,
      paymentEntries: updatedEntries,
      notes,
      tenantName: tenant.name,
      roomNo: tenant.roomNo,
    });

    toast({
      title: isFullPayment ? "Payment marked as Paid" : "Partial payment recorded",
      description: `₹${paymentAmount.toLocaleString()} paid${
        isOverpayment 
          ? ` (includes extra ₹${(paymentAmount - tenant.monthlyRent).toLocaleString()})` 
          : !isFullPayment 
            ? ` • ₹${(tenant.monthlyRent - totalPaid).toLocaleString()} remaining` 
            : ""
      }`,
    });

    // Prepare receipt data
    if (options.onPaymentComplete) {
      const receiptData: PaymentReceiptData = {
        tenantName: tenant.name,
        tenantPhone: tenant.phone,
        paymentMode: paymentMode,
        paymentDate: format(paymentDate, "dd-MMM-yyyy"),
        joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
        forMonth: `${MONTHS[selectedMonth - 1].label} ${selectedYear}`,
        roomNo: tenant.roomNo,
        sharingType: `${tenant.roomCapacity} Sharing`,
        amount: tenant.monthlyRent,
        amountPaid: paymentAmount,
        isFullPayment,
        remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
        tenantId: tenant.id,
        paymentEntries: updatedEntries,
      };
      options.onPaymentComplete(receiptData);
    }

    closePaymentDialog();
    return true;
  };

  // Pay remaining balance for partial payment
  const payRemaining = async (
    tenant: TenantForPayment,
    remainingAmount: number,
    date: Date,
    mode: "upi" | "cash"
  ) => {
    const existingPayment = getPaymentForTenant(tenant.id);
    if (!existingPayment) return false;

    const formattedDate = format(date, "yyyy-MM-dd");
    const previousPaid = existingPayment.amountPaid || 0;
    const totalPaid = previousPaid + remainingAmount;
    const isFullPayment = totalPaid >= tenant.monthlyRent;

    const newEntry: PaymentEntry = {
      amount: remainingAmount,
      date: formattedDate,
      type: isFullPayment ? "remaining" : "partial",
      mode: mode,
    };

    const existingEntries = existingPayment.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];
    const status = isFullPayment ? "Paid" : "Partial";

    await upsertPayment.mutateAsync({
      tenantId: tenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: Math.min(totalPaid, tenant.monthlyRent),
      paymentEntries: updatedEntries,
      tenantName: tenant.name,
      roomNo: tenant.roomNo,
    });

    toast({
      title: isFullPayment ? "Payment completed" : "Partial payment recorded",
      description: isFullPayment
        ? `Full payment of ₹${tenant.monthlyRent.toLocaleString()} recorded`
        : `₹${totalPaid.toLocaleString()} paid • ₹${(tenant.monthlyRent - totalPaid).toLocaleString()} remaining`,
    });

    if (options.onPaymentComplete) {
      const receiptData: PaymentReceiptData = {
        tenantName: tenant.name,
        tenantPhone: tenant.phone,
        paymentMode: mode,
        paymentDate: format(date, "dd-MMM-yyyy"),
        joiningDate: format(new Date(tenant.startDate), "dd-MMM-yyyy"),
        forMonth: `${MONTHS[selectedMonth - 1].label} ${selectedYear}`,
        roomNo: tenant.roomNo,
        sharingType: `${tenant.roomCapacity} Sharing`,
        amount: tenant.monthlyRent,
        amountPaid: remainingAmount,
        isFullPayment,
        remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
        tenantId: tenant.id,
        paymentEntries: updatedEntries,
      };
      options.onPaymentComplete(receiptData);
    }

    return true;
  };

  return {
    // State
    paymentTenantId,
    paymentAmount,
    setPaymentAmount,
    paymentDate,
    setPaymentDate,
    paymentMode,
    setPaymentMode,
    overpaymentReason,
    setOverpaymentReason,
    overpaymentError,
    
    // Actions
    openPaymentDialog,
    closePaymentDialog,
    confirmPayment,
    payRemaining,
    getPaymentForTenant,
  };
};
