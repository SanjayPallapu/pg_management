import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

const STORAGE_AC_RATE_KEY = 'pg_day_guest_ac_rate_default';
const STORAGE_DISCOUNT_KEY = 'pg_day_guest_discount_default';

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
    baseData = reminderData
  ) => {
    if (!baseData) return;
    setIncludeAcBill(includeAc);
    setAcPerDayCharge(acPerDay);
    setDiscountAmount(discountVal);
    setGeneratedImage(null);

    // Save defaults to localStorage for convenience
    if (includeAc && acPerDay > 0) {
      try { localStorage.setItem(STORAGE_AC_RATE_KEY, acPerDay.toString()); } catch {}
    }
    if (discountVal > 0) {
      try { localStorage.setItem(STORAGE_DISCOUNT_KEY, discountVal.toString()); } catch {}
    }

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
      let defaultAcRate = reminderData.acElectricBill || 0;
      if (isAcRoom && !defaultAcRate) {
        try {
          const saved = localStorage.getItem(STORAGE_AC_RATE_KEY);
          if (saved) defaultAcRate = parseInt(saved) || 0;
        } catch {}
      }

      let defaultDiscount = reminderData.discount || 0;
      if (!defaultDiscount) {
        try {
          const savedDisc = localStorage.getItem(STORAGE_DISCOUNT_KEY);
          if (savedDisc) defaultDiscount = parseInt(savedDisc) || 0;
        } catch {}
      }

      recalculateTemplate(isAcRoom, defaultAcRate, defaultDiscount, reminderData);
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

  return (
    <>
      {templateData && (
        <div style={{ position: 'fixed', left: '0', top: '0', transform: 'translateX(-200vw)', zIndex: -1, pointerEvents: 'none' }} aria-hidden="true">
          <DayGuestReminderTemplate ref={reminderRef} data={templateData} />
        </div>
      )}

      <Sheet open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 h-full [&>button]:hidden flex flex-col bg-background">
          <SheetHeader className="px-4 pt-4 pb-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8 shrink-0 rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex flex-col text-left">
                <SheetTitle className="text-base text-foreground font-bold">
                  Send Payment Reminder
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Generate reminder for {reminderData?.guestName || 'Guest'}
                </p>
              </div>
            </div>
          </SheetHeader>

          {reminderData && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Guest Stay Summary Card */}
              <div className="rounded-2xl p-4 text-sm space-y-2 border border-border bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-semibold text-foreground">{reminderData.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-semibold text-foreground">Room {reminderData.roomNo} {reminderData.isAc ? '(❄️ AC)' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stay Duration:</span>
                  <span className="font-semibold text-foreground">{reminderData.numberOfDays} days ({format(new Date(reminderData.fromDate), 'dd MMM')} - {format(new Date(reminderData.toDate), 'dd MMM')})</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Amount Due:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">₹{Math.floor(templateData?.balance ?? reminderData.balance).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* AC Electric Bill Section */}
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 space-y-3">
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
                          className="pl-7 h-9 text-xs font-bold bg-background rounded-xl"
                        />
                      </div>
                    </div>

                    {acPerDayCharge > 0 && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs">
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
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
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
                    className="pl-7 h-9 text-xs font-bold bg-background rounded-xl"
                  />
                </div>
                {discountAmount > 0 && templateData && (
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="text-muted-foreground text-[11px]">Final Total Amount:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{templateData.totalAmount.toLocaleString('en-IN')} (Saved ₹{discountAmount.toLocaleString('en-IN')})
                    </span>
                  </div>
                )}
              </div>

              {/* Image Preview */}
              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Day Guest Reminder" className="w-full rounded-2xl border shadow-sm" />
                  <Button size="sm" variant="secondary" className="absolute top-2 right-2 rounded-xl" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Sticky Bottom Actions */}
          <div className="p-4 border-t bg-background shrink-0 space-y-2">
            <Button
              onClick={generateReminder}
              disabled={isGenerating || !templateData}
              variant={generatedImage ? "outline" : "default"}
              className="w-full h-11 rounded-xl font-bold"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
              ) : generatedImage ? 'Regenerate Image' : 'Generate Reminder Image'}
            </Button>

            {generatedImage && (
              <Button
                onClick={shareToWhatsApp}
                disabled={isSending}
                className="w-full gap-2 bg-green-600 hover:bg-green-700 h-11 rounded-xl font-bold text-white"
              >
                {isSending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Sending...</>
                ) : (
                  <><MessageCircle className="h-4 w-4" />Send to WhatsApp</>
                )}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
