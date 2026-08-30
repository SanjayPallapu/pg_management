import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Receipt, Download, MessageCircle, ArrowLeft, Zap, Tag, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DayGuestReceiptTemplate, type DayGuestReceiptData } from '@/components/DayGuestReceiptTemplate';
import { generateReceiptImage, downloadReceiptImage } from '@/utils/generateReceiptImage';
import { usePG } from '@/contexts/PGContext';
import type { DayGuestReminderInput } from '@/components/DayGuestReminderDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: DayGuestReminderInput | null;
}

export const DayGuestReceiptDialog = ({ open, onOpenChange, receiptData }: Props) => {
  const { currentPG } = usePG();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<DayGuestReceiptData | null>(null);
  const [includeAcBill, setIncludeAcBill] = useState(false);
  const [acPerDayCharge, setAcPerDayCharge] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useBackGesture(open, () => handleClose());

  const handleClose = useCallback(() => {
    setGeneratedImage(null);
    setTemplateData(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const recalculateTemplate = useCallback((
    includeAc: boolean,
    acPerDay: number,
    discountVal: number,
    baseData = receiptData
  ) => {
    if (!baseData) return;
    setIncludeAcBill(includeAc);
    setAcPerDayCharge(acPerDay);
    setDiscountAmount(discountVal);
    setGeneratedImage(null);

    const rentSubtotal = baseData.numberOfDays * baseData.perDayRate;
    const acTotal = includeAc ? (acPerDay * baseData.numberOfDays) : 0;
    const computedTotal = Math.max(0, rentSubtotal + acTotal - discountVal);
    const amountPaid = baseData.amountPaid || computedTotal;
    const balance = Math.max(0, computedTotal - amountPaid);

    setTemplateData({
      guestName: baseData.guestName,
      fromDate: baseData.fromDate,
      toDate: baseData.toDate,
      numberOfDays: baseData.numberOfDays,
      perDayRate: baseData.perDayRate,
      totalAmount: computedTotal,
      amountPaid: amountPaid,
      balance: balance,
      roomNo: baseData.roomNo,
      isAc: Boolean(baseData.isAc),
      acPerDayCharge: includeAc ? acPerDay : 0,
      discount: discountVal > 0 ? discountVal : 0,
      pgName: currentPG?.name || 'PG Management',
      pgLogoUrl: currentPG?.logoUrl || '/icon-512.png',
      paymentDate: new Date().toISOString(),
    });
  }, [receiptData, currentPG]);

  useEffect(() => {
    if (open && receiptData) {
      const initialAcRate = receiptData.acElectricBill ? Math.round(receiptData.acElectricBill / (receiptData.numberOfDays || 1)) : 0;
      const initialDiscount = receiptData.discount || 0;
      const initialIncludeAc = Boolean(receiptData.isAc && initialAcRate > 0);

      recalculateTemplate(initialIncludeAc, initialAcRate, initialDiscount, receiptData);
    }
  }, [open, receiptData, recalculateTemplate]);

  // Generate Image for download or share
  const handleGenerate = async (): Promise<string | null> => {
    if (!receiptRef.current) return null;
    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);
      setGeneratedImage(dataUrl);
      return dataUrl;
    } catch (err) {
      console.error('Failed to generate receipt image:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate receipt image. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    let img = generatedImage;
    if (!img) {
      img = await handleGenerate();
    }
    if (img && receiptData) {
      const filename = `day-guest-receipt-${receiptData.guestName.toLowerCase().replace(/\s+/g, '-')}-room-${receiptData.roomNo}.png`;
      downloadReceiptImage(img, filename);
      toast({
        title: 'Receipt Downloaded',
        description: `Saved as ${filename}`,
      });
    }
  };

  const handleSendWhatsApp = async () => {
    if (!receiptData?.guestPhone) {
      toast({
        title: 'No Phone Number',
        description: 'Guest does not have a mobile number saved.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Step 1: Generate receipt image if not already done
      let img = generatedImage;
      if (!img) {
        img = await handleGenerate();
      }

      // Step 2: Download receipt image
      if (img) {
        const filename = `day-guest-receipt-${receiptData.guestName.toLowerCase().replace(/\s+/g, '-')}-room-${receiptData.roomNo}.png`;
        downloadReceiptImage(img, filename);
      }

      // Step 3: Format phone number and copy to clipboard
      const digits = receiptData.guestPhone.replace(/\D/g, '');
      const formattedPhone = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits.slice(-10)}`;
      const displayPhone = `+${formattedPhone.slice(0, 2)} ${formattedPhone.slice(2)}`;

      try {
        await navigator.clipboard.writeText(displayPhone);
      } catch {
        // Clipboard API may fail on some browsers
      }

      // Step 4: Build WhatsApp message and open
      const amountPaid = templateData?.amountPaid ?? receiptData.amountPaid;
      const messageText = `Hi ${receiptData.guestName},\n\n` +
        `Thank you for staying at *${currentPG?.name || 'our PG'}*! 🧾\n\n` +
        `Here is your payment receipt for your stay in *Room ${receiptData.roomNo}*:\n` +
        `• *Stay Duration*: ${receiptData.numberOfDays} Days\n` +
        `• *Amount Paid*: ₹${amountPaid.toLocaleString('en-IN')}\n` +
        `• *Payment Status*: Fully Paid ✅\n\n` +
        `Please find the receipt image attached separately.`;

      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: '📋 Phone number copied!',
        description: `${displayPhone} copied to clipboard. Receipt downloaded. WhatsApp opened.`,
      });
    } catch (err) {
      console.error('Failed to send receipt:', err);
      toast({
        title: 'Error',
        description: 'Failed to open WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!receiptData) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 [&>button]:hidden flex flex-col h-full bg-background overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-600" />
              Day Guest Receipt
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Guest Summary Card */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-foreground">{receiptData.guestName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Room {receiptData.roomNo} · {receiptData.numberOfDays} Days ({receiptData.fromDate} to {receiptData.toDate})
                </p>
              </div>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{(templateData?.amountPaid ?? receiptData.amountPaid).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* AC Bill & Discount Adjustment Controls */}
          <div className="rounded-2xl border border-border/70 bg-card p-3 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dg-rcpt-ac-switch" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                  <Zap className="h-3.5 w-3.5 text-blue-500" />
                  Include AC Electricity Charge
                </Label>
                <p className="text-[11px] text-muted-foreground">Add daily AC surcharge to receipt</p>
              </div>
              <Switch
                id="dg-rcpt-ac-switch"
                checked={includeAcBill}
                onCheckedChange={(checked) => recalculateTemplate(checked, acPerDayCharge, discountAmount)}
              />
            </div>

            {includeAcBill && (
              <div className="pt-2 border-t space-y-1.5 animate-in fade-in-50">
                <Label className="text-xs font-medium">AC Charge Per Day (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  value={acPerDayCharge || ''}
                  onChange={(e) => recalculateTemplate(includeAcBill, Number(e.target.value) || 0, discountAmount)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="pt-2 border-t space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-amber-500" />
                Discount / Concession (₹)
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={discountAmount || ''}
                onChange={(e) => recalculateTemplate(includeAcBill, acPerDayCharge, Number(e.target.value) || 0)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Visual Receipt Preview Container */}
          <div className="border rounded-2xl p-2 bg-slate-100 dark:bg-slate-900/50 flex justify-center overflow-x-auto shadow-inner">
            <div className="origin-top scale-[0.65] sm:scale-[0.78] my-[-70px] sm:my-[-40px]">
              {templateData && (
                <DayGuestReceiptTemplate ref={receiptRef} data={templateData} />
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t bg-card/80 backdrop-blur-sm flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="flex-1 gap-1.5 h-10 text-xs font-bold rounded-xl"
            onClick={handleDownload}
            disabled={isGenerating || isSending}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download Receipt
          </Button>

          <Button
            className="flex-1 gap-1.5 h-10 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSendWhatsApp}
            disabled={isGenerating || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Send on WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
