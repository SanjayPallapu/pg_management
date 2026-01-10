import { useState, useMemo, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { Tenant, TenantPayment, PaymentEntry } from "@/types";
import { parseDateOnly } from "@/utils/dateOnly";
import { CheckCircle2, AlertTriangle, Calendar as CalendarIcon, IndianRupee, Percent } from "lucide-react";

interface MarkLeftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  currentMonthPayment: TenantPayment | null;
  selectedMonth: number;
  selectedYear: number;
  onConfirm: (data: {
    endDate: string;
    settlementAmount: number;
    settlementMode: "upi" | "cash";
    settlementNotes: string;
  }) => void;
}

export const MarkLeftDialog = ({
  open,
  onOpenChange,
  tenant,
  currentMonthPayment,
  selectedMonth,
  selectedYear,
  onConfirm,
}: MarkLeftDialogProps) => {
  const [leaveDate, setLeaveDate] = useState<Date>(new Date());
  const [perDayRate, setPerDayRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [settlementMode, setSettlementMode] = useState<"upi" | "cash">("upi");
  const [step, setStep] = useState<"date" | "calculation" | "confirm">("date");

  // Reset state when dialog opens
  useEffect(() => {
    if (open && tenant) {
      setLeaveDate(new Date());
      // Calculate default per day rate (monthly rent / 30)
      setPerDayRate(Math.round(tenant.monthlyRent / 30));
      setDiscountAmount(0);
      setSettlementMode("upi");
      setStep("date");
    }
  }, [open, tenant]);

  // Calculate billing cycle dates based on tenant's joining date
  const billingInfo = useMemo(() => {
    if (!tenant) return null;

    const joinDate = parseDateOnly(tenant.startDate);
    const joinDay = joinDate.getDate();

    // Calculate current billing cycle
    let cycleStartMonth = selectedMonth;
    let cycleStartYear = selectedYear;
    
    // If join day is 1, billing is calendar month
    if (joinDay === 1) {
      const cycleStart = new Date(cycleStartYear, cycleStartMonth - 1, 1);
      const cycleEnd = new Date(cycleStartYear, cycleStartMonth, 0);
      return {
        cycleStart,
        cycleEnd,
        isCalendarMonth: true,
        joinDay,
      };
    }

    // For non-1st joiners: cycle is joinDay of month to (joinDay - 1) of next month
    const cycleStart = new Date(cycleStartYear, cycleStartMonth - 1, joinDay);
    const nextMonth = cycleStartMonth === 12 ? 1 : cycleStartMonth + 1;
    const nextYear = cycleStartMonth === 12 ? cycleStartYear + 1 : cycleStartYear;
    const cycleEnd = new Date(nextYear, nextMonth - 1, joinDay - 1);

    return {
      cycleStart,
      cycleEnd,
      isCalendarMonth: false,
      joinDay,
    };
  }, [tenant, selectedMonth, selectedYear]);

  // Calculate pro-rata details
  const calculation = useMemo(() => {
    if (!tenant || !billingInfo) return null;

    const amountPaid = currentMonthPayment?.amountPaid || 0;
    const paymentStatus = currentMonthPayment?.paymentStatus || "Pending";
    const isFullyPaid = paymentStatus === "Paid";
    const isPartiallyPaid = paymentStatus === "Partial";

    // Calculate days stayed in current cycle
    const cycleStart = billingInfo.cycleStart;
    const leaveDateObj = leaveDate;
    
    // Days from cycle start to leave date (inclusive of start, exclusive of leave date)
    let daysStayed = differenceInDays(leaveDateObj, cycleStart);
    if (daysStayed < 0) daysStayed = 0;

    // Total days in billing cycle
    const totalDaysInCycle = differenceInDays(billingInfo.cycleEnd, cycleStart) + 1;

    // Pro-rata rent calculation
    const proRataRent = daysStayed * perDayRate;
    
    // Settlement amount
    let settlementDue = 0;
    let refundDue = 0;
    
    if (isFullyPaid) {
      // If fully paid, check if refund is due
      const refund = tenant.monthlyRent - proRataRent - discountAmount;
      if (refund > 0) {
        refundDue = refund;
      }
    } else if (isPartiallyPaid) {
      // If partially paid, calculate remaining
      const totalDue = proRataRent - discountAmount;
      const remaining = totalDue - amountPaid;
      if (remaining > 0) {
        settlementDue = remaining;
      } else if (remaining < 0) {
        refundDue = Math.abs(remaining);
      }
    } else {
      // Pending - full pro-rata minus discount
      settlementDue = Math.max(0, proRataRent - discountAmount);
    }

    return {
      daysStayed,
      totalDaysInCycle,
      proRataRent,
      amountPaid,
      discountAmount,
      settlementDue,
      refundDue,
      isFullyPaid,
      isPartiallyPaid,
      paymentStatus,
    };
  }, [tenant, billingInfo, leaveDate, perDayRate, discountAmount, currentMonthPayment]);

  const handleProceedToCalculation = () => {
    setStep("calculation");
  };

  const handleConfirmSettlement = () => {
    if (!tenant || !calculation) return;

    const formattedDate = format(leaveDate, "yyyy-MM-dd");
    const notes = `Left on ${format(leaveDate, "dd MMM yyyy")}. Days stayed: ${calculation.daysStayed}. Pro-rata: ₹${calculation.proRataRent}${calculation.discountAmount > 0 ? `. Discount: ₹${calculation.discountAmount}` : ""}`;

    onConfirm({
      endDate: formattedDate,
      settlementAmount: calculation.settlementDue,
      settlementMode,
      settlementNotes: notes,
    });
  };

  if (!tenant) return null;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {step === "date" && <CalendarIcon className="h-5 w-5" />}
            {step === "calculation" && <IndianRupee className="h-5 w-5" />}
            {step === "confirm" && <CheckCircle2 className="h-5 w-5" />}
            Mark {tenant.name} as Left
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === "date" && "Select the date when the tenant left."}
            {step === "calculation" && "Review and adjust the settlement calculation."}
            {step === "confirm" && "Confirm the settlement details."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === "date" && (
          <div className="py-4 space-y-4">
            {/* Current Payment Status */}
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {monthNames[selectedMonth - 1]} {selectedYear} Status:
                </span>
                <Badge
                  className={cn(
                    currentMonthPayment?.paymentStatus === "Paid"
                      ? "bg-paid text-paid-foreground"
                      : currentMonthPayment?.paymentStatus === "Partial"
                        ? "bg-partial text-partial-foreground"
                        : "bg-pending text-pending-foreground"
                  )}
                >
                  {currentMonthPayment?.paymentStatus || "Pending"}
                </Badge>
              </div>
              {currentMonthPayment?.amountPaid && currentMonthPayment.amountPaid > 0 && (
                <div className="text-sm text-muted-foreground mt-1">
                  Amount paid: ₹{currentMonthPayment.amountPaid.toLocaleString()}
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Leave Date</Label>
              <Calendar
                mode="single"
                selected={leaveDate}
                onSelect={(date) => date && setLeaveDate(date)}
                className={cn("rounded-md border pointer-events-auto mx-auto")}
              />
            </div>
          </div>
        )}

        {step === "calculation" && calculation && billingInfo && (
          <div className="py-4 space-y-4">
            {/* Payment Status Warning */}
            {!calculation.isFullyPaid && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-medium">Rent not fully paid</span>
                  <p className="text-muted-foreground">
                    {calculation.isPartiallyPaid
                      ? `Partially paid: ₹${calculation.amountPaid.toLocaleString()}`
                      : "No payment received for current month"}
                  </p>
                </div>
              </div>
            )}

            {/* Days Calculation */}
            <div className="p-3 rounded-lg bg-muted space-y-2">
              <div className="flex justify-between text-sm">
                <span>Leave Date:</span>
                <span className="font-medium">{format(leaveDate, "dd MMM yyyy")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Billing Cycle:</span>
                <span className="font-medium">
                  {format(billingInfo.cycleStart, "dd MMM")} - {format(billingInfo.cycleEnd, "dd MMM")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Days Stayed:</span>
                <span className="font-medium">{calculation.daysStayed} days</span>
              </div>
            </div>

            <Separator />

            {/* Per Day Rate */}
            <div>
              <Label className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Per Day Rate
              </Label>
              <Input
                type="number"
                value={perDayRate}
                onChange={(e) => setPerDayRate(parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: ₹{Math.round(tenant.monthlyRent / 30)} (Monthly rent ÷ 30)
              </p>
            </div>

            {/* Discount */}
            <div>
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Discount Amount (Optional)
              </Label>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseInt(e.target.value) || 0)}
                className="mt-1"
                placeholder="0"
              />
            </div>

            <Separator />

            {/* Settlement Summary */}
            <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-2">
              <div className="text-sm font-medium text-primary mb-3">Settlement Summary</div>
              <div className="flex justify-between text-sm">
                <span>Pro-rata Rent ({calculation.daysStayed} days × ₹{perDayRate}):</span>
                <span>₹{calculation.proRataRent.toLocaleString()}</span>
              </div>
              {calculation.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>- ₹{calculation.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {calculation.amountPaid > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Already Paid:</span>
                  <span>- ₹{calculation.amountPaid.toLocaleString()}</span>
                </div>
              )}
              <Separator className="my-2" />
              {calculation.settlementDue > 0 ? (
                <div className="flex justify-between font-semibold text-lg text-destructive">
                  <span>Amount Due:</span>
                  <span>₹{calculation.settlementDue.toLocaleString()}</span>
                </div>
              ) : calculation.refundDue > 0 ? (
                <div className="flex justify-between font-semibold text-lg text-green-600">
                  <span>Refund Due:</span>
                  <span>₹{calculation.refundDue.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between font-semibold text-lg text-paid">
                  <span>Settlement:</span>
                  <span>Fully Settled ✓</span>
                </div>
              )}
            </div>

            {/* Payment Mode */}
            {calculation.settlementDue > 0 && (
              <div>
                <Label>Payment Mode</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={settlementMode === "upi" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSettlementMode("upi")}
                  >
                    UPI/Online
                  </Button>
                  <Button
                    type="button"
                    variant={settlementMode === "cash" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSettlementMode("cash")}
                  >
                    Cash
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          {step === "date" && (
            <>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleProceedToCalculation}>
                Continue
              </AlertDialogAction>
            </>
          )}
          {step === "calculation" && (
            <>
              <Button variant="outline" onClick={() => setStep("date")}>
                Back
              </Button>
              <AlertDialogAction onClick={handleConfirmSettlement}>
                Confirm & Mark Left
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
