import { format } from "date-fns";
import { Phone, MessageCircle, Receipt, MessageSquare, Bell, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PaymentEntry } from "@/types";
import { PaymentEntryDisplay, getPaymentCardClass } from "@/components/payment";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { StayPeriodIndicator } from "@/components/StayPeriodIndicator";

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
  selectedMonth: number;
  selectedYear: number;
  whatsappSent?: boolean;
  editModeEnabled?: boolean;
  onMarkPaid: (tenantId: string, tenantName: string, currentStatus: "Paid" | "Pending" | "Partial") => void;
  onPayRemaining: (tenantId: string) => void;
  onGenerateReceipt: () => void;
  onPaymentReminder: () => void;
}

export const TenantRentCard = ({
  tenant,
  selectedMonth,
  selectedYear,
  whatsappSent = false,
  editModeEnabled = false,
  onMarkPaid,
  onPayRemaining,
  onGenerateReceipt,
  onPaymentReminder,
}: TenantRentCardProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
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

export const TenantRentCard = ({
  tenant,
  selectedMonth,
  selectedYear,
  whatsappSent = false,
  editModeEnabled = false,
  onMarkPaid,
  onPayRemaining,
  onGenerateReceipt,
  onPaymentReminder,
}: TenantRentCardProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const isPaid = tenant.payment.paymentStatus === "Paid";
  const isPartial = tenant.paymentCategory === "partial";
  const targetRent = tenant.isProRata && tenant.effectiveRent !== undefined 
    ? tenant.effectiveRent 
    : tenant.monthlyRent;
  const dueAmount = isPartial 
    ? Math.max(0, targetRent - (tenant.payment.amountPaid || 0))
    : isPaid 
      ? 0 
      : targetRent;

  const cardDesignClass = isPaid ? 'tenant-card-paid' : 'tenant-card-pending';
  const displayAmount = isPaid ? (tenant.payment.amountPaid || tenant.monthlyRent) : dueAmount;

  const formattedJoinedDate = tenant.startDate
    ? format(new Date(tenant.startDate), 'dd MMM yyyy')
    : '';

  return (
    <div className={cn("transition-all duration-200 shadow-sm p-4 rounded-2xl", cardDesignClass)}>
      <div className="flex items-stretch justify-between gap-3">
        {/* Left Div */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Name • Room No */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-base font-bold text-foreground">{tenant.name}</span>
              <span className="text-slate-400 font-medium text-sm">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium text-sm shrink-0">R{tenant.roomNo}</span>
            </div>

            {/* Joined Date */}
            <div className="mt-1">
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                Joined: {formattedJoinedDate}
              </span>
            </div>

            {/* Pro-rata visual indicator for mid-month leavers */}
            {tenant.isProRata && tenant.daysStayed && tenant.effectiveRent !== undefined && (
              <Collapsible open={showCalendar} onOpenChange={setShowCalendar} className="mt-2">
                <CollapsibleTrigger asChild>
                  <button className="w-full text-xs bg-muted/50 rounded px-2 py-1.5 flex items-center justify-between hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Pro-rata:</span>
                      <span className="font-medium">
                        {tenant.daysStayed} days × ₹{Math.round(tenant.monthlyRent / 30).toLocaleString()}/day = ₹{tenant.effectiveRent.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{showCalendar ? '▲' : '▼'}</span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1">
                    <StayPeriodIndicator
                      startDate={tenant.startDate}
                      endDate={tenant.endDate}
                      year={selectedYear}
                      month={selectedMonth}
                      daysStayed={tenant.daysStayed}
                      dailyRate={Math.round(tenant.monthlyRent / 30)}
                      effectiveRent={tenant.effectiveRent}
                      paymentEntries={tenant.payment.paymentEntries}
                      allowCustomStart
                      compact
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Payments breakdown */}
            {((tenant.payment.paymentEntries && tenant.payment.paymentEntries.length > 0) || isPaid) && (
              <div className="mt-2 space-y-1">
                <div className={cn("text-sm font-medium", !isPaid ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400")}>
                  {isPaid ? "Payments:" : "Payment:"}
                </div>
                {tenant.payment.paymentEntries && tenant.payment.paymentEntries.length > 0 ? (
                  tenant.payment.paymentEntries.map((entry, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span>₹{entry.amount.toLocaleString()}{entry.date ? ` on ${format(new Date(entry.date), 'dd MMM yyyy')}` : ''}</span>
                      <span className={entry.mode === 'upi' ? 'tag-upi' : 'tag-cash'}>
                        {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                      </span>
                    </div>
                  ))
                ) : (tenant.payment.amountPaid || 0) > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span>₹{(tenant.payment.amountPaid || 0).toLocaleString()}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Red Price Badge on bottom of Left Div (for Pending) */}
          {!isPaid && (
            <div className="mt-3 pt-1">
              <span className="price-badge-red shrink-0">
                ₹{displayAmount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Right Div */}
        <div className="flex flex-col justify-between items-end shrink-0 ml-auto text-right">
          {/* Top: Price for Paid */}
          <div className="w-[84px] text-center">
            {isPaid && (
              <span className="text-lg font-extrabold text-foreground">
                ₹{displayAmount.toLocaleString()}
              </span>
            )}
          </div>

          {/* Middle: Action icons */}
          {tenant.phone && tenant.phone !== "••••••••••" ? (
            <div className="w-[84px] flex items-center justify-between my-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const phone = tenant.phone.replace(/\D/g, "");
                  const cleanPhone = phone.startsWith("91") ? phone : `91${phone}`;
                  const msg = !isPaid
                    ? encodeURIComponent(`Hi ${tenant.name}, your rent payment of ₹${dueAmount.toLocaleString()} for Room ${tenant.roomNo} is pending. Please pay at your earliest convenience. Thank you!`)
                    : "";
                  window.open(msg ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/${cleanPhone}`, "_blank");
                }}
                className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 hover:bg-emerald-100 transition-colors"
                title="Share on WhatsApp"
              >
                <MessageCircle className="h-4 w-4 stroke-[1.75]" />
              </button>
              <a
                href={`tel:${tenant.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 hover:bg-blue-100 transition-colors"
                title={`Call ${tenant.name}`}
              >
                <Phone className="h-4 w-4 stroke-[1.75]" />
              </a>
            </div>
          ) : (
            <div className="w-[84px] my-2" />
          )}

          {/* Bottom: Paid badge or Pay button */}
          <div className="w-[84px]">
            {isPaid ? (
              <span className="badge-paid-periwinkle w-full px-0 text-center block shrink-0">Paid</span>
            ) : isPartial ? (
              <button
                type="button"
                onClick={() => onPayRemaining(tenant.id)}
                className="btn-pay-black w-full px-0 text-center"
              >
                Pay
              </button>
            ) : (
              <button
                type="button"
                className="btn-pay-black w-full px-0 text-center"
                onClick={() => onMarkPaid(tenant.id, tenant.name, tenant.payment.paymentStatus)}
              >
                Pay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
