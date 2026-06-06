import { format } from "date-fns";
import { PaymentEntry } from "@/types";
import { cn } from "@/lib/utils";

interface PaymentEntryDisplayProps {
  entries: PaymentEntry[];
  className?: string;
}

export const PaymentEntryDisplay = ({ entries, className }: PaymentEntryDisplayProps) => {
  if (!entries || entries.length === 0) return null;

  return (
    <div className={cn("space-y-0.5", className)}>
      {entries.map((entry, idx) => (
        <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
          <span>
            {entry.type === "partial"
              ? "Partial"
              : entry.type === "remaining"
                ? "Remaining"
                : "Paid"}
            : ₹{entry.amount.toLocaleString()} on{" "}
            {format(new Date(entry.date), "dd MMM yyyy")}
          </span>
          {entry.mode && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium",
                entry.mode === "upi"
                  ? "bg-upi-muted text-upi"
                  : "bg-cash-muted text-cash"
              )}
            >
              {entry.mode === "upi" ? "UPI" : "Cash"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
