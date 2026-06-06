import { UpiLogo } from "@/components/icons/UpiLogo";
import { CashLogo } from "@/components/icons/CashLogo";
import { cn } from "@/lib/utils";

interface PaymentModeButtonsProps {
  mode: "upi" | "cash";
  onModeChange: (mode: "upi" | "cash") => void;
  className?: string;
}

export const PaymentModeButtons = ({ mode, onModeChange, className }: PaymentModeButtonsProps) => {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <button
        type="button"
        onClick={() => onModeChange("upi")}
        className={cn(
          "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
          mode === "upi"
            ? "border-primary bg-primary/10 text-primary"
            : "border-muted hover:border-primary/50"
        )}
      >
        <UpiLogo className="h-6 w-6" />
        <span className="font-medium">UPI</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange("cash")}
        className={cn(
          "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
          mode === "cash"
            ? "border-success bg-success/10 text-success"
            : "border-muted hover:border-success/50"
        )}
      >
        <CashLogo className="h-6 w-6" />
        <span className="font-medium">Cash</span>
      </button>
    </div>
  );
};
