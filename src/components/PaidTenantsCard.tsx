import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Banknote, CheckCircle2, MessageCircle, MessageSquare, Phone, Receipt, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { isTenantActiveInMonth, parseDateOnly } from '@/utils/dateOnly';
import { PaymentEntry, Room } from '@/types';
import { WhatsAppReceiptDialog } from '@/components/WhatsAppReceiptDialog';

interface PaidTenantsCardProps {
  rooms: Room[];
  open: boolean;
  onClose: () => void;
}

interface PaidTenantRow {
  id: string;
  name: string;
  phone: string;
  roomNo: string;
  amountPaid: number;
  monthlyRent: number;
  startDate: string;
  roomCapacity: number;
  paymentDate?: string;
  paymentEntries: PaymentEntry[];
}

interface PaidReceiptData {
  tenantName: string;
  tenantPhone: string;
  paymentMode: string;
  paymentDate: string;
  joiningDate: string;
  forMonth: string;
  roomNo: string;
  sharingType: string;
  amount: number;
  amountPaid: number;
  isFullPayment: boolean;
  remainingBalance: number;
  paymentEntries: PaymentEntry[];
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const PaidTenantsCard = ({ rooms, open, onClose }: PaidTenantsCardProps) => {
  const isMobile = useIsMobile();
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const [activeTab, setActiveTab] = useState<'present' | 'previous'>('present');
  const [receiptData, setReceiptData] = useState<PaidReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const previousPeriod = useMemo(() => {
    if (selectedMonth === 1) return { month: 12, year: selectedYear - 1 };
    return { month: selectedMonth - 1, year: selectedYear };
  }, [selectedMonth, selectedYear]);

  const { presentTenants, previousTenants } = useMemo(() => {
    const getPaidTenants = (month: number, year: number): PaidTenantRow[] => rooms
      .flatMap((room) => room.tenants.map((tenant) => ({ tenant, room })))
      .filter(({ tenant }) => !tenant.isLocked && isTenantActiveInMonth(tenant.startDate, tenant.endDate, year, month))
      .map(({ tenant, room }) => {
        const payment = payments.find(
          (item) => item.tenantId === tenant.id && item.month === month && item.year === year,
        );

        if (!payment || payment.paymentStatus !== 'Paid') return null;

        const entryTotal = payment.paymentEntries.reduce((sum, entry) => sum + entry.amount, 0);
        return {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          roomNo: room.roomNo,
          amountPaid: payment.amountPaid || entryTotal || payment.amount,
          monthlyRent: tenant.monthlyRent,
          startDate: tenant.startDate,
          roomCapacity: room.capacity,
          paymentDate: payment.paymentDate,
          paymentEntries: payment.paymentEntries,
        };
      })
      .filter((tenant): tenant is PaidTenantRow => tenant !== null)
      .sort((a, b) => {
        const dateDifference = (b.paymentDate || '').localeCompare(a.paymentDate || '');
        return dateDifference || a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
      });

    return {
      presentTenants: getPaidTenants(selectedMonth, selectedYear),
      previousTenants: getPaidTenants(previousPeriod.month, previousPeriod.year),
    };
  }, [rooms, payments, selectedMonth, selectedYear, previousPeriod.month, previousPeriod.year]);

  const visibleTenants = activeTab === 'present' ? presentTenants : previousTenants;
  const visiblePeriod = activeTab === 'present'
    ? { month: selectedMonth, year: selectedYear }
    : previousPeriod;
  const totalPaid = visibleTenants.reduce((sum, tenant) => sum + tenant.amountPaid, 0);
  const upiTotal = visibleTenants.reduce(
    (sum, tenant) => sum + tenant.paymentEntries.filter((entry) => entry.mode === 'upi').reduce((entrySum, entry) => entrySum + entry.amount, 0),
    0,
  );
  const cashTotal = visibleTenants.reduce(
    (sum, tenant) => sum + tenant.paymentEntries.filter((entry) => entry.mode === 'cash').reduce((entrySum, entry) => entrySum + entry.amount, 0),
    0,
  );

  const openReceipt = (tenant: PaidTenantRow) => {
    const lastEntry = tenant.paymentEntries[tenant.paymentEntries.length - 1];
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: lastEntry?.mode || 'cash',
      paymentDate: tenant.paymentDate ? format(parseDateOnly(tenant.paymentDate), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy'),
      joiningDate: format(parseDateOnly(tenant.startDate), 'dd-MMM-yyyy'),
      forMonth: `${monthNames[visiblePeriod.month - 1]} ${visiblePeriod.year}`,
      roomNo: tenant.roomNo,
      sharingType: `${tenant.roomCapacity} Sharing`,
      amount: tenant.monthlyRent,
      amountPaid: tenant.amountPaid,
      isFullPayment: true,
      remainingBalance: 0,
      paymentEntries: tenant.paymentEntries,
    });
    setReceiptOpen(true);
  };

