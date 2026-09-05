import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Phone, MessageCircle, CreditCard, ArrowLeft, CalendarClock, AlertCircle, CheckCircle2 } from 'lucide-react';
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

  const today = new Date();
  const todayDate = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;
  const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth);

  // Get tenants who need to pay on this day (effective due day = agreed paymentDueDay or joining day)
  const tenantsDueOnDay = rooms.flatMap(room =>
    room.tenants
      .filter(tenant => {
        if (tenant.isLocked) return false;
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          return false;
        }
        if (hasTenantLeftNow(tenant.endDate)) return false;

        const joinDate = parseDateOnly(tenant.startDate);
        const joinDay = joinDate.getDate();
        const hasAgreedDelay = typeof tenant.paymentDueDay === 'number' && tenant.paymentDueDay >= 1 && tenant.paymentDueDay <= 31;
        const effectiveDueDay = hasAgreedDelay ? tenant.paymentDueDay! : joinDay;

        if (effectiveDueDay !== day) return false;

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );
        const isPaid = payment?.paymentStatus === 'Paid';
        if (isPaid) return false;

        const amountPaid = payment?.amountPaid || 0;
        const balance = Math.max(0, tenant.monthlyRent - amountPaid);
        return balance > 0;
      })
      .map(tenant => {
        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );
        const amountPaid = payment?.amountPaid || 0;
        const balance = Math.max(0, tenant.monthlyRent - amountPaid);
        const joinDate = parseDateOnly(tenant.startDate);
        const joinDay = joinDate.getDate();
        const hasAgreedDelay = typeof tenant.paymentDueDay === 'number' && tenant.paymentDueDay >= 1 && tenant.paymentDueDay <= 31;
        const delayDays = hasAgreedDelay 
          ? (tenant.paymentDelayDays ?? (tenant.paymentDueDay! >= joinDay ? tenant.paymentDueDay! - joinDay : (30 - joinDay + tenant.paymentDueDay!)))
          : 0;

        const isDueToday = isCurrentMonth && day === todayDate;
        const isDelayedWithinGrace = Boolean(hasAgreedDelay && isCurrentMonth && todayDate <= day);
        const isOverduePastAgreed = Boolean(hasAgreedDelay && (isPastMonth || (isCurrentMonth && todayDate > day)));
        const isStandardOverdue = Boolean(!hasAgreedDelay && (isPastMonth || (isCurrentMonth && todayDate > day)));

        return {
          ...tenant,
          roomNo: room.roomNo,
          capacity: room.capacity,
          payment,
          amountPaid,
          balance,
          joinDay,
          hasAgreedDelay,
          delayDays,
          isDueToday,
          isDelayedWithinGrace,
          isOverduePastAgreed,
          isStandardOverdue,
        };
      })
  );

  const totalDue = tenantsDueOnDay.reduce((sum, t) => sum + t.balance, 0);
  const delayedTenants = tenantsDueOnDay.filter(t => t.hasAgreedDelay);
  const regularTenants = tenantsDueOnDay.filter(t => !t.hasAgreedDelay);
  const delayedDue = delayedTenants.reduce((sum, t) => sum + t.balance, 0);
  const regularDue = regularTenants.reduce((sum, t) => sum + t.balance, 0);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openWhatsAppChat = (tenant: typeof tenantsDueOnDay[0]) => {
    const formattedPhone = tenant.phone.replace(/\D/g, '');
    const phoneWithCode = formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`;
    let msg = '';
    if (tenant.hasAgreedDelay) {
      if (tenant.isDelayedWithinGrace) {
        msg = `Hi ${tenant.name}, friendly reminder for your agreed rent payment of ₹${tenant.balance.toLocaleString()} for Room ${tenant.roomNo}, scheduled for the ${tenant.paymentDueDay}th. Thank you!`;
      } else {
        msg = `Hi ${tenant.name}, your agreed rent payment of ₹${tenant.balance.toLocaleString()} for Room ${tenant.roomNo} was due on the ${tenant.paymentDueDay}th and is now pending. Please clear it at your earliest convenience. Thank you!`;
      }
    } else {
      msg = `Hi ${tenant.name}, your rent payment of ₹${tenant.balance.toLocaleString()} for Room ${tenant.roomNo} is pending. Please pay at your earliest convenience. Thank you!`;
    }
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const isToday = isCurrentMonth && day === todayDate;
  const isPast = isPastMonth || (isCurrentMonth && day < todayDate);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background">
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 -ml-2" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-bold">
                    Day {day} Collections
                  </SheetTitle>
                  {isToday && (
                    <Badge className="bg-emerald-600 text-white text-[10px] h-4 px-1.5">Today</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {months[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary Card */}
          <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-medium">Total Pending on Day {day}</div>
                <div className="text-2xl font-bold text-foreground">
                  ₹{totalDue.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground font-medium">Total Tenants</div>
                <div className="text-2xl font-bold text-foreground">
                  {tenantsDueOnDay.length}
                </div>
              </div>
            </div>

            {/* Split if there are delayed tenants */}
            {delayedTenants.length > 0 && regularTenants.length > 0 && (
              <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/80 p-2 rounded-lg border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">Standard Due</span>
                  <span className="font-semibold text-foreground">₹{regularDue.toLocaleString()}</span>
                  <span className="text-muted-foreground text-[10px] block">({regularTenants.length} tenants)</span>
                </div>
                <div className="bg-purple-500/10 dark:bg-purple-950/30 p-2 rounded-lg border border-purple-500/20">
                  <span className="text-purple-700 dark:text-purple-300 font-medium block text-[10px] flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Agreed Delayed
                  </span>
                  <span className="font-semibold text-purple-700 dark:text-purple-300">₹{delayedDue.toLocaleString()}</span>
                  <span className="text-purple-600/80 dark:text-purple-400 text-[10px] block">({delayedTenants.length} tenants)</span>
                </div>
              </div>
            )}
          </div>

          {/* Tenant List */}
          <div className="space-y-3">
            {tenantsDueOnDay.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <span className="text-sm font-medium">No pending collections for Day {day}</span>
                <span className="text-xs">All scheduled rents for this day are either paid or not due.</span>
              </div>
            ) : (
              tenantsDueOnDay.map(tenant => {
                const isPartial = tenant.amountPaid > 0;

                return (
                  <div
                    key={tenant.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      tenant.hasAgreedDelay 
                        ? 'border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/15' 
                        : 'border-border bg-card hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          tenant.hasAgreedDelay 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' 
                            : 'bg-primary/10 text-primary'
                        }`}>
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate">{tenant.name}</span>
                            <span className="text-xs text-muted-foreground font-medium">
                              Room {tenant.roomNo} • {tenant.capacity} Sharing
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] px-1.5 py-0 h-4 ${
                                isPartial
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  : 'bg-red-500/15 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {isPartial ? 'Partial' : 'Pending'}
                            </Badge>
                          </div>

                          {/* Delay / Due Context */}
                          {tenant.hasAgreedDelay ? (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-xs">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <CalendarClock className="h-3 w-3" />
                                Agreed Delay: {tenant.paymentDueDay}th
                                {tenant.delayDays > 0 && ` (+${tenant.delayDays}d)`}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Joined {format(parseDateOnly(tenant.startDate), 'd MMM')}
                              </span>
                              {isCurrentMonth && (
                                tenant.isDueToday ? (
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                    • Due Today!
                                  </span>
                                ) : tenant.isDelayedWithinGrace ? (
                                  <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
                                    • In grace (due in {day - todayDate}d)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-destructive">
                                    • Agreed date passed by {todayDate - day}d
                                  </span>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                              <span>Standard due: Joined {format(parseDateOnly(tenant.startDate), 'd MMM yyyy')}</span>
                              {isCurrentMonth && isPast && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  (Overdue {todayDate - day}d)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <div className="text-sm font-bold text-destructive">
                          ₹{tenant.balance.toLocaleString()}
                        </div>
                        {isPartial && (
                          <div className="text-[10px] text-muted-foreground">
                            Paid: ₹{tenant.amountPaid.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Rent: ₹{tenant.monthlyRent.toLocaleString()}/mo</span>
                      </div>
                      
                      {tenant.phone && tenant.phone !== '••••••••••' && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openWhatsAppChat(tenant)}
                            className="h-8 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 border-emerald-500/20"
                            title={tenant.hasAgreedDelay ? "Send Agreed Delay Reminder" : "Share on WhatsApp"}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            WhatsApp
                          </Button>
                          <a
                            href={`tel:${tenant.phone}`}
                            className="h-8 w-8 rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center transition-colors"
                            title={`Call ${tenant.name}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
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
      </SheetContent>
    </Sheet>
  );
};