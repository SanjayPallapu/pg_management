import { format } from "date-fns";
import { Phone, MessageCircle, Receipt, MessageSquare, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaymentEntry } from "@/types";
import { PaymentEntryDisplay, getPaymentCardClass } from "@/components/payment";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type PaymentCategory = "paid" | "partial" | "overdue" | "not-due" | "advance-not-paid";

// Helper to parse discount and extra from notes
const parseNotesInfo = (notes?: string) => {
  if (!notes) return { discount: 0, extra: 0, extraReason: '' };
  
  const discountMatch = notes.match(/Discount:\s*₹?(\d+)/i);
  const extraMatch = notes.match(/Extra\s*₹?(\d+):\s*([^|]+)/i);
  
  return {
    discount: discountMatch ? parseInt(discountMatch[1]) : 0,
    extra: extraMatch ? parseInt(extraMatch[1]) : 0,
    extraReason: extraMatch ? extraMatch[2].trim() : ''
  };
};

interface TenantRentCardProps {
  tenant: {
    id: string;
    name: string;
    phone: string;
    roomNo: string;
    startDate: string;
    endDate?: string;
    monthlyRent: number;
    isLocked?: boolean;
    effectiveRent?: number;
    daysStayed?: number;
    isProRata?: boolean;
    payment: {
      paymentStatus: "Paid" | "Pending" | "Partial";
      amountPaid?: number;
      paymentEntries: PaymentEntry[];
      paymentDate?: string;
      notes?: string;
    };
    paymentCategory: PaymentCategory;
  };
  whatsappSent?: boolean;
  editModeEnabled?: boolean;
  onMarkPaid: (tenantId: string, tenantName: string, currentStatus: "Paid" | "Pending" | "Partial") => void;
  onPayRemaining: (tenantId: string) => void;
  onGenerateReceipt: () => void;
  onPaymentReminder: () => void;
}

export const TenantRentCard = ({
  tenant,
  whatsappSent = false,
  editModeEnabled = false,
  onMarkPaid,
  onPayRemaining,
  onGenerateReceipt,
  onPaymentReminder,
}: TenantRentCardProps) => {
  const isPartial = tenant.paymentCategory === "partial";
  // Use pro-rata effective rent if applicable
  const targetRent = tenant.isProRata && tenant.effectiveRent !== undefined 
    ? tenant.effectiveRent 
    : tenant.monthlyRent;
  const remaining = isPartial ? Math.max(0, targetRent - (tenant.payment.amountPaid || 0)) : 0;
  const bgClass = getPaymentCardClass(tenant.paymentCategory);

  // Parse discount and extra from notes
  const { discount, extra, extraReason } = useMemo(
    () => parseNotesInfo(tenant.payment.notes),
    [tenant.payment.notes]
  );

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

  return (
    <div className={cn("p-3 rounded-xl transition-all duration-200", bgClass)}>
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
              className="h-6 w-6 flex items-center justify-center rounded-full transition-colors text-muted-foreground hover:text-upi hover:bg-upi-muted"
              title={`Call ${tenant.name}`}
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
          {/* WhatsApp dropdown menu */}
          {tenant.phone && tenant.phone !== "••••••••••" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "h-6 w-6 flex items-center justify-center rounded-full transition-colors",
                    whatsappSent
                      ? "text-cash bg-cash-muted"
                      : "text-muted-foreground hover:text-cash hover:bg-cash-muted"
                  )}
                  title={whatsappSent ? "Receipt sent - Click for options" : "WhatsApp options"}
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(tenant.payment.paymentStatus === "Paid" || tenant.payment.paymentStatus === "Partial") && (
                  <DropdownMenuItem onClick={onGenerateReceipt} className="gap-2">
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
                  <DropdownMenuItem onClick={onPaymentReminder} className="gap-2">
                    <Bell className="h-4 w-4" />
                    Payment Reminder
                  </DropdownMenuItem>
                )}
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
      
      <div className="text-xs text-muted-foreground mb-2">
        Room {tenant.roomNo}
        {tenant.isLocked && <span className="text-destructive ml-1">(Excluded from totals)</span>}
      </div>

      {/* Pro-rata visual indicator for mid-month leavers */}
      {tenant.isProRata && tenant.daysStayed && tenant.effectiveRent !== undefined && (
        <div className="text-xs bg-muted/50 rounded px-2 py-1 mb-2 flex items-center gap-1">
          <span className="text-muted-foreground">Pro-rata:</span>
          <span className="font-medium">
            {tenant.daysStayed} days × ₹{Math.round(tenant.monthlyRent / 30).toLocaleString()}/day = ₹{tenant.effectiveRent.toLocaleString()}
          </span>
        </div>
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

      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <div className="text-xs text-muted-foreground">
            Joined: {format(new Date(tenant.startDate), "dd MMM yyyy")}
          </div>
          {/* Display payment entries using shared component */}
          <PaymentEntryDisplay entries={tenant.payment.paymentEntries} />
          {/* Display discount and extra amounts if present */}
          {(discount > 0 || extra > 0) && (
            <div className="flex flex-wrap gap-2 mt-1">
              {discount > 0 && (
                <span className="text-xs font-medium text-primary">
                  📋 Discount: ₹{discount.toLocaleString()}
                </span>
              )}
              {extra > 0 && (
                <span className="text-xs font-medium text-upi">
                  ➕ Extra: ₹{extra.toLocaleString()}{extraReason ? ` (${extraReason})` : ''}
                </span>
              )}
            </div>
          )}
        </div>
        {isPartial ? (
          <Button
            onClick={() => onPayRemaining(tenant.id)}
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
            onClick={() => onMarkPaid(tenant.id, tenant.name, tenant.payment.paymentStatus)}
          >
            {tenant.payment.paymentStatus === "Paid" ? "Paid" : "Mark Paid"}
          </Button>
        )}
      </div>
    </div>
  );
};
