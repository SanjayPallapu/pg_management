import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";

interface PaymentAmountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  amount: number;
  onAmountChange: (amount: number) => void;
  paymentMode: "upi" | "cash";
  onPaymentModeChange: (mode: "upi" | "cash") => void;
  paymentDate: Date;
  onPaymentDateChange: (date: Date) => void;
  monthlyRent?: number;
  existingPaid?: number;
  overpaymentReason?: string;
  onOverpaymentReasonChange?: (reason: string) => void;
  overpaymentError?: boolean;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  showRemainingInfo?: boolean;
  // Split payment support
  splitMode?: boolean;
  onSplitModeChange?: (v: boolean) => void;
  upiAmount?: number;
  cashAmount?: number;
  onUpiAmountChange?: (n: number) => void;
  onCashAmountChange?: (n: number) => void;
}

export const PaymentAmountDialog = ({
  open,
  onOpenChange,
  title = "Enter Payment Amount",
  description = "Enter the amount received and select date.",
  amount,
  onAmountChange,
  paymentMode,
  onPaymentModeChange,
  paymentDate,
  onPaymentDateChange,
  monthlyRent,
  existingPaid = 0,
  overpaymentReason = "",
  onOverpaymentReasonChange,
  overpaymentError = false,
  onConfirm,
  confirmDisabled = false,
  showRemainingInfo = false,
  splitMode = false,
  onSplitModeChange,
  upiAmount = 0,
  cashAmount = 0,
  onUpiAmountChange,
  onCashAmountChange,
}: PaymentAmountDialogProps) => {
  const effAmount = splitMode ? (upiAmount + cashAmount) : amount;
  const isOverpayment = monthlyRent && effAmount > monthlyRent;
  const isPartial = monthlyRent && amount < monthlyRent - existingPaid;
  const remaining = monthlyRent ? monthlyRent - existingPaid - amount : 0;
  const newTotal = existingPaid + amount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{splitMode ? "Split Payment (UPI + Cash)" : "Amount (₹)"}</Label>
              {onSplitModeChange && (
                <Button
                  type="button"
                  variant={splitMode ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const next = !splitMode;
                    onSplitModeChange(next);
                    if (next) {
                      onUpiAmountChange?.(amount);
                      onCashAmountChange?.(0);
                    } else {
                      onAmountChange(upiAmount + cashAmount);
                    }
                  }}
                >
                  {splitMode ? "Single mode" : "Split UPI + Cash"}
                </Button>
              )}
            </div>

            {!splitMode ? (
              <Input
                type="number"
                value={amount}
                onChange={(e) => {
                  onAmountChange(parseInt(e.target.value) || 0);
                  onOverpaymentReasonChange?.("");
                }}
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">UPI ₹</Label>
                  <Input
                    type="number"
                    value={upiAmount || ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      onUpiAmountChange?.(v);
                      onAmountChange(v + cashAmount);
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cash ₹</Label>
                  <Input
                    type="number"
                    value={cashAmount || ""}
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 0;
                      onCashAmountChange?.(v);
                      onAmountChange(upiAmount + v);
                    }}
                  />
                </div>
                <div className="col-span-2 text-xs text-muted-foreground text-right">
                  Total: ₹{(upiAmount + cashAmount).toLocaleString()}
                </div>
              </div>
            )}
            
            {/* Partial payment info */}
            {monthlyRent && !showRemainingInfo && isPartial && (
              <p className="text-sm text-partial mt-2">
                This will be recorded as a partial payment. Remaining: ₹
                {remaining.toLocaleString()}
              </p>
            )}
            
            {/* Remaining payment info */}
            {showRemainingInfo && monthlyRent && amount < (monthlyRent - existingPaid) && (
              <p className="text-sm text-partial mt-2">
                Partial payment. Total paid: ₹{newTotal.toLocaleString()} • Still due: ₹
                {(monthlyRent - newTotal).toLocaleString()}
              </p>
            )}
            
            {/* Overpayment info */}
            {isOverpayment && onOverpaymentReasonChange && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-primary font-medium">
                  Extra payment: ₹{(amount - monthlyRent!).toLocaleString()} above rent of ₹
                  {monthlyRent!.toLocaleString()}
                </p>
                <div>
                  <Label className="text-sm">Reason for extra amount *</Label>
                  <Input
                    type="text"
                    value={overpaymentReason}
                    onChange={(e) => onOverpaymentReasonChange(e.target.value)}
                    placeholder="e.g., Advance, Electricity, Next month"
                    className={cn("mt-1", overpaymentError && "border-destructive")}
                  />
                  {overpaymentError && (
                    <p className="text-sm text-destructive mt-1">Reason is required for extra payment</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {!splitMode && (
          <div>
            <Label>Payment Mode</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={paymentMode === "upi" ? "default" : "outline"}
                className="flex-1"
                onClick={() => onPaymentModeChange("upi")}
              >
                UPI/Online
              </Button>
              <Button
                type="button"
                variant={paymentMode === "cash" ? "default" : "outline"}
                className="flex-1"
                onClick={() => onPaymentModeChange("cash")}
              >
                Cash
              </Button>
            </div>
          </div>
          )}
          
          <div>
            <Label>Payment Date</Label>
            <Calendar
              mode="single"
              selected={paymentDate}
              onSelect={(date) => date && onPaymentDateChange(date)}
              className={cn("rounded-md border mt-2 pointer-events-auto")}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={confirmDisabled || amount <= 0}>
            Confirm Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
