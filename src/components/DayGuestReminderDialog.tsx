import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Bell, Download, MessageCircle, ArrowLeft, Zap, Tag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DayGuestReminderTemplate, type DayGuestReminderData } from '@/components/DayGuestReminderTemplate';
import { generateReceiptImage, downloadReceiptImage } from '@/utils/generateReceiptImage';
import { usePG } from '@/contexts/PGContext';

export interface DayGuestReminderInput {
  guestName: string;
  guestPhone: string;
  fromDate: string;
  toDate: string;
  numberOfDays: number;
  perDayRate: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  roomNo: string;
  isAc?: boolean;
  acElectricBill?: number;
  discount?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminderData: DayGuestReminderInput | null;
}

export const DayGuestReminderDialog = ({ open, onOpenChange, reminderData }: Props) => {
  const { currentPG } = usePG();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const reminderRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<DayGuestReminderData | null>(null);
  const [includeAcBill, setIncludeAcBill] = useState(false);
  const [acPerDayCharge, setAcPerDayCharge] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  useBackGesture(open, () => onOpenChange(false));

  const recalculateTemplate = useCallback((
    includeAc: boolean,
    acPerDay: number,
    discountVal: number,
    baseData = reminderData
  ) => {
    if (!baseData) return;
    setIncludeAcBill(includeAc);
    setAcPerDayCharge(acPerDay);
    setDiscountAmount(discountVal);
    setGeneratedImage(null);

    const rentSubtotal = baseData.numberOfDays * baseData.perDayRate;
    const acTotal = includeAc ? (acPerDay * baseData.numberOfDays) : 0;
    const effectiveDiscount = Math.max(0, discountVal || 0);
    const newTotal = Math.max(0, rentSubtotal + acTotal - effectiveDiscount);
    const newBalance = Math.max(0, newTotal - baseData.amountPaid);

    setTemplateData({
      guestName: baseData.guestName,
      fromDate: baseData.fromDate,
      toDate: baseData.toDate,
      numberOfDays: baseData.numberOfDays,
      perDayRate: baseData.perDayRate,
      totalAmount: newTotal,
      amountPaid: baseData.amountPaid,
      balance: newBalance,
      roomNo: baseData.roomNo,
      isAc: includeAc || Boolean(baseData.isAc),
      acPerDayCharge: includeAc ? acPerDay : 0,
      discount: effectiveDiscount,
      pgName: currentPG?.name,
      pgLogoUrl: currentPG?.logoUrl,
    });
  }, [reminderData, currentPG]);

  useEffect(() => {
    if (reminderData && open) {
      const isAcRoom = Boolean(reminderData.isAc);
      const perDayCharge = isAcRoom ? (reminderData.acElectricBill || 0) : 0;
      const initialDiscount = reminderData.discount || 0;
      recalculateTemplate(isAcRoom, perDayCharge, initialDiscount, reminderData);
    }
  }, [reminderData, open, recalculateTemplate]);

  const generateReminder = useCallback(async () => {
    if (!reminderData || !templateData || !reminderRef.current) {
      toast({ title: 'Error', description: 'Data not ready.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(reminderRef.current);
      setGeneratedImage(dataUrl);

    } catch (error) {
      console.error('Error generating reminder:', error);
      toast({ title: 'Failed to generate', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [reminderData, templateData]);

  const handleDownload = () => {
    if (!generatedImage || !reminderData) return;
    downloadReceiptImage(generatedImage, `dayguest-reminder-${reminderData.guestName}`);

  };

  const shareToWhatsApp = async () => {
    if (!generatedImage || !reminderData) return;
    setIsSending(true);
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const safeName = reminderData.guestName.replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `dayguest-reminder-${safeName}.png`, { type: 'image/png' });

      let phone = reminderData.guestPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;

      await navigator.clipboard.writeText(displayPhone);


      await new Promise(resolve => setTimeout(resolve, 500));

      const navAny = navigator as unknown as { share?: (d: { files: File[] }) => Promise<void>; canShare?: (d: { files: File[] }) => boolean };
      if (navAny?.share && navAny?.canShare?.({ files: [file] })) {
        await navAny.share({ files: [file] });
      } else {
        downloadReceiptImage(generatedImage, `dayguest-reminder-${reminderData.guestName}`);
        if (!phone.startsWith('91')) phone = `91${phone}`;
        window.location.href = `https://wa.me/${phone}`;
      }
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name !== 'AbortError') {
        toast({ title: 'Share failed', variant: 'destructive' });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setTemplateData(null);
    onOpenChange(false);
  };

  return (
    <>
      {templateData && (
        <div style={{ position: 'fixed', left: '0', top: '0', transform: 'translateX(-200vw)', zIndex: -1, pointerEvents: 'none' }} aria-hidden="true">
          <DayGuestReminderTemplate ref={reminderRef} data={templateData} />
        </div>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2 pt-1">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                Send Payment Reminder
              </DialogTitle>
            </div>
            <DialogDescription>
              Generate and send day guest payment reminder to {reminderData?.guestName} via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {reminderData && (
            <div className="py-4 space-y-4">
              <div className="rounded-lg p-4 text-sm space-y-2 border border-border bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-semibold">{reminderData.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Due:</span>
                  <span className="font-semibold text-amber-600">₹{Math.floor(reminderData.balance).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stay:</span>
                  <span className="font-semibold">{reminderData.numberOfDays} days</span>
                </div>
              </div>

              {/* AC Electric Bill Section */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-sky-500" />
                    <div>
                      <Label htmlFor="include-ac" className="text-xs font-bold text-foreground cursor-pointer">
                        AC Electricity Bill
                      </Label>
                      <p className="text-[11px] text-muted-foreground">Add per-day electric charge to reminder</p>
                    </div>
                  </div>
                  <Switch
                    id="include-ac"
                    checked={includeAcBill}
                    onCheckedChange={(checked) => recalculateTemplate(checked, acPerDayCharge, discountAmount)}
                  />
                </div>

                {includeAcBill && (
                  <div className="pt-2 border-t border-sky-500/20 space-y-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ac-per-day-amount" className="text-xs text-muted-foreground">
                        Per Day AC Electric Charge (₹/day)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          id="ac-per-day-amount"
                          type="number"
                          min="0"
                          placeholder="e.g. 50"
                          value={acPerDayCharge || ""}
                          onChange={(e) => recalculateTemplate(true, Math.max(0, parseInt(e.target.value) || 0), discountAmount)}
                          className="pl-7 h-9 text-xs font-bold bg-background"
                        />
                      </div>
                    </div>

                    {acPerDayCharge > 0 && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs">
                        <span className="text-muted-foreground text-[11px]">
                          Calculation ({reminderData.numberOfDays} days):
                        </span>
                        <span className="font-bold text-sky-600 dark:text-sky-400">
                          ₹{acPerDayCharge} × {reminderData.numberOfDays} = ₹{(acPerDayCharge * reminderData.numberOfDays).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom Discount Section */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-500" />
                  <div>
                    <Label htmlFor="guest-discount" className="text-xs font-bold text-foreground cursor-pointer">
                      Special Discount
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Apply custom discount (₹) to total bill</p>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₹</span>
                  <Input
                    id="guest-discount"
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={discountAmount || ""}
                    onChange={(e) => recalculateTemplate(includeAcBill, acPerDayCharge, Math.max(0, parseInt(e.target.value) || 0))}
                    className="pl-7 h-9 text-xs font-bold bg-background"
                  />
                </div>
                {discountAmount > 0 && templateData && (
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="text-muted-foreground text-[11px]">Final Total Amount:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{templateData.totalAmount.toLocaleString('en-IN')} (Saved ₹{discountAmount.toLocaleString('en-IN')})
                    </span>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Day Guest Reminder" className="w-full rounded-lg border" />
                  <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button
                onClick={generateReminder}
                disabled={isGenerating || !templateData}
                variant="secondary"
                className="w-full h-11"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : generatedImage ? 'Regenerate Image' : 'Generate Reminder Image'}
              </Button>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {generatedImage && (
              <Button
                onClick={shareToWhatsApp}
                disabled={isSending}
                className="w-full gap-2 bg-green-600 hover:bg-green-700 h-11"
              >
                {isSending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><MessageCircle className="h-4 w-4" />Send to WhatsApp</>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={handleClose} className="w-full h-11 mt-0">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
