import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, CheckCircle2, ChevronDown, MessageCircle, MessageSquare, Phone, Receipt } from 'lucide-react';
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
import { AllCollectedCard } from '@/components/AllCollectedCard';
import { ProfileStatusBadge, useOnboardingProfileMap } from '@/features/tenant-onboarding';

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
  const onboardingProfileMap = useOnboardingProfileMap();

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

  const previousPeriod = useMemo(() => {
    if (viewMonth === 1) return { month: 12, year: viewYear - 1 };
    return { month: viewMonth - 1, year: viewYear };
  }, [viewMonth, viewYear]);

  const { presentCurrentTenants, presentArrearsTenants, previousTenants, currentMonthTotal, arrearsSettledTotal } = useMemo(() => {
    const getPaymentCycle = (paymentDate: string | undefined, fallbackMonth: number, fallbackYear: number) => {
      if (paymentDate) {
        const parsed = new Date(paymentDate);
        if (!Number.isNaN(parsed.getTime())) {
          return { month: parsed.getMonth() + 1, year: parsed.getFullYear() };
        }
      }
      return { month: fallbackMonth, year: fallbackYear };
    };

    const getPaidTenants = (
      month: number,
      year: number,
      paymentMonth: number,
      paymentYear: number,
      source: 'current' | 'arrears',
    ): PaidTenantRow[] => rooms
      .flatMap((room) => room.tenants.map((tenant) => ({ tenant, room })))
      .filter(({ tenant }) => !tenant.isLocked && isTenantActiveInMonth(tenant.startDate, tenant.endDate, year, month))
      .map(({ tenant, room }) => {
        const payment = payments.find(
          (item) => item.tenantId === tenant.id && item.month === month && item.year === year,
        );
        if (!payment || payment.paymentStatus !== 'Paid') return null;

        const cycle = getPaymentCycle(payment.paymentDate, month, year);
        if (cycle.month !== paymentMonth || cycle.year !== paymentYear) return null;

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
        } as PaidTenantRow;
      })
      .filter((tenant): tenant is PaidTenantRow => tenant !== null)
      .sort((a, b) => {
        const dateDifference = (b.paymentDate || '').localeCompare(a.paymentDate || '');
        return dateDifference || a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
      });

    const currentMonthPayments = getPaidTenants(viewMonth, viewYear, viewMonth, viewYear, 'current');
    const arrearsPaidThisMonth = getPaidTenants(previousPeriod.month, previousPeriod.year, viewMonth, viewYear, 'arrears');
    const previousMonthPayments = getPaidTenants(previousPeriod.month, previousPeriod.year, previousPeriod.month, previousPeriod.year, 'current');

    return {
      presentCurrentTenants: currentMonthPayments,
      presentArrearsTenants: arrearsPaidThisMonth,
      previousTenants: previousMonthPayments,
      currentMonthTotal: currentMonthPayments.reduce((sum, tenant) => sum + tenant.amountPaid, 0),
      arrearsSettledTotal: arrearsPaidThisMonth.reduce((sum, tenant) => sum + tenant.amountPaid, 0),
    };
  }, [rooms, payments, viewMonth, viewYear, previousPeriod.month, previousPeriod.year]);

  const presentCount = presentCurrentTenants.length + presentArrearsTenants.length;
  const previousTotal = previousTenants.reduce((sum, tenant) => sum + tenant.amountPaid, 0);

  const openReceipt = (tenant: PaidTenantRow, period: { month: number; year: number }) => {
    const lastEntry = tenant.paymentEntries[tenant.paymentEntries.length - 1];
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: lastEntry?.mode || 'cash',
      paymentDate: tenant.paymentDate ? format(parseDateOnly(tenant.paymentDate), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy'),
      joiningDate: format(parseDateOnly(tenant.startDate), 'dd-MMM-yyyy'),
      forMonth: `${monthNames[period.month - 1]} ${period.year}`,
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

  const TenantRow = ({ tenant, period }: { tenant: PaidTenantRow; period: { month: number; year: number } }) => (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3">
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
                  <DropdownMenuItem className="gap-2" onClick={() => setTimeout(() => openReceipt(tenant, period), 100)}>
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
  );

  const SectionHeading = ({ title, amount, count }: { title: string; amount: number; count: number }) => (
    <div className="flex items-end justify-between rounded-lg border-l-4 border-emerald-500 bg-emerald-500/[0.06] px-3 py-2">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{title}</p>
        <p className="text-[11px] text-muted-foreground">{count} tenant{count === 1 ? '' : 's'}</p>
      </div>
      <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">₹{amount.toLocaleString()}</p>
    </div>
  );

  const emptyState = (
    <div className="py-12 text-center">
      <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
      <p className="text-sm font-medium">No fully paid tenants</p>
      <p className="mt-1 text-xs text-muted-foreground">Payments marked as paid will appear here.</p>
    </div>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <SheetContent
          side="right"
          className={isMobile ? 'w-full max-w-full sm:max-w-full p-0 [&>button]:hidden bg-background' : 'w-full sm:max-w-xl p-0 bg-background'}
        >
          <div className="flex h-full flex-col bg-background">
            <SheetHeader className="mx-auto w-full max-w-screen-2xl shrink-0 border-b bg-background px-2 pb-3 pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-emerald-500/30 bg-emerald-500/10 px-2.5 font-bold text-emerald-700 dark:text-emerald-300">
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
                          <SelectTrigger className="h-9 w-[120px] text-xs">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {monthNames.map((m, idx) => (
                              <SelectItem key={m} value={(idx + 1).toString()} className="text-xs">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={viewYear.toString()} onValueChange={(val) => setViewYear(parseInt(val))}>
                          <SelectTrigger className="h-9 w-[85px] text-xs">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </SheetHeader>

            <div className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col overflow-y-auto bg-background px-1.5 py-3">
              <AllCollectedCard rooms={rooms} />

              <Tabs className="mt-4 w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'present' | 'previous')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="present" className="gap-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {monthNames[viewMonth - 1]?.slice(0, 3)} ({presentCount})
                  </TabsTrigger>
                  <TabsTrigger value="previous" className="gap-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {monthNames[previousPeriod.month - 1]?.slice(0, 3)} ({previousTenants.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="present" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
                  {presentCount === 0 ? emptyState : (
                    <div className="space-y-5 pb-8">
                      <div className="space-y-2">
                        <SectionHeading title="This Month Rent" amount={currentMonthTotal} count={presentCurrentTenants.length} />
                        {presentCurrentTenants.length === 0 ? (
                          <p className="px-1 text-xs text-muted-foreground">No payments yet for this month.</p>
                        ) : presentCurrentTenants.map((tenant) => (
                          <TenantRow key={`cur-${tenant.id}`} tenant={tenant} period={{ month: viewMonth, year: viewYear }} />
                        ))}
                      </div>

                      {presentArrearsTenants.length > 0 && (
                        <div className="space-y-2">
                          <SectionHeading title="Previous Month Amount" amount={arrearsSettledTotal} count={presentArrearsTenants.length} />
                          {presentArrearsTenants.map((tenant) => (
                            <TenantRow key={`arr-${tenant.id}`} tenant={tenant} period={previousPeriod} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="previous" className="mt-4 focus-visible:outline-none focus-visible:ring-0">
                  {previousTenants.length === 0 ? emptyState : (
                    <div className="space-y-2 pb-8">
                      <SectionHeading title={`${monthNames[previousPeriod.month - 1]} Collections`} amount={previousTotal} count={previousTenants.length} />
                      {previousTenants.map((tenant) => (
                        <TenantRow key={`prev-${tenant.id}`} tenant={tenant} period={previousPeriod} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <WhatsAppReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} receiptData={receiptData} />
    </>
  );
};
