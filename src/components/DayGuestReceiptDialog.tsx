import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, MessageCircle, Download, Copy, Check, Zap, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DayGuestReceiptTemplate, type DayGuestReceiptData } from '@/components/DayGuestReceiptTemplate';
import { generateReceiptImage, downloadReceiptImage, dataURLtoBlob } from '@/utils/generateReceiptImage';
import { usePG } from '@/contexts/PGContext';
import type { DayGuestReminderInput } from '@/components/DayGuestReminderDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: DayGuestReminderInput | null;
  onWhatsappSent?: () => void;
}

export const DayGuestReceiptDialog = ({ open, onOpenChange, receiptData, onWhatsappSent }: Props) => {
  const { currentPG } = usePG();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<DayGuestReceiptData | null>(null);
  const [includeAcBill, setIncludeAcBill] = useState(false);
  const [acPerDayCharge, setAcPerDayCharge] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useBackGesture(open, () => handleClose(), { keepHistoryOnClose: true });

  const handleClose = useCallback(() => {
    setGeneratedImage(null);
    setCopied(false);
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

  // Generate Image
  const handleGenerate = async (): Promise<string | null> => {
    if (!receiptRef.current || !templateData) {
      toast({
        title: 'Error',
        description: 'Receipt data not ready. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);
      setGeneratedImage(dataUrl);
      toast({
        title: 'Receipt Generated!',
        description: 'Receipt preview is ready.',
      });
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

  const handleDownload = () => {
    if (!generatedImage || !receiptData) return;
    const filename = `day-guest-receipt-${receiptData.guestName.toLowerCase().replace(/\s+/g, '-')}-room-${receiptData.roomNo}.png`;
    downloadReceiptImage(generatedImage, filename);
    toast({
      title: 'Receipt Downloaded',
      description: `Saved as ${filename}`,
    });
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

    if (!generatedImage) {
      toast({
        title: 'Generate receipt first',
        description: 'Please generate the receipt image before sharing.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Convert base64 to blob and create file
      const blob = dataURLtoBlob(generatedImage);
      const safeName = receiptData.guestName.replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `day-guest-receipt-${safeName}.png`, { type: 'image/png' });

      // Clean phone number
      let phone = receiptData.guestPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;

      // Copy phone number to clipboard for easy search
      try {
        await navigator.clipboard.writeText(displayPhone);
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = displayPhone;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const navAny = navigator as any;
      if (navAny?.share && navAny?.canShare?.({ files: [file] })) {
        await navAny.share({ files: [file] });
        onWhatsappSent?.();
      } else {
        // Fallback: download and open WhatsApp
        downloadReceiptImage(generatedImage, `day-guest-receipt-${safeName}.png`);
        const cleanPhone = phone.startsWith('91') ? phone : `91${phone}`;
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
        onWhatsappSent?.();
      }

      toast({
        title: '📋 Phone copied to clipboard',
        description: `${displayPhone} copied. WhatsApp opened.`,
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to send receipt:', err);
        toast({
          title: 'Error',
          description: 'Failed to share receipt.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const copyReceiptData = () => {
    if (!receiptData || !templateData) return;
    const jsonData = JSON.stringify(templateData, null, 2);
    navigator.clipboard.writeText(jsonData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'Receipt details copied as JSON.',
    });
  };

  if (!receiptData) return null;

  return (
    <>
      {/* Offscreen receipt template for rendering */}
      {templateData && (
        <div 
          style={{ 
            position: 'fixed',
            left: '0',
            top: '0',
            transform: 'translateX(-200vw)',
            zIndex: -1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <DayGuestReceiptTemplate ref={receiptRef} data={templateData} />
        </div>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-md w-[95%] p-4 sm:p-6 overflow-y-auto max-h-[90vh] rounded-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex flex-col items-center justify-center text-center">
            <DialogTitle className="flex items-center justify-center gap-2 text-center w-full pt-1">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Send Payment Receipt
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Generate and send payment receipt to {receiptData?.guestName} via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3.5">
            {/* Guest Summary Box */}
            <div className="bg-muted/50 rounded-xl p-3 text-xs space-y-1.5 border border-border/60">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guest:</span>
                <span className="font-bold text-foreground">{receiptData.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room & Duration:</span>
                <span className="font-semibold text-foreground">Room {receiptData.roomNo} · {receiptData.numberOfDays} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ₹{(templateData?.amountPaid ?? receiptData.amountPaid).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* AC Bill & Discount Adjustments */}
            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dg-rcpt-ac-switch" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Zap className="h-3.5 w-3.5 text-blue-500" />
                    Include AC Electricity Charge
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Add daily AC surcharge to receipt</p>
                </div>
                <Switch
                  id="dg-rcpt-ac-switch"
                  checked={includeAcBill}
                  onCheckedChange={(checked) => recalculateTemplate(checked, acPerDayCharge, discountAmount)}
                />
              </div>

              {includeAcBill && (
                <div className="pt-2 border-t space-y-1 animate-in fade-in-50">
                  <Label className="text-[11px] font-medium">AC Charge Per Day (₹)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    value={acPerDayCharge || ''}
                    onChange={(e) => recalculateTemplate(includeAcBill, Number(e.target.value) || 0, discountAmount)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              )}

              <div className="pt-2 border-t space-y-1">
                <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-amber-500" />
                  Discount / Concession (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={discountAmount || ''}
                  onChange={(e) => recalculateTemplate(includeAcBill, acPerDayCharge, Number(e.target.value) || 0)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>

            {/* Generated Image Preview with Download icon */}
            {generatedImage && (
              <div className="relative rounded-xl overflow-hidden border border-border bg-slate-100 dark:bg-slate-900 shadow-inner">
                <img 
                  src={generatedImage} 
                  alt="Day Guest Receipt" 
                  className="w-full rounded-xl"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 h-8 w-8 p-0 rounded-lg shadow-md bg-white/90 dark:bg-black/90 hover:opacity-90"
                  onClick={handleDownload}
                  title="Download Receipt Image"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !templateData}
                variant="outline"
                className="w-full text-xs font-bold rounded-xl h-10"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Receipt...
                  </>
                ) : generatedImage ? (
                  'Regenerate Receipt Image'
                ) : (
                  'Generate Receipt Image'
                )}
              </Button>

              <Button
                onClick={copyReceiptData}
                variant="outline"
                className="w-full text-xs font-medium rounded-xl h-9 text-muted-foreground"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Receipt Data (JSON)
                  </>
                )}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-xl text-xs h-10" onClick={handleClose}>
              Close
            </Button>

            {generatedImage && (
              <Button 
                onClick={handleSendWhatsApp} 
                disabled={isSending}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold h-10 flex-1"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Send to WhatsApp
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
