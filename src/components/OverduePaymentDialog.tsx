import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CalendarIcon, CheckCircle2, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UpiLogo } from './icons/UpiLogo';
import { CashLogo } from './icons/CashLogo';
import { StayPeriodIndicator } from './StayPeriodIndicator';
import { PaymentEntry } from '@/types';
import { useCollectorNames } from '@/hooks/useCollectorNames';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface PreviousMonthPending {
  month: number;
  year: number;
  amount: number;
  amountPaid: number;
  remaining: number;
}

interface OverduePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    roomNo: string;
    monthlyRent: number;
    remaining: number;
    amountPaid: number;
    startDate?: string;
    endDate?: string;
    paymentEntries?: PaymentEntry[];
    proRataInfo?: {
      effectiveRent: number;
      daysStayed: number;
      dailyRate: number;
    };
  } | null;
  month: number;
  year: number;
  previousMonthPending?: PreviousMonthPending | null;
  onConfirmPayment: (data: {
    tenantId: string;
    amount: number;
    date: string;
    mode: 'upi' | 'cash';
    month: number;
    year: number;
    monthlyRent: number;
    existingPaid: number;
    previousMonthPending?: PreviousMonthPending | null;
    discount?: number;
    notes?: string;
    collectedBy?: string;
  }) => void;
}

type Step = 'confirm' | 'payment';

