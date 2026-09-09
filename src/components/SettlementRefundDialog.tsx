import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Download,
  Share2,
  Calendar,
  IndianRupee,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  SettlementRefundTemplate,
  SettlementRefundTemplateData,
} from '@/components/SettlementRefundTemplate';
import {
  generateReceiptImage,
  downloadReceiptImage,
  dataURLtoBlob,
} from '@/utils/generateReceiptImage';
import { usePG } from '@/contexts/PGContext';
import { parseDateOnly } from '@/utils/dateOnly';
import { format, differenceInDays } from 'date-fns';

export interface SettlementRefundDialogInput {
  tenantName: string;
  tenantPhone?: string;
  roomNo: string;
  sharingType?: string;
  monthlyRent: number;
  startDate?: string;
  endDate?: string;
  amountPaid?: number;
  discount?: number;
  extra?: number;
  customDailyRate?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SettlementRefundDialogInput | null;
  selectedMonth?: number;
  selectedYear?: number;
}

export const SettlementRefundDialog = ({
  open,
  onOpenChange,
  data,
  selectedMonth,
  selectedYear,
}: Props) => {
  const { currentPG } = usePG();
  const templateRef = useRef<HTMLDivElement>(null);

  // Form states
  const [tenantName, setTenantName] = useState<string>('');
  const [roomNo, setRoomNo] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [rateMode, setRateMode] = useState<'standard-30' | 'calendar' | 'custom'>('standard-30');
  const [customRate, setCustomRate] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [deductions, setDeductions] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState<string>('Electricity / Damage');
  const [discounts, setDiscounts] = useState<number>(0);

  // Image & sharing states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useBackGesture(open, () => onOpenChange(false));

  // Initialize dates and fields when data changes or dialog opens
  useEffect(() => {
    if (data && open) {
      const now = new Date();
      const yr = selectedYear || now.getFullYear();
      const mo = selectedMonth || now.getMonth() + 1;
      const monthStartStr = `${yr}-${String(mo).padStart(2, '0')}-01`;

      let initialFrom = monthStartStr;
      if (data.startDate) {
        const start = parseDateOnly(data.startDate);
        const mStart = parseDateOnly(monthStartStr);
        initialFrom = start > mStart ? data.startDate.slice(0, 10) : monthStartStr;
      }

      let initialTo = `${yr}-${String(mo).padStart(2, '0')}-10`;
      if (data.endDate) {
        initialTo = data.endDate.slice(0, 10);
      }

      setTenantName(data.tenantName || 'Tenant');
      setRoomNo(data.roomNo || '101');
      setFromDate(initialFrom);
      setToDate(initialTo);
      setAmountPaid(data.amountPaid ?? data.monthlyRent);
      setDeductions(data.extra ?? 0);
      setDiscounts(data.discount ?? 0);

      const standardRate = Math.round(data.monthlyRent / 30);
      if (data.customDailyRate) {
        setRateMode('custom');
        setCustomRate(data.customDailyRate);
      } else {
        setRateMode('standard-30');
        setCustomRate(standardRate);
      }

      setGeneratedImage(null);
    }
  }, [data, open, selectedMonth, selectedYear]);

  // Compute days stayed from selected dates
  const daysStayed = useMemo(() => {
    if (!fromDate || !toDate) return 1;
    try {
      const f = parseDateOnly(fromDate);
      const t = parseDateOnly(toDate);
      if (isNaN(f.getTime()) || isNaN(t.getTime())) return 1;
      const diff = differenceInDays(t, f) + 1;
      return Math.max(1, diff);
    } catch {
      return 1;
    }
  }, [fromDate, toDate]);

  // Daily rate according to selected mode
  const daysInMonth = useMemo(() => {
    const yr = selectedYear || new Date().getFullYear();
    const mo = selectedMonth || new Date().getMonth() + 1;
    return new Date(yr, mo, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const effectiveDailyRate = useMemo(() => {
    if (!data) return 0;
    if (rateMode === 'custom') return customRate || 0;
    if (rateMode === 'calendar') return Math.round(data.monthlyRent / daysInMonth);
    return Math.round(data.monthlyRent / 30);
  }, [data, rateMode, customRate, daysInMonth]);

  // Calculated pro-rata and refund / due
  const proRataRent = effectiveDailyRate * daysStayed;
  const totalDue = Math.max(0, proRataRent + deductions - discounts);
  const netRefund = Math.max(0, amountPaid - totalDue);
  const netDue = Math.max(0, totalDue - amountPaid);
  const isRefund = netRefund > 0;

  // Format dates for display
  const fromFormatted = useMemo(() => {
    try {
      return format(parseDateOnly(fromDate), 'dd MMM yyyy');
    } catch {
      return fromDate;
    }
  }, [fromDate]);

  const toFormatted = useMemo(() => {
    try {
      return format(parseDateOnly(toDate), 'dd MMM yyyy');
    } catch {
      return toDate;
    }
  }, [toDate]);

  // Template Data bundle
  const templateData: SettlementRefundTemplateData | null = useMemo(() => {
    if (!data) return null;
    return {
      tenantName: tenantName || data.tenantName || 'Tenant',
      tenantPhone: data.tenantPhone,
      roomNo: roomNo || data.roomNo || '101',
      sharingType: data.sharingType,
      fromDate: fromFormatted,
      toDate: toFormatted,
      daysStayed,
      monthlyRent: data.monthlyRent,
      dailyRate: effectiveDailyRate,
      rateMode,
      proRataRent,
      amountPaid,
      deductions,
      deductionReason,
      discounts,
      netRefund,
      netDue,
      isRefund,
      settlementStatus: isRefund ? 'Refund Due' : netDue === 0 ? 'Settled' : 'Pending Due',
      pgName: currentPG?.name || 'PG Management',
      pgPhone: currentPG?.phone || undefined,
      generatedDate: format(new Date(), 'dd MMM yyyy, h:mm a'),
    };
  }, [
    data,
    tenantName,
    roomNo,
    fromFormatted,
    toFormatted,
    daysStayed,
    effectiveDailyRate,
    rateMode,
    proRataRent,
    amountPaid,
    deductions,
    deductionReason,
    discounts,
    netRefund,
    netDue,
    isRefund,
    currentPG,
  ]);

  // Generate PNG
  const handleGenerateImage = async () => {
    if (!templateRef.current) return;
    setIsGenerating(true);
    try {
      const url = await generateReceiptImage(templateRef.current, `Refund_Voucher_${tenantName || data?.tenantName || 'Tenant'}`);
      setGeneratedImage(url);
      toast({ title: 'Template Image Generated', description: 'Ready to share on WhatsApp or download.' });
    } catch (err) {
      console.error('[SettlementRefundDialog] generate error', err);
      toast({
        variant: 'destructive',
        title: 'Image generation failed',
        description: 'Unable to render image. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const activeTenantName = tenantName || data?.tenantName || 'Tenant';
  const activeRoomNo = roomNo || data?.roomNo || '101';

  const handleDownload = () => {
    if (!generatedImage) return;
    downloadReceiptImage(generatedImage, `Settlement_Refund_${activeTenantName}_Room_${activeRoomNo}.png`);
  };

  const shareToWhatsApp = async () => {
    if (!data) return;
    setIsSending(true);

    let imageUrl = generatedImage;
    if (!imageUrl && templateRef.current) {
      try {
        imageUrl = await generateReceiptImage(templateRef.current);
        setGeneratedImage(imageUrl);
      } catch (e) {
        console.error('Could not generate image before share', e);
      }
    }

    const messageText =
      `*PG Hub Move-out Settlement & Refund Voucher*\n\n` +
      `Hello ${activeTenantName},\n` +
      `Here is your move-out pro-rata calculation for Room ${activeRoomNo}:\n\n` +
      `• *Stay Period:* ${fromFormatted} to ${toFormatted} (${daysStayed} days)\n` +
      `• *Day-wise Rate:* ₹${effectiveDailyRate}/day (${rateMode === 'custom' ? 'Custom rate' : 'Standard'})\n` +
      `• *Pro-rata Stay Rent:* ₹${proRataRent.toLocaleString('en-IN')}\n` +
      `• *Rent Paid Upfront:* ₹${amountPaid.toLocaleString('en-IN')}\n` +
      (deductions > 0 ? `• *Deductions (${deductionReason}):* -₹${deductions.toLocaleString('en-IN')}\n` : '') +
      (discounts > 0 ? `• *Discount:* -₹${discounts.toLocaleString('en-IN')}\n` : '') +
      `\n` +
      (isRefund
        ? `*👉 REFUND AMOUNT TO RETURN: ₹${netRefund.toLocaleString('en-IN')}*\n(Tenant paid full month rent & left early)\n`
        : `*👉 PENDING BALANCE DUE: ₹${netDue.toLocaleString('en-IN')}*\n`
      ) +
      `\n${currentPG?.name ? `Best regards,\n${currentPG.name}` : ''}`;

    const phone = data.tenantPhone ? data.tenantPhone.replace(/[^0-9]/g, '') : '';

    if (imageUrl && navigator.canShare) {
      try {
        const blob = dataURLtoBlob(imageUrl);
        const file = new File([blob], `Settlement_${activeTenantName}_Room_${activeRoomNo}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Settlement & Refund Breakdown - ${activeTenantName}`,
            text: messageText,
          });
          setIsSending(false);
          return;
        }
      } catch (err) {
        console.warn('Navigator share error, falling back to WhatsApp link:', err);
      }
    }

    // Fallback: download image and open WhatsApp URL
    if (imageUrl) {
      downloadReceiptImage(imageUrl, `Settlement_${activeTenantName}_Room_${activeRoomNo}.png`);
    }

    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
    setIsSending(false);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 grid place-items-center text-amber-600">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Settlement & Refund Voucher
              </DialogTitle>
              <DialogDescription className="text-xs">
                Custom day-wise rent, date range selection, and WhatsApp template image.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Section 0: Tenant & Room Details ── */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Tenant Name</Label>
              <Input
                value={tenantName}
                placeholder="e.g. Ramesh Kumar"
                onChange={(e) => {
                  setTenantName(e.target.value);
                  setGeneratedImage(null);
                }}
                className="h-8 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Room Number</Label>
              <Input
                value={roomNo}
                placeholder="e.g. 101"
                onChange={(e) => {
                  setRoomNo(e.target.value);
                  setGeneratedImage(null);
                }}
                className="h-8 text-xs mt-0.5 font-medium"
              />
            </div>
          </div>

          {/* ── Section 1: Date Range Selection ── */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Date Range Selection
              </span>
              <Badge variant="secondary" className="text-[11px] font-bold">
                {daysStayed} Days Stayed
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">From Date (Join / Start)</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setGeneratedImage(null);
                  }}
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">To Date (Leave / Vacate)</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setGeneratedImage(null);
                  }}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Day-Wise Rent Mode ── */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-primary" />
                Day-Wise Rent Rate
              </span>
              <span className="text-xs font-bold text-primary">
                ₹{effectiveDailyRate}/day
              </span>
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                type="button"
                variant={rateMode === 'standard-30' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs px-2"
                onClick={() => {
                  setRateMode('standard-30');
                  setGeneratedImage(null);
                }}
              >
                30 Days (₹{Math.round(data.monthlyRent / 30)})
              </Button>
              <Button
                type="button"
                variant={rateMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs px-2"
                onClick={() => {
                  setRateMode('calendar');
                  setGeneratedImage(null);
                }}
              >
                {daysInMonth} Days (₹{Math.round(data.monthlyRent / daysInMonth)})
              </Button>
              <Button
                type="button"
                variant={rateMode === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs px-2"
                onClick={() => {
                  setRateMode('custom');
                  if (!customRate) setCustomRate(Math.round(data.monthlyRent / 30));
                  setGeneratedImage(null);
                }}
              >
                Custom Rate
              </Button>
            </div>

            {/* Custom Rate Input when 'custom' selected */}
            {rateMode === 'custom' && (
              <div className="pt-1.5 flex items-center gap-2">
                <Label className="text-xs shrink-0">Enter Custom Daily Rate:</Label>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                  <Input
                    type="number"
                    value={customRate || ''}
                    onChange={(e) => {
                      setCustomRate(Number(e.target.value) || 0);
                      setGeneratedImage(null);
                    }}
                    placeholder="e.g. 350"
                    className="h-8 pl-6 text-xs"
                  />
                </div>
                <span className="text-xs text-muted-foreground shrink-0">/ day</span>
              </div>
            )}
          </div>

          {/* ── Section 3: Financial Adjustments ── */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Rent Paid Upfront (₹)</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => {
                  setAmountPaid(Number(e.target.value) || 0);
                  setGeneratedImage(null);
                }}
                className="h-9 text-xs mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Deductions (₹)</Label>
              <Input
                type="number"
                value={deductions || ''}
                placeholder="0"
                onChange={(e) => {
                  setDeductions(Number(e.target.value) || 0);
                  setGeneratedImage(null);
                }}
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>

          {/* ── Summary Result Highlight ── */}
          <div
            className={`p-3.5 rounded-xl border text-center ${
              isRefund
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wide">
              {isRefund ? '🎉 Refund Amount to Return' : 'Pending Rent Due from Tenant'}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold mt-1">
              ₹{(isRefund ? netRefund : netDue).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] opacity-80 mt-1">
              Pro-rata stay: {daysStayed} days × ₹{effectiveDailyRate} = ₹{proRataRent.toLocaleString('en-IN')}
            </p>
          </div>

          {/* ── Hidden / Off-screen Template for High-Res PNG Capture ── */}
          <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', zIndex: -100 }}>
            {templateData && <SettlementRefundTemplate ref={templateRef} data={templateData} />}
          </div>

          {/* ── Generated Image Preview ── */}
          {generatedImage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Generated Voucher Preview</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
              <div className="rounded-xl border overflow-hidden shadow-xs bg-white">
                <img src={generatedImage} alt="Settlement Voucher" className="w-full h-auto" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!generatedImage ? (
            <Button
              type="button"
              onClick={handleGenerateImage}
              disabled={isGenerating}
              variant="outline"
              className="w-full sm:w-auto flex-1 gap-1.5 h-10 text-xs sm:text-sm font-semibold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating Image...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-500" /> Generate Template Image
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleGenerateImage}
              disabled={isGenerating}
              variant="outline"
              className="w-full sm:w-auto text-xs h-10"
            >
              Regenerate
            </Button>
          )}

          <Button
            type="button"
            onClick={shareToWhatsApp}
            disabled={isSending || isGenerating}
            className="w-full sm:w-auto flex-1 gap-1.5 h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Preparing WhatsApp...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Send Voucher to WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
