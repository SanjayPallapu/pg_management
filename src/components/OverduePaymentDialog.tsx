import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UpiLogo } from './icons/UpiLogo';
import { CashLogo } from './icons/CashLogo';
import { StayPeriodIndicator } from './StayPeriodIndicator';
import { PaymentEntry } from '@/types';
import { useCollectorNames } from '@/hooks/useCollectorNames';

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
  const [collectedBy, setCollectedBy] = useState<string>(collectors[0]?.displayName || 'Sanjay');

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('confirm');
      setPaymentAmount(0);
      setPaymentDate(new Date());
      setPaymentMode('upi');
      setDiscount(0);
      setCollectedBy(collectors[0]?.displayName || 'Sanjay');
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
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        {step === 'confirm' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    You are about to record payment for <span className="font-semibold text-foreground">{tenant.name}</span> ({tenant.roomNo}) 
                    for <span className="font-semibold text-foreground">{months[month - 1]} {year}</span>.
                  </p>
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Monthly Rent:</span>
                      <span>₹{tenant.monthlyRent.toLocaleString()}</span>
                    </div>
                    {/* Pro-rata breakdown */}
                    {/* Visual Stay Period Calendar */}
                    {tenant.proRataInfo && tenant.startDate && (
                      <StayPeriodIndicator
                        startDate={tenant.startDate}
                        endDate={tenant.endDate}
                        year={year}
                        month={month}
                        daysStayed={tenant.proRataInfo.daysStayed}
                        dailyRate={tenant.proRataInfo.dailyRate}
                        effectiveRent={tenant.proRataInfo.effectiveRent}
                        paymentEntries={tenant.paymentEntries}
                        allowCustomStart
                      />
                    )}
                    {tenant.amountPaid > 0 && (
                      <div className="flex justify-between text-sm text-paid">
                        <span>Already Paid:</span>
                        <span>₹{tenant.amountPaid.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold text-destructive">
                      <span>Remaining Due:</span>
                      <span>₹{tenant.remaining.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Previous Month Pending Alert */}
                  {previousMonthPending && previousMonthPending.remaining > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-1 mt-2">
                      <div className="text-sm font-semibold text-destructive flex items-center gap-1">
                        ⚠️ Previous Month Pending
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{months[previousMonthPending.month - 1]} {previousMonthPending.year}:</span>
                        <span className="text-destructive font-medium">₹{previousMonthPending.remaining.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button onClick={handleProceedToPayment}>
                Proceed to Payment
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Enter Payment Details</AlertDialogTitle>
              <AlertDialogDescription>
                {tenant.name} • {months[month - 1]} {year}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
              {/* Payment Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="text-lg"
                />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(tenant.remaining)}
                  >
                    ₹{tenant.remaining.toLocaleString()} (Full)
                  </Button>
                  {tenant.remaining > 1000 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(1000)}
                    >
                      ₹1,000
                    </Button>
                  )}
                  {tenant.remaining > 2000 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentAmount(2000)}
                    >
                      ₹2,000
                    </Button>
                  )}
                  {tenant.remaining > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Set to remaining minus discount
                        const discountedAmount = tenant.remaining - discount;
                        setPaymentAmount(Math.max(0, discountedAmount));
                      }}
                      className="text-xs"
                    >
                      Apply Discount
                    </Button>
                  )}
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label htmlFor="discount">Discount (₹)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setDiscount(val);
                  }}
                  placeholder="0"
                  className="text-lg"
                />
                {discount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    New Due: ₹{(tenant.remaining - discount).toLocaleString()} (after ₹{discount} discount)
                  </div>
                )}
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !paymentDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentDate ? format(paymentDate, 'dd MMM yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={(date) => {
                        if (date) {
                          setPaymentDate(date);
                          setDateOpen(false);
                        }
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={paymentMode === 'upi' ? 'default' : 'outline'}
                    onClick={() => setPaymentMode('upi')}
                    className="flex-1 h-12"
                  >
                    <UpiLogo className="h-5 w-5 mr-2" />
                    UPI
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === 'cash' ? 'default' : 'outline'}
                    onClick={() => setPaymentMode('cash')}
                    className="flex-1 h-12"
                  >
                    <CashLogo className="h-5 w-5 mr-2" />
                    Cash
                  </Button>
                </div>
              </div>

              {/* Collected By */}
              <div className="space-y-2">
                <Label>Collected By</Label>
                <div className="flex gap-2">
                  {collectors.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={collectedBy === c.displayName ? 'default' : 'outline'}
                      onClick={() => setCollectedBy(c.displayName)}
                      className="flex-1 h-10"
                    >
                      {c.displayName}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <AlertDialogFooter className="gap-[10px]">
              <Button variant="outline" onClick={() => setStep('confirm')}>
                Back
              </Button>
              <Button 
                onClick={handleConfirmPayment}
                disabled={paymentAmount <= 0}
              >
                Record Payment
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