export const OverduePaymentDialog = ({
  open,
  onOpenChange,
  tenant,
  month,
  year,
  previousMonthPending,
  onConfirmPayment,
}: OverduePaymentDialogProps) => {
  const [step, setStep] = useState<Step>('confirm');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [dateOpen, setDateOpen] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const { collectors } = useCollectorNames();
  const [collectedBy, setCollectedBy] = useState<string>(collectors[0]?.displayName || 'Owner');

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('confirm');
      setPaymentAmount(0);
      setPaymentDate(new Date());
      setPaymentMode('upi');
      setDiscount(0);
      setCollectedBy(collectors[0]?.displayName || 'Owner');
    }
    onOpenChange(isOpen);
  };

  const handleProceedToPayment = () => {
    if (tenant) {
      setPaymentAmount(tenant.remaining);
      setStep('payment');
    }
  };

  const handleConfirmPayment = () => {
    if (!tenant) return;
    
    // Build notes string for discount
    let notes = '';
    if (discount > 0) {
      notes = `Discount: ₹${discount}`;
    }
    
    onConfirmPayment({
      tenantId: tenant.id,
      amount: paymentAmount,
      date: format(paymentDate, 'yyyy-MM-dd'),
      mode: paymentMode,
      month,
      year,
      monthlyRent: tenant.monthlyRent,
      existingPaid: tenant.amountPaid,
      previousMonthPending: previousMonthPending,
      discount: discount > 0 ? discount : undefined,
      notes: notes || undefined,
      collectedBy,
    });
    
    handleOpenChange(false);
  };

  if (!tenant) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full max-w-full p-0 sm:max-w-lg [&>button]:hidden">
        <div className="flex h-full flex-col bg-background">
          <SheetHeader className="shrink-0 border-b bg-background px-4 pb-3 pt-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl"
                onClick={() => step === 'payment' ? setStep('confirm') : handleOpenChange(false)}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 text-left">
                <SheetTitle className="text-base font-bold">{step === 'confirm' ? 'Confirm Payment' : 'Payment Details'}</SheetTitle>
                <p className="truncate text-xs text-muted-foreground">{tenant.name} · Room {tenant.roomNo} · {months[month - 1]} {year}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto bg-muted/20 px-4 py-4">
            {step === 'confirm' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background p-4 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary"><IndianRupee className="h-5 w-5" /></div>
                    <div><p className="text-sm font-bold">Review rent payment</p><p className="text-xs text-muted-foreground">Check the amount before recording.</p></div>
                  </div>
                  <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Monthly rent</span><span className="font-semibold">₹{tenant.monthlyRent.toLocaleString()}</span></div>
                    {tenant.amountPaid > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Already paid</span><span className="font-semibold text-emerald-600">₹{tenant.amountPaid.toLocaleString()}</span></div>}
                    <div className="flex justify-between border-t pt-2"><span className="font-semibold">Amount due</span><span className="font-extrabold text-destructive">₹{tenant.remaining.toLocaleString()}</span></div>
                  </div>
                </div>

                {tenant.proRataInfo && tenant.startDate && (
                  <div className="rounded-2xl border bg-background p-3">
                    <StayPeriodIndicator startDate={tenant.startDate} endDate={tenant.endDate} year={year} month={month} daysStayed={tenant.proRataInfo.daysStayed} dailyRate={tenant.proRataInfo.dailyRate} effectiveRent={tenant.proRataInfo.effectiveRent} paymentEntries={tenant.paymentEntries} allowCustomStart />
                  </div>
                )}

                {previousMonthPending && previousMonthPending.remaining > 0 && (
                  <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4">
                    <p className="text-sm font-bold text-destructive">Previous month is also pending</p>
                    <div className="mt-1 flex justify-between text-sm"><span>{months[previousMonthPending.month - 1]} {previousMonthPending.year}</span><span className="font-bold text-destructive">₹{previousMonthPending.remaining.toLocaleString()}</span></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <section className="rounded-2xl border bg-background p-4 shadow-sm">
                  <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Amount received</Label>
                  <div className="relative mt-2"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold">₹</span><Input id="amount" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="h-12 rounded-xl pl-8 text-lg font-bold" /></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPaymentAmount(tenant.remaining)} className="h-8 rounded-xl text-xs">Full ₹{tenant.remaining.toLocaleString()}</Button>
                    {tenant.remaining > 1000 && <Button variant="outline" size="sm" onClick={() => setPaymentAmount(1000)} className="h-8 rounded-xl text-xs">₹1,000</Button>}
                    {tenant.remaining > 2000 && <Button variant="outline" size="sm" onClick={() => setPaymentAmount(2000)} className="h-8 rounded-xl text-xs">₹2,000</Button>}
                  </div>
                </section>

                <section className="rounded-2xl border bg-background p-4 shadow-sm">
                  <Label htmlFor="discount">Discount <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="discount" type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value) || 0)} placeholder="₹0" className="mt-2 h-11 rounded-xl" />
                  {discount > 0 && <p className="mt-2 text-xs text-muted-foreground">Final due after discount: ₹{Math.max(0, tenant.remaining - discount).toLocaleString()}</p>}
                </section>

                <section className="rounded-2xl border bg-background p-4 shadow-sm">
                  <Label>Payment mode</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button type="button" variant={paymentMode === 'upi' ? 'default' : 'outline'} onClick={() => setPaymentMode('upi')} className="h-12 rounded-xl"><UpiLogo className="mr-2 h-5 w-5" />UPI</Button>
                    <Button type="button" variant={paymentMode === 'cash' ? 'default' : 'outline'} onClick={() => setPaymentMode('cash')} className="h-12 rounded-xl"><CashLogo className="mr-2 h-5 w-5" />Cash</Button>
                  </div>
                </section>

                {collectors.length > 0 && (
                  <section className="rounded-2xl border bg-background p-4 shadow-sm"><Label>Collected by</Label><div className="mt-2 flex flex-wrap gap-2">{collectors.map((collector) => <Button key={collector.id} type="button" size="sm" variant={collectedBy === collector.id ? 'default' : 'outline'} className="rounded-xl" onClick={() => setCollectedBy(collector.id)}>{collector.displayName}</Button>)}</div></section>
                )}

                <section className="rounded-2xl border bg-background p-4 shadow-sm">
                  <Label>Payment date</Label>
                  <Popover open={dateOpen} onOpenChange={setDateOpen}>
                    <PopoverTrigger asChild><Button variant="outline" className={cn('mt-2 h-11 w-full justify-start rounded-xl text-left font-normal', !paymentDate && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{paymentDate ? format(paymentDate, 'dd MMM yyyy') : 'Select date'}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={paymentDate} onSelect={(date) => { if (date) { setPaymentDate(date); setDateOpen(false); } }} initialFocus className="pointer-events-auto rounded-xl border p-3" /></PopoverContent>
                  </Popover>
                </section>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t bg-background p-4">
            {step === 'confirm' ? (
              <Button onClick={handleProceedToPayment} className="h-12 w-full rounded-xl text-sm font-bold">Continue to Payment</Button>
            ) : (
              <Button onClick={handleConfirmPayment} disabled={paymentAmount <= 0} className="h-12 w-full rounded-xl text-sm font-bold"><CheckCircle2 className="mr-2 h-4 w-4" />Record Payment</Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
