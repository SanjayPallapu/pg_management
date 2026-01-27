import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateReceiptImage } from '@/utils/generateReceiptImage';
import { BuildingRentReceiptTemplate, BuildingRentReceiptData } from './BuildingRentReceiptTemplate';
import { PaymentModeButtons } from '@/components/payment/PaymentModeButtons';
import { formatIndianCurrency } from '@/utils/numberToWords';

interface BuildingRentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forMonth: string;
}

const WHATSAPP_NUMBER = '9989568666';
const RECEIVER_NAME = 'Rajesh Sharma';
const BUILDING_RENT = 150000;

export const BuildingRentReceiptDialog = ({ open, onOpenChange, forMonth }: BuildingRentReceiptDialogProps) => {
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [upiAmount, setUpiAmount] = useState<number>(BUILDING_RENT);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleModeChange = (mode: 'upi' | 'cash') => {
    setPaymentMode(mode);
    if (mode === 'upi') {
      setUpiAmount(BUILDING_RENT);
      setCashAmount(0);
    } else {
      setUpiAmount(0);
      setCashAmount(BUILDING_RENT);
    }
  };

  const totalAmount = upiAmount + cashAmount;

  const receiptData: BuildingRentReceiptData = {
    receivedFrom: RECEIVER_NAME,
    amount: totalAmount,
    upiAmount,
    cashAmount,
    date: new Date().toISOString(),
    forMonth,
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `building-rent-receipt-${forMonth.replace(/\s+/g, '-')}.png`, {
        type: 'image/png',
      });

      // Try native share API first (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        toast.success('Receipt shared successfully!');
      } else {
        // Fallback: open WhatsApp
        window.open(`https://wa.me/91${WHATSAPP_NUMBER}`, '_blank');
        toast.info('WhatsApp opened. Please share the downloaded receipt.');
        
        // Also download the receipt
        const link = document.createElement('a');
        link.download = `building-rent-receipt-${forMonth.replace(/\s+/g, '-')}.png`;
        link.href = dataUrl;
        link.click();
      }
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
      const link = document.createElement('a');
      link.download = `building-rent-receipt-${forMonth.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Receipt downloaded!');
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
          {/* Receiver info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Received From</p>
            <p className="font-semibold">Mr. {RECEIVER_NAME}</p>
          </div>

          {/* Amount display */}
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Building Rent</p>
            <p className="text-3xl font-bold text-primary">₹{formatIndianCurrency(BUILDING_RENT)}</p>
          </div>

          {/* Payment mode selection */}
          <div>
            <Label className="mb-2 block">Payment Mode</Label>
            <PaymentModeButtons mode={paymentMode} onModeChange={handleModeChange} />
          </div>

          {/* Split amounts (if needed) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="upi-amount" className="text-xs">UPI Amount</Label>
              <Input
                id="upi-amount"
                type="number"
                value={upiAmount || ''}
                onChange={(e) => setUpiAmount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="cash-amount" className="text-xs">Cash Amount</Label>
              <Input
                id="cash-amount"
                type="number"
                value={cashAmount || ''}
                onChange={(e) => setCashAmount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          {totalAmount !== BUILDING_RENT && (
            <p className="text-xs text-destructive text-center">
              Total (₹{formatIndianCurrency(totalAmount)}) doesn't match rent (₹{formatIndianCurrency(BUILDING_RENT)})
            </p>
          )}

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
            <Button
              onClick={handleDownload}
              disabled={isGenerating || totalAmount === 0}
              variant="outline"
            >
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
            left: '-9999px',
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
