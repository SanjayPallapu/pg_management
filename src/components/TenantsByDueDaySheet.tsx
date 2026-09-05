import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Phone, MessageCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { Room, TenantPayment } from '@/types';
import { isTenantActiveInMonth, hasTenantLeftNow, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';

interface TenantsByDueDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: number | null;
  rooms: Room[];
  payments: TenantPayment[];
  selectedMonth: number;
  selectedYear: number;
}

export const TenantsByDueDaySheet = ({
  open,
  onOpenChange,
  day,
  rooms,
  payments,
  selectedMonth,
  selectedYear,
}: TenantsByDueDaySheetProps) => {
  if (day === null) return null;

  // Get tenants who need to pay on this day (effective due day = agreed paymentDueDay or joining day)
  const tenantsDueOnDay = rooms.flatMap(room =>
    room.tenants
      .filter(tenant => {
        // Skip locked tenants
        if (tenant.isLocked) return false;
        
        // Check if tenant is active in the selected month
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          return false;
        }
        
        // Exclude tenants who have already left
        if (hasTenantLeftNow(tenant.endDate)) return false;

        // Check if tenant's due day matches (agreed payment day or joining day)
        const joinDay = parseDateOnly(tenant.startDate).getDate();
        const dueDay = tenant.paymentDueDay || joinDay;
        if (dueDay !== day) return false;

        // Check if payment is pending or partial
        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );
        return !payment || payment.paymentStatus === 'Pending' || payment.paymentStatus === 'Partial';
      })
      .map(tenant => ({
        ...tenant,
        roomNo: room.roomNo,
        capacity: room.capacity,
        payment: payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        ),
      }))
  );

  const totalDue = tenantsDueOnDay.reduce((sum, t) => {
    const payment = t.payment;
    const amountPaid = payment?.amountPaid || 0;
    return sum + (t.monthlyRent - amountPaid);
  }, 0);

  const delayedCount = tenantsDueOnDay.filter(t => Boolean(t.paymentDueDay)).length;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openWhatsAppChat = (phone: string, tenantName?: string, balance?: number, roomNo?: string, paymentDueDay?: number | null) => {
    const formattedPhone = phone.replace(/\D/g, '');
    const phoneWithCode = formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`;
    let msg = '';
    if (tenantName && balance && roomNo) {
      if (paymentDueDay) {
        msg = encodeURIComponent(`Hi ${tenantName}, friendly reminder for your agreed rent payment of ₹${balance.toLocaleString()} for Room ${roomNo} (due on ${paymentDueDay}th). Please pay at your earliest convenience. Thank you!`);
      } else {
        msg = encodeURIComponent(`Hi ${tenantName}, your rent payment of ₹${balance.toLocaleString()} for Room ${roomNo} is pending. Please pay at your earliest convenience. Thank you!`);
      }
    }
    window.open(msg ? `https://wa.me/${phoneWithCode}?text=${msg}` : `https://wa.me/${phoneWithCode}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              Day {day} - Pending Collections
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </SheetHeader>

        <div className="space-y-4">
          {/* Summary Card */}
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total Pending</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ₹{totalDue.toLocaleString()}
                </div>
                {delayedCount > 0 && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Includes {delayedCount} agreed delay tenant(s)
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Tenants</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {tenantsDueOnDay.length}
                </div>
              </div>
            </div>
          </div>

          {/* Tenant List */}
          <div>
            <div className="space-y-3">
              {tenantsDueOnDay.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending payments for Day {day}
                </div>
              ) : (
                tenantsDueOnDay.map(tenant => {
                  const amountPaid = tenant.payment?.amountPaid || 0;
                  const balance = tenant.monthlyRent - amountPaid;
                  const isPartial = amountPaid > 0;

                  return (
                    <div
                      key={tenant.id}
                      className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{tenant.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Room {tenant.roomNo} • {tenant.capacity} Sharing
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                              <span>Joined: {format(parseDateOnly(tenant.startDate), 'dd MMM yyyy')}</span>
                              {tenant.paymentDueDay && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                                  Agreed {tenant.paymentDueDay}th
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            className={
                              isPartial
                                ? 'bg-partial text-partial-foreground'
                                : 'bg-pending text-pending-foreground'
                            }
                          >
                            {isPartial ? 'Partial' : 'Pending'}
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-bold text-destructive">
                              ₹{balance.toLocaleString()}
                            </div>
                            {isPartial && (
                              <div className="text-xs text-muted-foreground">
                                Paid: ₹{amountPaid.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CreditCard className="h-4 w-4" />
                          <span>₹{tenant.monthlyRent.toLocaleString()}/mo</span>
                        </div>
                        <div className="flex-1" />
                        {tenant.phone && tenant.phone !== '••••••••••' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openWhatsAppChat(tenant.phone, tenant.name, balance, tenant.roomNo, tenant.paymentDueDay)}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                              title="Share on WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <a
                              href={`tel:${tenant.phone}`}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                              title={`Call ${tenant.name}`}
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};