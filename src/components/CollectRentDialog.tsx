import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CreditCard, User, AlertCircle, Calendar, Users, Landmark, Wallet, Check, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCollectorNames } from "@/hooks/useCollectorNames";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useMonthContext } from "@/contexts/MonthContext";
import { Room, Tenant, TenantPayment, PaymentEntry } from "@/types";
import { WhatsAppReceiptDialog } from "./WhatsAppReceiptDialog";
import { isTenantActiveInMonth, parseDateOnly } from "@/utils/dateOnly";
import { format } from "date-fns";
import { MONTHS } from "@/constants/pricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
}

export const CollectRentDialog = ({ open, onOpenChange, rooms }: Props) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { collectors, getCollectorDisplayName } = useCollectorNames();
  const { payments, upsertPayment } = useTenantPayments();

  // Dialog & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "paid">("all");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [paymentMode, setPaymentMode] = useState<"upi" | "cash">("upi");
  const [splitMode, setSplitMode] = useState(false);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [collectedBy, setCollectedBy] = useState<string>("Me");
  const [overpaymentReason, setOverpaymentReason] = useState<string>("");
  const [overpaymentError, setOverpaymentError] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  // WhatsApp Dialog State
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  const defaultCollectorId = useMemo(() => collectors[0]?.id ?? "Me", [collectors]);

  // Set default collector once loaded
  useEffect(() => {
    if (defaultCollectorId) {
      setCollectedBy(defaultCollectorId);
    }
  }, [defaultCollectorId]);

  // Reset form when dialog opens/closes or tenant changes
  useEffect(() => {
    if (!open) {
      setSelectedTenantId(null);
      setSearchQuery("");
      setStatusFilter("all");
    }
  }, [open]);

  // Get active tenants with current month status
  const activeTenants = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      phone: string;
      startDate: string;
      endDate?: string;
      monthlyRent: number;
      roomNo: string;
      roomId: string;
      roomCapacity: number;
      paymentStatus: "Paid" | "Pending" | "Partial";
      amountPaid: number;
      paymentRecord?: TenantPayment;
    }> = [];

    rooms.forEach((room) => {
      room.tenants.forEach((tenant) => {
        // Filter by monthly activity
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          return;
        }

        const payment = payments.find(
          (p) => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );

        const amountPaid = payment?.amountPaid || 0;
        const targetRent = tenant.monthlyRent;

        let status: "Paid" | "Pending" | "Partial" = "Pending";
        if (payment?.paymentStatus === "Paid" || (amountPaid >= targetRent && targetRent > 0)) {
          status = "Paid";
        } else if (payment?.paymentStatus === "Partial" || (amountPaid > 0 && amountPaid < targetRent)) {
          status = "Partial";
        }

        list.push({
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          startDate: tenant.startDate,
          endDate: tenant.endDate,
          monthlyRent: tenant.monthlyRent,
          roomNo: room.roomNo,
          roomId: room.id,
          roomCapacity: room.capacity,
          paymentStatus: status,
          amountPaid: amountPaid,
          paymentRecord: payment,
        });
      });
    });

    return list;
  }, [rooms, payments, selectedMonth, selectedYear]);

  // Filter tenants based on search and status tabs
  const filteredTenants = useMemo(() => {
    return activeTenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.roomNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        statusFilter === "all" || t.paymentStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [activeTenants, searchQuery, statusFilter]);

  // Currently selected tenant object
  const selectedTenant = useMemo(() => {
    return activeTenants.find((t) => t.id === selectedTenantId);
  }, [activeTenants, selectedTenantId]);

  // Setup form when a tenant is selected
  const handleSelectTenant = (tenantId: string) => {
    const tenant = activeTenants.find((t) => t.id === tenantId);
    if (!tenant) return;

    const remaining = tenant.monthlyRent - tenant.amountPaid;
    const defaultAmount = remaining > 0 ? remaining : tenant.monthlyRent;

    setSelectedTenantId(tenantId);
    setPaymentAmount(defaultAmount);
    setUpiAmount(defaultAmount);
    setCashAmount(0);
    setSplitMode(false);
    setPaymentMode("upi");
    setNotes("");
    setOverpaymentReason("");
    setOverpaymentError(false);

    // Initialize payment date to today
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setPaymentDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  // Helper to get previous month's pending amount for a tenant
  const getPreviousMonthPendingForTenant = (tenantId: string): number => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    const tenant = activeTenants.find((t) => t.id === tenantId);
    if (!tenant) return 0;

    if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)) {
      return 0;
    }

    const payment = payments.find(
      (p) => p.tenantId === tenantId && p.month === prevMonth && p.year === prevYear
    );

    if (!payment || payment.paymentStatus === "Pending") {
      return tenant.monthlyRent;
    } else if (payment.paymentStatus === "Partial") {
      return tenant.monthlyRent - (payment.amountPaid || 0);
    }
    return 0;
  };

  // Record payment
  const handleRecordPayment = async () => {
    if (!selectedTenant) return;

    const actualAmount = splitMode ? upiAmount + cashAmount : paymentAmount;

    if (actualAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    // Check for overpayment without a reason
    const existingPaid = selectedTenant.amountPaid;
    const totalPaid = existingPaid + actualAmount;
    const isOverpayment = totalPaid > selectedTenant.monthlyRent;

    if (isOverpayment && !overpaymentReason.trim()) {
      setOverpaymentError(true);
      toast({
        title: "Reason Required",
        description: "Please enter a reason for the extra payment.",
        variant: "destructive",
      });
      return;
    }
    setOverpaymentError(false);

    const isFullPayment = totalPaid >= selectedTenant.monthlyRent;
    const status = isFullPayment ? "Paid" : "Partial";

    // Build payment entries
    const existingEntries = selectedTenant.paymentRecord?.paymentEntries || [];
    const newEntries: PaymentEntry[] = [];

    if (splitMode) {
      if (upiAmount > 0) {
        newEntries.push({
          amount: upiAmount,
          date: paymentDate,
          type: isFullPayment ? "full" : "partial",
          mode: "upi",
          collectedBy,
        });
      }
      if (cashAmount > 0) {
        newEntries.push({
          amount: cashAmount,
          date: paymentDate,
          type: isFullPayment ? "full" : "partial",
          mode: "cash",
          collectedBy,
        });
      }
    } else {
      newEntries.push({
        amount: paymentAmount,
        date: paymentDate,
        type: isFullPayment ? "full" : "partial",
        mode: paymentMode,
        collectedBy,
      });
    }

    const updatedEntries = [...existingEntries, ...newEntries];

    // Combine notes
    let finalNotes = notes.trim();
    if (isOverpayment) {
      const extraAmount = totalPaid - selectedTenant.monthlyRent;
      const overpaymentNotes = `Extra ₹${extraAmount.toLocaleString()}: ${overpaymentReason.trim()}`;
      finalNotes = finalNotes ? `${finalNotes} | ${overpaymentNotes}` : overpaymentNotes;
    }

    try {
      await upsertPayment.mutateAsync({
        tenantId: selectedTenant.id,
        month: selectedMonth,
        year: selectedYear,
        paymentStatus: status,
        paymentDate: paymentDate,
        amount: selectedTenant.monthlyRent,
        amountPaid: Math.min(totalPaid, selectedTenant.monthlyRent), // cap at rent, overpayments tracked via entries
        paymentEntries: updatedEntries,
        notes: finalNotes || undefined,
        tenantName: selectedTenant.name,
        roomNo: selectedTenant.roomNo,
      });

      toast({
        title: isFullPayment ? "Rent fully collected!" : "Partial rent payment recorded!",
        description: `Collected ₹${actualAmount.toLocaleString()} from ${selectedTenant.name}`,
      });

      // Open WhatsApp Dialog with receipt details
      const prevMonthPending = getPreviousMonthPendingForTenant(selectedTenant.id);
      const forMonthText = `${MONTHS[selectedMonth - 1].label} ${selectedYear}`;
      const sharingType = `${selectedTenant.roomCapacity} Sharing`;

      setReceiptData({
        tenantName: selectedTenant.name,
        tenantPhone: selectedTenant.phone,
        paymentMode: splitMode ? "upi" : paymentMode, // fallback mode
        paymentDate: format(parseDateOnly(paymentDate), "dd-MMM-yyyy"),
        joiningDate: selectedTenant.startDate ? format(parseDateOnly(selectedTenant.startDate), "dd-MMM-yyyy") : "",
        forMonth: forMonthText,
        roomNo: selectedTenant.roomNo,
        sharingType: sharingType,
        amount: selectedTenant.monthlyRent,
        amountPaid: actualAmount,
        isFullPayment: isFullPayment,
        remainingBalance: isFullPayment ? 0 : selectedTenant.monthlyRent - totalPaid,
        tenantId: selectedTenant.id,
        paymentEntries: updatedEntries,
        previousMonthPending: prevMonthPending > 0 ? prevMonthPending : undefined,
      });

      setWhatsappDialogOpen(true);

      // Back to tenant list
      setSelectedTenantId(null);
    } catch (err) {
      console.error("Error saving rent payment:", err);
      toast({
        title: "Error Recording Rent",
        description: "An error occurred while saving the payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl bg-background border border-border shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/50 shrink-0 bg-accent/20">
            <DialogHeader className="space-y-1.5">
              <div className="flex items-center gap-2">
                {selectedTenantId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedTenantId(null)}
                    className="h-8 w-8 rounded-full -ml-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  {selectedTenantId ? "Collect Rent Details" : "Collect Rent"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {selectedTenantId
                  ? `Enter payment details for ${selectedTenant?.name}`
                  : `Select a tenant to collect rent for ${MONTHS[selectedMonth - 1].label} ${selectedYear}`}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
            {!selectedTenantId ? (
              // View 1: Tenant search and select list
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Search tenant name or room no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-2xl bg-muted/30 focus-visible:ring-1 border-muted-foreground/20"
                  />
                </div>

                {/* Filters */}
                <div className="flex gap-1 bg-muted/40 p-1 rounded-2xl">
                  {(["all", "pending", "partial", "paid"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-xl capitalize transition-all ${
                        statusFilter === tab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tenant List */}
                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                  {filteredTenants.length > 0 ? (
                    filteredTenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        onClick={() => handleSelectTenant(tenant.id)}
                        className="group flex items-center justify-between p-3.5 rounded-2xl border border-border/60 bg-card hover:bg-accent/40 active:scale-[0.99] cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/5 p-2 rounded-xl text-primary">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {tenant.name}
                            </h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>Room {tenant.roomNo}</span>
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/45" />
                              <span>Rent: ₹{tenant.monthlyRent.toLocaleString()}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {tenant.paymentStatus === "Paid" ? (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              <Check className="w-3 h-3" /> Paid
                            </span>
                          ) : tenant.paymentStatus === "Partial" ? (
                            <span className="flex flex-col items-end gap-0.5">
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                Partial (₹{tenant.amountPaid.toLocaleString()})
                              </span>
                              <span className="text-[9px] text-muted-foreground font-semibold">
                                Due: ₹{(tenant.monthlyRent - tenant.amountPaid).toLocaleString()}
                              </span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <AlertCircle className="w-8 h-8 opacity-30 mb-2" />
                      <p className="text-xs">No active tenants found matching criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // View 2: Payment Details Collection Form
              <div className="space-y-4">
                {/* Selected Tenant Summary Card */}
                <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{selectedTenant?.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Room {selectedTenant?.roomNo} • {selectedTenant?.roomCapacity} Sharing
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Monthly Rent: <span className="font-bold text-foreground">₹{selectedTenant?.monthlyRent.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    {selectedTenant && selectedTenant.amountPaid > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Already Paid</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{selectedTenant.amountPaid.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground pt-1">Remaining Due</p>
                        <p className="text-lg font-extrabold text-foreground">
                          ₹{(selectedTenant.monthlyRent - selectedTenant.amountPaid).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Total Due</p>
                        <p className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                          ₹{selectedTenant?.monthlyRent.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3.5">
                  {/* Split Mode Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-card border border-border/80">
                    <div>
                      <Label htmlFor="split-mode" className="text-xs font-semibold block">Split UPI & Cash</Label>
                      <span className="text-[10px] text-muted-foreground">Record split payment mode</span>
                    </div>
                    <input
                      id="split-mode"
                      type="checkbox"
                      checked={splitMode}
                      onChange={(e) => setSplitMode(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-border bg-background cursor-pointer"
                    />
                  </div>

                  {splitMode ? (
                    // Split Mode inputs
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/20 border border-dashed border-border">
                      <div className="space-y-1.5">
                        <Label htmlFor="upi-split" className="text-[11px] font-semibold flex items-center gap-1">
                          <Landmark className="w-3 h-3 text-sky-500" /> UPI Amount
                        </Label>
                        <Input
                          id="upi-split"
                          type="number"
                          value={upiAmount || ""}
                          onChange={(e) => setUpiAmount(Number(e.target.value))}
                          placeholder="₹ UPI"
                          className="h-10 rounded-xl bg-background border-muted-foreground/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cash-split" className="text-[11px] font-semibold flex items-center gap-1">
                          <Wallet className="w-3 h-3 text-emerald-500" /> Cash Amount
                        </Label>
                        <Input
                          id="cash-split"
                          type="number"
                          value={cashAmount || ""}
                          onChange={(e) => setCashAmount(Number(e.target.value))}
                          placeholder="₹ Cash"
                          className="h-10 rounded-xl bg-background border-muted-foreground/20"
                        />
                      </div>
                      <div className="col-span-2 text-right text-[11px] text-muted-foreground font-semibold">
                        Total Split: <span className="text-foreground font-bold">₹{(upiAmount + cashAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  ) : (
                    // Single Mode Inputs
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="amount" className="text-xs font-semibold">Amount to Collect *</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={paymentAmount || ""}
                          onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          className="h-10 rounded-xl bg-background border-muted-foreground/20 font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="mode" className="text-xs font-semibold">Payment Mode</Label>
                        <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                          <SelectTrigger id="mode" className="h-10 rounded-xl bg-background border-muted-foreground/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="upi" className="rounded-lg">UPI Transfer</SelectItem>
                            <SelectItem value="cash" className="rounded-lg">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Overpayment Reason - Conditional */}
                  {selectedTenant &&
                    ((splitMode ? upiAmount + cashAmount : paymentAmount) + selectedTenant.amountPaid >
                    selectedTenant.monthlyRent) && (
                      <div className="space-y-1.5 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                        <Label htmlFor="overpayment-reason" className="text-xs font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Overpayment Reason Required *
                        </Label>
                        <Input
                          id="overpayment-reason"
                          placeholder="e.g. advance, AC bill balance, extra services"
                          value={overpaymentReason}
                          onChange={(e) => {
                            setOverpaymentReason(e.target.value);
                            if (e.target.value.trim()) setOverpaymentError(false);
                          }}
                          className={`h-9 rounded-xl bg-background text-xs ${
                            overpaymentError ? "border-rose-500 focus-visible:ring-rose-500" : "border-amber-500/30"
                          }`}
                        />
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          The total collected (₹
                          {(
                            (splitMode ? upiAmount + cashAmount : paymentAmount) + selectedTenant.amountPaid
                          ).toLocaleString()}
                          ) exceeds the monthly rent of ₹
                          {selectedTenant.monthlyRent.toLocaleString()}.
                        </p>
                      </div>
                    )}

                  {/* Date & Collector fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="date" className="text-xs font-semibold flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date of Payment</Label>
                      <Input
                        id="date"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="h-10 rounded-xl bg-background border-muted-foreground/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="collector" className="text-xs font-semibold flex items-center gap-1"><User className="w-3.5 h-3.5" /> Collected By</Label>
                      <Select value={collectedBy} onValueChange={setCollectedBy}>
                        <SelectTrigger id="collector" className="h-10 rounded-xl bg-background border-muted-foreground/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Me" className="rounded-lg">Me</SelectItem>
                          {collectors
                            .filter((c) => c.id !== "Me")
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id} className="rounded-lg">
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-semibold">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Add payment notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-10 rounded-xl bg-background border-muted-foreground/20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-border/50 bg-accent/10 flex gap-3 shrink-0">
            {selectedTenantId ? (
              // Form actions
              <>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTenantId(null)}
                  className="flex-1 h-11 font-semibold rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={upsertPayment.isPending}
                  className="flex-1 h-11 font-semibold rounded-2xl flex items-center justify-center gap-1.5"
                >
                  Record Payment
                </Button>
              </>
            ) : (
              // List actions
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full h-11 font-semibold rounded-2xl"
              >
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Receipt Dialog Integration */}
      <WhatsAppReceiptDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        receiptData={receiptData}
      />
    </>
  );
};