  return (
    <>
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        className={isMobile ? 'w-full max-w-full sm:max-w-full p-0 [&>button]:hidden bg-background' : 'w-full sm:max-w-xl p-0 bg-background'}
      >
        <div className="flex h-full flex-col bg-background">
          <SheetHeader className="mx-auto w-full max-w-screen-2xl shrink-0 border-b bg-background px-3 pb-3 pt-4 sm:px-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 text-left">
                <SheetTitle className="text-base font-bold">Paid Tenants</SheetTitle>
                <p className="truncate text-xs text-muted-foreground">Present and previous month collections</p>
              </div>
            </div>
          </SheetHeader>

          <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col overflow-y-auto bg-background px-3 py-1 sm:px-4">
            <Tabs className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'present' | 'previous')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="present" className="gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Present ({presentTenants.length})
                </TabsTrigger>
                <TabsTrigger value="previous" className="gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  Previous ({previousTenants.length})
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {monthNames[visiblePeriod.month - 1]} {visiblePeriod.year}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">₹{totalPaid.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{visibleTenants.length} fully paid tenant{visibleTenants.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="space-y-1 text-right text-xs">
                    <p className="flex items-center justify-end gap-1.5 text-blue-600 dark:text-blue-400">
                      <Smartphone className="h-3.5 w-3.5" /> UPI ₹{upiTotal.toLocaleString()}
                    </p>
                    <p className="flex items-center justify-end gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Banknote className="h-3.5 w-3.5" /> Cash ₹{cashTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {(['present', 'previous'] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4 focus-visible:outline-none focus-visible:ring-0">
                  {visibleTenants.length === 0 ? (
                    <div className="py-12 text-center">
                      <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
                      <p className="text-sm font-medium">No fully paid tenants</p>
                      <p className="mt-1 text-xs text-muted-foreground">Payments marked as paid will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pb-8">
                      {visibleTenants.map((tenant) => (
                        <div key={tenant.id} className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-sm font-semibold">{tenant.name}</p>
                                {tenant.phone && tenant.phone !== '••••••••••' && (
                                  <a
                                    href={`tel:${tenant.phone}`}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600"
                                    aria-label={`Call ${tenant.name}`}
                                  >
                                    <Phone className="h-3 w-3" />
                                  </a>
                                )}
                                {tenant.phone && tenant.phone !== '••••••••••' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-400"
                                        aria-label={`Chat and receipt options for ${tenant.name}`}
                                      >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                      <DropdownMenuItem className="gap-2" onClick={() => setTimeout(() => openReceipt(tenant), 100)}>
                                        <Receipt className="h-4 w-4" />
                                        Generate Receipt
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => {
                                          const phone = tenant.phone.replace(/\D/g, '');
                                          window.location.href = `https://wa.me/${phone}`;
                                        }}
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                        Chat with Tenant
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Room {tenant.roomNo}
                                {tenant.paymentDate && (
                                  <span className="ml-2">Paid {format(parseDateOnly(tenant.paymentDate), 'dd MMM yy')}</span>
                                )}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                              ₹{tenant.amountPaid.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <WhatsAppReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} receiptData={receiptData} />
    </>
  );
};
