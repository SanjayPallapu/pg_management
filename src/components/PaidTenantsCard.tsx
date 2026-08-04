import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Banknote, Calendar, CheckCircle2, ChevronDown, MessageCircle, MessageSquare, Phone, Receipt, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  source: 'current' | 'arrears';
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
  const [viewMonth, setViewMonth] = useState<number>(selectedMonth);
  const [viewYear, setViewYear] = useState<number>(selectedYear);
  const [activeTab, setActiveTab] = useState<'present' | 'previous'>('present');
  const [receiptData, setReceiptData] = useState<PaidReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setViewMonth(selectedMonth);
      setViewYear(selectedYear);
    }
  }, [open, selectedMonth, selectedYear]);

  const years = useMemo(() => {
    const currentYr = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYr - 2 + i);
  }, []);

  const getPaymentCycle = (paymentDate?: string, fallbackMonth = viewMonth, fallbackYear = viewYear) => {
    if (paymentDate) {
      const parsed = new Date(paymentDate);
      if (!Number.isNaN(parsed.getTime())) {
        return { month: parsed.getMonth() + 1, year: parsed.getFullYear() };
      }
    }
    return { month: fallbackMonth, year: fallbackYear };
  };

  const previousPeriod = useMemo(() => {
    if (viewMonth === 1) return { month: 12, year: viewYear - 1 };
    return { month: viewMonth - 1, year: viewYear };
  }, [viewMonth, viewYear]);

  const { presentTenants, previousTenants, currentMonthTotal, arrearsSettledTotal } = useMemo(() => {
    const getPaidTenants = (month: number, year: number, paymentMonth?: number, paymentYear?: number, source: 'current' | 'arrears' = 'current'): PaidTenantRow[] => rooms
      .flatMap((room) => room.tenants.map((tenant) => ({ tenant, room })))
      .filter(({ tenant }) => !tenant.isLocked && isTenantActiveInMonth(tenant.startDate, tenant.endDate, year, month))
      .map(({ tenant, room }) => {
        const payment = payments.find(
          (item) => item.tenantId === tenant.id && item.month === month && item.year === year,
        );

        if (!payment || payment.paymentStatus !== 'Paid') return null;

        const cycle = getPaymentCycle(payment.paymentDate, month, year);
        if (paymentMonth !== undefined && paymentYear !== undefined) {
          if (cycle.month !== paymentMonth || cycle.year !== paymentYear) return null;
        }

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
          source,
        };
      })
      .filter((tenant): tenant is Exclude<typeof tenant, null> => tenant !== null)
      .sort((a, b) => {
        const dateDifference = (b.paymentDate || '').localeCompare(a.paymentDate || '');
        return dateDifference || a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
      });

    const currentMonthPayments = getPaidTenants(viewMonth, viewYear, viewMonth, viewYear, 'current');
    const arrearsPaidThisMonth = getPaidTenants(previousPeriod.month, previousPeriod.year, viewMonth, viewYear, 'arrears');
    const previousMonthPayments = getPaidTenants(previousPeriod.month, previousPeriod.year, previousPeriod.month, previousPeriod.year, 'current');

    return {
      presentTenants: [...currentMonthPayments, ...arrearsPaidThisMonth],
      previousTenants: previousMonthPayments,
      currentMonthTotal: currentMonthPayments.reduce((sum, tenant) => sum + tenant.amountPaid, 0),
      arrearsSettledTotal: arrearsPaidThisMonth.reduce((sum, tenant) => sum + tenant.amountPaid, 0),
    };
  }, [rooms, payments, viewMonth, viewYear, previousPeriod.month, previousPeriod.year]);

  const visibleTenants = activeTab === 'present' ? presentTenants : previousTenants;
  const visiblePeriod = activeTab === 'present'
    ? { month: viewMonth, year: viewYear }
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 text-left">
                  <SheetTitle className="text-base font-bold">Paid Tenants</SheetTitle>
                  <p className="truncate text-xs text-muted-foreground">
                    {monthNames[viewMonth - 1]} {viewYear} collections
                  </p>
                </div>
              </div>

              {/* Month Selector in Top Right Header */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold px-2.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs">{monthNames[viewMonth - 1]?.slice(0, 3)} {viewYear}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-muted-foreground">Select Month & Year</div>
                    <div className="flex gap-2">
                      <Select value={viewMonth.toString()} onValueChange={(val) => setViewMonth(parseInt(val))}>
                        <SelectTrigger className="w-[120px] h-9 text-xs">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthNames.map((m, idx) => (
                            <SelectItem key={m} value={(idx + 1).toString()} className="text-xs">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={viewYear.toString()} onValueChange={(val) => setViewYear(parseInt(val))}>
                        <SelectTrigger className="w-[85px] h-9 text-xs">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={y.toString()} className="text-xs">
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </SheetHeader>

          <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col overflow-y-auto bg-background px-3 py-1 sm:px-4">
            <Tabs className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'present' | 'previous')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="present" className="gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {monthNames[viewMonth - 1]?.slice(0, 3)} ({presentTenants.length})
                </TabsTrigger>
                <TabsTrigger value="previous" className="gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  {monthNames[previousPeriod.month - 1]?.slice(0, 3)} ({previousTenants.length})
                </TabsTrigger>
              </TabsList>

              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {monthNames[visiblePeriod.month - 1]} {visiblePeriod.year}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400">₹{totalPaid.toLocaleString()}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-semibold">
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                        Current month ₹{currentMonthTotal.toLocaleString()}
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                        Previous dues paid this month ₹{arrearsSettledTotal.toLocaleString()}
                      </span>
                    </div>
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
                        <div
                          key={`${tenant.id}-${tenant.source}-${tenant.paymentDate || ''}`}
                          className={`rounded-xl border p-3 ${tenant.source === 'arrears' ? 'border-amber-500/25 bg-amber-500/[0.08]' : 'border-emerald-500/25 bg-emerald-500/[0.07]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tenant.source === 'arrears' ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
                              <CheckCircle2 className={`h-5 w-5 ${tenant.source === 'arrears' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-sm font-semibold">{tenant.name}</p>
                                {tenant.source === 'arrears' && (
                                  <Badge className="border border-amber-500/20 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                    Previous month paid now
                                  </Badge>
                                )}
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
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white ${tenant.source === 'arrears' ? 'bg-amber-600' : 'bg-emerald-600'}`}>
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
