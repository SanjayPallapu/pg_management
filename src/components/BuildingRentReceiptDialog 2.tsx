import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MessageCircle, Download, Loader2, CalendarIcon, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { generateReceiptImage } from '@/utils/generateReceiptImage';
import { BuildingRentReceiptTemplate, BuildingRentReceiptData } from './BuildingRentReceiptTemplate';
import { PaymentModeButtons } from '@/components/payment/PaymentModeButtons';
import { formatIndianCurrency } from '@/utils/numberToWords';
import { BuildingRentSettings } from '@/hooks/useBuildingRentSettings';
import { BuildingRentPayment } from '@/hooks/useBuildingRentHistory';

interface BuildingRentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forMonth: string;
  settings: BuildingRentSettings;
  onPaymentSaved: (payment: Omit<BuildingRentPayment, 'id' | 'createdAt'>) => void;
}

export const BuildingRentReceiptDialog = ({
  open,
  onOpenChange,
  forMonth,
  settings,
  onPaymentSaved,
}: BuildingRentReceiptDialogProps) => {
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [upiAmount, setUpiAmount] = useState<number>(settings.amount);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Reset amounts when settings change
  useEffect(() => {
    setUpiAmount(settings.amount);
    setCashAmount(0);
    setPaymentMode('upi');
  }, [settings.amount, open]);

  const handleModeChange = (mode: 'upi' | 'cash') => {
    setPaymentMode(mode);
    if (mode === 'upi') {
      setUpiAmount(settings.amount);
      setCashAmount(0);
    } else {
      setUpiAmount(0);
      setCashAmount(settings.amount);
    }
  };

  const totalAmount = upiAmount + cashAmount;

  const receiptData: BuildingRentReceiptData = {
    receivedFrom: settings.receivedFrom,
    paidTo: settings.paidTo,
    amount: totalAmount,
    upiAmount,
    cashAmount,
    date: paymentDate.toISOString(),
    forMonth,
  };

  const copyPhoneNumber = async () => {
    try {
      await navigator.clipboard.writeText(settings.whatsappNumber);
      setCopied(true);
      toast.success('Phone number copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `building-rent-${forMonth.replace(/\s+/g, '-')}.png`, {
        type: 'image/png',
      });

      // Save payment to history
      onPaymentSaved({
        date: paymentDate.toISOString(),
        forMonth,
        amount: totalAmount,
        upiAmount,
        cashAmount,
        receivedFrom: settings.receivedFrom,
        paidTo: settings.paidTo,
      });

      // Copy phone number first
      await navigator.clipboard.writeText(settings.whatsappNumber);

      // Try native share API first (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        toast.success('Receipt shared! Phone number copied.');
      } else {
        // Fallback: open WhatsApp and download
        window.open(`https://wa.me/91${settings.whatsappNumber}`, '_blank');
        toast.success('WhatsApp opened. Phone number copied!');

        // Also download the receipt
        const link = document.createElement('a');
        link.download = `building-rent-${forMonth.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);

      // Save payment to history
      onPaymentSaved({
        date: paymentDate.toISOString(),
        forMonth,
        amount: totalAmount,
        upiAmount,
        cashAmount,
        receivedFrom: settings.receivedFrom,
        paidTo: settings.paidTo,
      });

      const link = document.createElement('a');
      link.download = `building-rent-${forMonth.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Receipt downloaded!');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Building Rent Receipt - {forMonth}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From/To info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-medium text-sm truncate">{settings.receivedFrom}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-medium text-sm truncate">{settings.paidTo}</p>
            </div>
          </div>

          {/* Amount display */}
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Building Rent</p>
            <p className="text-3xl font-bold text-primary">₹{formatIndianCurrency(settings.amount)}</p>
          </div>

          {/* Date picker */}
          <div>
            <Label className="mb-2 block">Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !paymentDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment mode selection */}
          <div>
            <Label className="mb-2 block">Payment Mode</Label>
            <PaymentModeButtons mode={paymentMode} onModeChange={handleModeChange} />
          </div>

          {/* Split amounts (if needed) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="upi-amount" className="text-xs">
                UPI Amount
              </Label>
              <Input
                id="upi-amount"
                type="number"
                value={upiAmount || ''}
                onChange={(e) => setUpiAmount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="cash-amount" className="text-xs">
                Cash Amount
              </Label>
              <Input
                id="cash-amount"
                type="number"
                value={cashAmount || ''}
                onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {totalAmount !== settings.amount && (
            <p className="text-xs text-destructive text-center">
              Total (₹{formatIndianCurrency(totalAmount)}) doesn't match rent (₹
              {formatIndianCurrency(settings.amount)})
            </p>
          )}

          {/* Phone number with copy */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">WhatsApp:</span>
            <span className="font-mono font-medium flex-1">{settings.whatsappNumber}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyPhoneNumber}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleShare}
              disabled={isGenerating || totalAmount === 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              WhatsApp
            </Button>
            <Button onClick={handleDownload} disabled={isGenerating || totalAmount === 0} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Hidden receipt template for image generation */}
        <div
          ref={receiptRef}
          style={{
            position: 'fixed',
            transform: 'translateX(-200vw)',
            top: 0,
            zIndex: -1,
          }}
        >
          <BuildingRentReceiptTemplate data={receiptData} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
