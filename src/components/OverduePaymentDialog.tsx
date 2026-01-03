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
  } | null;
  month: number;
  year: number;
  onConfirmPayment: (data: {
    tenantId: string;
    amount: number;
    date: string;
    mode: 'upi' | 'cash';
    month: number;
    year: number;
    monthlyRent: number;
    existingPaid: number;
  }) => void;
}

type Step = 'confirm' | 'payment';

export const OverduePaymentDialog = ({
  open,
  onOpenChange,
  tenant,
  month,
  year,
  onConfirmPayment,
}: OverduePaymentDialogProps) => {
  const [step, setStep] = useState<Step>('confirm');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [dateOpen, setDateOpen] = useState(false);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('confirm');
      setPaymentAmount(0);
      setPaymentDate(new Date());
      setPaymentMode('upi');
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
    
    onConfirmPayment({
      tenantId: tenant.id,
      amount: paymentAmount,
      date: format(paymentDate, 'yyyy-MM-dd'),
      mode: paymentMode,
      month,
      year,
      monthlyRent: tenant.monthlyRent,
      existingPaid: tenant.amountPaid,
    });
    
    handleOpenChange(false);
  };

  if (!tenant) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
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
            
            <div className="space-y-4 py-4">
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
                </div>
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
            </div>

            <AlertDialogFooter>
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
