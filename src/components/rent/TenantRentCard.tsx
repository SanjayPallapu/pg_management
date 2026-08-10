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
      {/* Top Row: Name • Room No | Price for Paid, Action icons for Pending */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="truncate text-base font-bold text-foreground">{tenant.name}</span>
          <span className="text-slate-400 font-medium text-sm">•</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium text-sm shrink-0">R{tenant.roomNo}</span>
        </div>
        {isPaid ? (
          <span className="text-lg font-extrabold text-foreground shrink-0">
            ₹{displayAmount.toLocaleString()}
          </span>
        ) : tenant.phone && tenant.phone !== "••••••••••" ? (
          <div className="flex items-center gap-3.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const phone = tenant.phone.replace(/\D/g, "");
                const cleanPhone = phone.startsWith("91") ? phone : `91${phone}`;
                const msg = encodeURIComponent(`Hi ${tenant.name}, your rent payment of ₹${dueAmount.toLocaleString()} for Room ${tenant.roomNo} is pending. Please pay at your earliest convenience. Thank you!`);
                window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
              }}
              className="text-slate-600 hover:text-green-600 dark:text-slate-300 transition-colors p-0.5"
              title="Share on WhatsApp"
            >
              <MessageCircle className="h-5 w-5 stroke-[1.75]" />
            </button>
            <a
              href={`tel:${tenant.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-slate-600 hover:text-blue-600 dark:text-slate-300 transition-colors p-0.5"
              title={`Call ${tenant.name}`}
            >
              <Phone className="h-5 w-5 stroke-[1.75]" />
            </a>
          </div>
        ) : null}
      </div>

      {/* Second Row: Joined: Date | Action icons for Paid */}
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
          Joined: {formattedJoinedDate}
        </span>
        {isPaid && tenant.phone && tenant.phone !== "••••••••••" && (
          <div className="flex items-center gap-3.5 ml-auto shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const phone = tenant.phone.replace(/\D/g, "");
                const cleanPhone = phone.startsWith("91") ? phone : `91${phone}`;
                window.open(`https://wa.me/${cleanPhone}`, "_blank");
              }}
              className="text-slate-600 hover:text-green-600 dark:text-slate-300 transition-colors p-0.5"
              title="Share on WhatsApp"
            >
              <MessageCircle className="h-5 w-5 stroke-[1.75]" />
            </button>
            <a
              href={`tel:${tenant.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-slate-600 hover:text-blue-600 dark:text-slate-300 transition-colors p-0.5"
              title={`Call ${tenant.name}`}
            >
              <Phone className="h-5 w-5 stroke-[1.75]" />
            </a>
          </div>
        )}
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

      {/* Third Row: Payments breakdown */}
      {((tenant.payment.paymentEntries && tenant.payment.paymentEntries.length > 0) || isPaid) && (
        <div className="mt-2 space-y-1">
          <div className={cn("text-sm font-medium", !isPaid ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400")}>
            Payments:
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

      {/* Bottom Row: Red price badge (left) | Action Button / Badge (right) */}
      <div className="mt-3 flex items-center justify-between gap-3 pt-1">
        {!isPaid ? (
          <span className="price-badge-red shrink-0">
            ₹{displayAmount.toLocaleString()}
          </span>
        ) : (
          <div className="flex-1" />
        )}

        <div className="shrink-0 ml-auto">
          {isPaid ? (
            <span className="badge-paid-periwinkle">Paid</span>
          ) : isPartial ? (
            <button
              type="button"
              onClick={() => onPayRemaining(tenant.id)}
              className="btn-pay-black"
            >
              Pay
            </button>
          ) : (
            <button
              type="button"
              className="btn-pay-black"
              onClick={() => onMarkPaid(tenant.id, tenant.name, tenant.payment.paymentStatus)}
            >
              Pay
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
