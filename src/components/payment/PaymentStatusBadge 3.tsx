import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PaymentCategory = "paid" | "partial" | "overdue" | "not-due" | "advance-not-paid" | "pending";

interface PaymentStatusBadgeProps {
  category: PaymentCategory;
  amount?: number;
  showAmount?: boolean;
  className?: string;
}

const categoryConfig: Record<PaymentCategory, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-paid text-paid-foreground" },
  partial: { label: "Due", className: "bg-partial text-partial-foreground" },
  overdue: { label: "Overdue", className: "bg-overdue text-overdue-foreground" },
  "not-due": { label: "Pending", className: "bg-not-due text-not-due-foreground" },
  "advance-not-paid": { label: "Advance Due", className: "bg-advance-not-paid text-advance-not-paid-foreground" },
  pending: { label: "Pending", className: "bg-pending text-pending-foreground" },
};

export const PaymentStatusBadge = ({ 
  category, 
  amount, 
  showAmount = false,
  className 
}: PaymentStatusBadgeProps) => {
  const config = categoryConfig[category] || categoryConfig.pending;
  
  return (
    <Badge className={cn(config.className, className)}>
      {showAmount && amount ? `₹${amount.toLocaleString()}` : config.label}
    </Badge>
  );
};

export const getPaymentCardClass = (category: PaymentCategory): string => {
  const cardClasses: Record<PaymentCategory, string> = {
    paid: "bg-paid-muted border-l-4 border-paid",
    partial: "bg-partial-muted border-l-4 border-partial",
    overdue: "bg-overdue-muted border-l-4 border-overdue",
    "not-due": "bg-not-due-muted border-l-4 border-not-due",
    "advance-not-paid": "bg-advance-not-paid-muted border-l-4 border-advance-not-paid",
    pending: "bg-pending-muted border-l-4 border-pending",
  };
  return cardClasses[category] || cardClasses.pending;
};
