import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Phone, MessageCircle, Receipt, MessageSquare, CheckCircle, ArrowLeft } from 'lucide-react';
import { Room, PaymentEntry } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { WhatsAppReceiptDialog } from './WhatsAppReceiptDialog';
import { PreviousOverdueSheet } from './PreviousOverdueSheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface OverduePaidCardProps {
  rooms: Room[];
}

interface TenantWithPayment {
  id: string;
  name: string;
  phone: string;
  roomNo: string;
  monthlyRent: number;
  startDate: string;
  capacity: number;
  amountPaid: number;
  paymentEntries: PaymentEntry[];
  allPaymentEntries: PaymentEntry[]; // All payment entries for receipt
}

interface StillPendingTenant {
  id: string;
  name: string;
  phone: string;
  roomNo: string;
  monthlyRent: number;
  startDate: string;
  amountPaid: number;
  remaining: number;
  status: 'Pending' | 'Partial';
}

export const OverduePaidCard = ({ rooms }: OverduePaidCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [stillPendingSheetOpen, setStillPendingSheetOpen] = useState(false);

  // Calculate previous month
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const overduePaidTenants = useMemo(() => {
    const results: TenantWithPayment[] = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        // Check if tenant was active in previous month
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)) {
          return;
        }

        // Check if they have a paid/partial payment for previous month
        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear
        );

        if (payment && (payment.paymentStatus === 'Paid' || payment.paymentStatus === 'Partial')) {
          // Check if any payment entry was made in the current month
          const entriesInCurrentMonth = payment.paymentEntries?.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() + 1 === selectedMonth && entryDate.getFullYear() === selectedYear;
          }) || [];

          if (entriesInCurrentMonth.length > 0) {
            results.push({
              id: tenant.id,
              name: tenant.name,
              phone: tenant.phone,
              roomNo: room.roomNo,
              monthlyRent: tenant.monthlyRent,
              startDate: tenant.startDate,
              capacity: room.capacity,
              amountPaid: payment.amountPaid || 0,
              paymentEntries: entriesInCurrentMonth,
              allPaymentEntries: payment.paymentEntries || [], // Store all entries for receipt
            });
          }
        }
      });
    });

    return results;
  }, [rooms, payments, prevMonth, prevYear, selectedMonth, selectedYear]);

  // Calculate still pending tenants (from previous month)
  const stillPendingTenants = useMemo(() => {
    const results: StillPendingTenant[] = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (tenant.isLocked) return;
        
        // Check if tenant was active in previous month
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)) {
          return;
        }

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear
        );

        if (!payment || payment.paymentStatus === 'Pending') {
          results.push({
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            roomNo: room.roomNo,
            monthlyRent: tenant.monthlyRent,
            startDate: tenant.startDate,
            amountPaid: 0,
            remaining: tenant.monthlyRent,
            status: 'Pending',
          });
        } else if (payment.paymentStatus === 'Partial') {
          const remaining = tenant.monthlyRent - (payment.amountPaid || 0);
          results.push({
            id: tenant.id,
            name: tenant.name,
            phone: tenant.phone,
            roomNo: room.roomNo,
            monthlyRent: tenant.monthlyRent,
            startDate: tenant.startDate,
            amountPaid: payment.amountPaid || 0,
            remaining,
            status: 'Partial',
          });
        }
      });
    });

    return results;
  }, [rooms, payments, prevMonth, prevYear]);

  const stillPendingTotal = stillPendingTenants.reduce((sum, t) => sum + t.remaining, 0);

  const totalCollected = overduePaidTenants.reduce((sum, t) => {
    return sum + t.paymentEntries.reduce((pSum, e) => pSum + e.amount, 0);
  }, 0);

  const upiTotal = overduePaidTenants.reduce((sum, t) => {
    return sum + t.paymentEntries.filter(e => e.mode === 'upi').reduce((pSum, e) => pSum + e.amount, 0);
  }, 0);

  const cashTotal = overduePaidTenants.reduce((sum, t) => {
    return sum + t.paymentEntries.filter(e => e.mode === 'cash').reduce((pSum, e) => pSum + e.amount, 0);
  }, 0);

  const handleGenerateReceipt = (tenant: TenantWithPayment) => {
    // Use all payment entries for the receipt, not just current month entries
    const lastEntry = tenant.allPaymentEntries[tenant.allPaymentEntries.length - 1];
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: lastEntry?.mode || 'cash',
      paymentDate: lastEntry?.date ? format(new Date(lastEntry.date), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy'),
      joiningDate: format(new Date(tenant.startDate), 'dd-MMM-yyyy'),
      forMonth: `${months[prevMonth - 1]} ${prevYear}`,
      roomNo: tenant.roomNo,
      sharingType: `${tenant.capacity} Sharing`,
      amount: tenant.monthlyRent,
      amountPaid: tenant.amountPaid,
      isFullPayment: tenant.amountPaid >= tenant.monthlyRent,
      remainingBalance: Math.max(0, tenant.monthlyRent - tenant.amountPaid),
      tenantId: tenant.id,
      paymentEntries: tenant.allPaymentEntries, // Use all entries for full history
    });
    setWhatsappDialogOpen(true);
  };

  if (overduePaidTenants.length === 0 && stillPendingTenants.length === 0) {
    return null;
  }

  return (
    <>
      <Card
        className="mb-4 cursor-pointer transition-colors hover:bg-accent/50 bg-gradient-to-r from-paid/10 to-paid/5 border-paid/30"
        onClick={() => setSheetOpen(true)}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-paid" />
              <div>
                <div className="font-semibold text-paid">
                  {months[prevMonth - 1]} Overdue Collected: ₹{totalCollected.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {overduePaidTenants.length} tenant(s) paid this month
                </div>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="text-blue-600 dark:text-blue-400">UPI: ₹{upiTotal.toLocaleString()}</div>
              <div className="text-green-600 dark:text-green-400">Cash: ₹{cashTotal.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent 
          side={isMobile ? "right" : "bottom"} 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "h-[80vh]"}
        >
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-orange-500">
                {months[prevMonth - 1]} Overdue Collections
              </SheetTitle>
              {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setSheetOpen(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-left">
              Payments received in {months[selectedMonth - 1]} for {months[prevMonth - 1]} dues
            </p>
          </SheetHeader>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Total Collected</p>
              <p className="text-xl font-bold text-paid">₹{totalCollected.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{overduePaidTenants.length} tenant(s)</p>
            </div>
            <div 
              className="p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (stillPendingTenants.length > 0) {
                  setStillPendingSheetOpen(true);
                }
              }}
            >
              <p className="text-xs text-muted-foreground">Still Pending</p>
              <p className="text-xl font-bold text-pending">₹{stillPendingTotal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">From {months[prevMonth - 1]}</p>
            </div>
          </div>

          {/* UPI/Cash breakdown */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-blue-600 dark:text-blue-400 text-[10px]">UPI •</span> UPI
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">₹{upiTotal.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-green-600 dark:text-green-400 text-[10px]">💵</span> Cash
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">₹{cashTotal.toLocaleString()}</p>
            </div>
          </div>

          <h3 className="font-semibold mt-4 mb-2">Payment Details</h3>

          <ScrollArea className={isMobile ? "h-[calc(100vh-380px)]" : "h-[calc(80vh-320px)]"}>
            <div className="space-y-3 pr-4">
              {overduePaidTenants.map(tenant => (
                <div
                  key={tenant.id}
                  className="p-4 rounded-lg border bg-paid-muted border-paid/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tenant.name}</span>
                        {tenant.phone && tenant.phone !== '••••••••••' && (
                          <>
                            <a
                              href={`tel:${tenant.phone}`}
                              className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => handleGenerateReceipt(tenant)} className="gap-2">
                                  <Receipt className="h-4 w-4" />
                                  Generate Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => window.open(`https://wa.me/${tenant.phone.replace(/\D/g, '')}`, '_blank')} 
                                  className="gap-2"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  Chat with Tenant
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Room {tenant.roomNo}
                      </p>
                    </div>
                    <Badge className="bg-paid text-paid-foreground">
                      ₹{tenant.paymentEntries.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                    </Badge>
                  </div>

                  {/* Payment entries */}
                  <div className="space-y-1">
                    {tenant.paymentEntries.map((entry, idx) => (
                      <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>
                          {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Paid'}:
                          ₹{entry.amount.toLocaleString()} on {format(new Date(entry.date), 'dd MMM yyyy')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          entry.mode === 'upi'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Still Pending Sheet */}
      <Sheet open={stillPendingSheetOpen} onOpenChange={setStillPendingSheetOpen}>
        <SheetContent 
          side={isMobile ? "right" : "bottom"} 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "h-[70vh]"}
        >
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-pending">
                Still Pending from {months[prevMonth - 1]}
              </SheetTitle>
              {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setStillPendingSheetOpen(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-left">
              {stillPendingTenants.length} tenant(s) • Total: ₹{stillPendingTotal.toLocaleString()}
            </p>
          </SheetHeader>

          <ScrollArea className={isMobile ? "h-[calc(100vh-150px)]" : "h-[calc(70vh-120px)]"}>
            <div className="space-y-3 pr-4 mt-4">
              {stillPendingTenants.map(tenant => (
                <div
                  key={tenant.id}
                  className="p-4 rounded-lg border bg-pending-muted border-pending/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tenant.name}</span>
                        {tenant.phone && tenant.phone !== '••••••••••' && (
                          <>
                            <a
                              href={`tel:${tenant.phone}`}
                              className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                            <a
                              href={`https://wa.me/91${tenant.phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Room {tenant.roomNo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tenant.status === 'Partial' 
                          ? `Paid: ₹${tenant.amountPaid.toLocaleString()} • Pending: ₹${tenant.remaining.toLocaleString()}`
                          : `Full rent pending`
                        }
                      </p>
                    </div>
                    <span className="font-bold text-lg text-pending">
                      ₹{tenant.remaining.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}

              {stillPendingTenants.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No pending amounts from {months[prevMonth - 1]}!
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <WhatsAppReceiptDialog
        open={whatsappDialogOpen}
        onOpenChange={setWhatsappDialogOpen}
        receiptData={receiptData}
        onWhatsappSent={() => {}}
      />
    </>
  );
};
