import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { User, Phone, MessageCircle, CreditCard, ArrowLeft } from 'lucide-react';
import { Tenant, Room, TenantPayment } from '@/types';
import { isTenantActiveInMonth, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  if (day === null) return null;

  // Get tenants who need to pay on this day (joined on this day and haven't paid)
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

        // Check if tenant's joining day matches
        const joinDay = new Date(tenant.startDate).getDate();
        if (joinDay !== day) return false;

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

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const openWhatsAppChat = (phone: string) => {
    const formattedPhone = phone.replace(/\D/g, '');
    const phoneWithCode = formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`;
    window.open(`https://wa.me/${phoneWithCode}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "w-full sm:max-w-md"}
      >
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
          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-3 pr-4">
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
                            <div className="text-xs text-muted-foreground mt-1">
                              Joined: {format(parseDateOnly(tenant.startDate), 'dd MMM yyyy')}
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
                          <>
                            <a
                              href={`tel:${tenant.phone}`}
                              className="p-2 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              title={`Call ${tenant.name}`}
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => openWhatsAppChat(tenant.phone)}
                              className="p-2 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              title={`WhatsApp ${tenant.name}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};