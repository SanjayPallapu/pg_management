import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Bell, Download, MessageCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PaymentReminderTemplate, type ReminderData } from '@/components/PaymentReminderTemplate';
import { ACBillTemplate, type ACBillData } from '@/components/ACBillTemplate';
import { generateReceiptImage, downloadReceiptImage } from '@/utils/generateReceiptImage';
import { useMonthContext } from '@/contexts/MonthContext';
import { usePG } from '@/contexts/PGContext';

interface ReminderInputData {
  tenantName: string;
  tenantPhone: string;
  joiningDate: string;
  forMonth: string;
  roomNo: string;
  sharingType: string;
  amount: number;
  amountPaid?: number;
  balance: number;
  // Optional overrides for when called from Previous Overdue sheet
  overrideMonth?: number;
  overrideYear?: number;
  acSurcharge?: { units: number; unitPrice: number; share: number };
  acBill?: ACBillData;
}

interface PaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminderData: ReminderInputData | null;
}

type NavigatorWithFileShare = Navigator & {
  canShare?: (data?: ShareData) => boolean;
};

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export const PaymentReminderDialog = ({ open, onOpenChange, reminderData }: PaymentReminderDialogProps) => {
  const { currentPG } = usePG();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAcImage, setGeneratedAcImage] = useState<string | null>(null);
  const [isGeneratingAc, setIsGeneratingAc] = useState(false);
  const reminderRef = useRef<HTMLDivElement>(null);
  const acRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<ReminderData | null>(null);
  const { selectedMonth, selectedYear } = useMonthContext();
  const [hideTenantName, setHideTenantName] = useState(false);

  useBackGesture(open, () => onOpenChange(false));

  useEffect(() => {
    if (reminderData && open) {
      const monthToUse = reminderData.overrideMonth ?? selectedMonth;
      const yearToUse = reminderData.overrideYear ?? selectedYear;
      
      setTemplateData({
        tenant: {
          name: reminderData.tenantName,
          joiningDate: reminderData.joiningDate,
        },
        stay: {
          month: reminderData.forMonth,
          roomNo: reminderData.roomNo,
          sharingType: reminderData.sharingType,
        },
        payment: {
          amount: reminderData.amount,
          paid: reminderData.amountPaid,
          balance: reminderData.balance,
        },
        selectedMonth: monthToUse,
        selectedYear: yearToUse,
        pgName: currentPG?.name,
        pgLogoUrl: currentPG?.logoUrl,
        hideTenantName,
        acSurcharge: reminderData.acSurcharge,
      });
    }
  }, [reminderData, open, selectedMonth, selectedYear, currentPG, hideTenantName]);

  const generateReminder = useCallback(async () => {
    if (!reminderData || !templateData || !reminderRef.current) {
      toast({ title: 'Error', description: 'Data not ready.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(reminderRef.current);
      setGeneratedImage(dataUrl);
      toast({ title: 'Reminder image generated!' });
    } catch (error) {
      console.error('Error generating reminder:', error);
      toast({ title: 'Failed to generate', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [reminderData, templateData]);

  const getOrCreateReminderImage = useCallback(async () => {
    if (generatedImage) return generatedImage;
    if (!reminderData || !templateData || !reminderRef.current) {
      throw new Error('Reminder data is not ready');
    }

    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(reminderRef.current);
      setGeneratedImage(dataUrl);
      return dataUrl;
    } finally {
      setIsGenerating(false);
    }
  }, [generatedImage, reminderData, templateData]);

  const handleDownload = () => {
    if (!generatedImage || !reminderData) return;
    downloadReceiptImage(generatedImage, `reminder-${reminderData.tenantName}`);
    toast({ title: 'Reminder downloaded!' });
  };

  const generateAcBill = useCallback(async () => {
    if (!reminderData?.acBill || !acRef.current) return;
    setIsGeneratingAc(true);
    try {
      const dataUrl = await generateReceiptImage(acRef.current);
      setGeneratedAcImage(dataUrl);
      toast({ title: 'AC bill image generated!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to generate AC bill', variant: 'destructive' });
    } finally {
      setIsGeneratingAc(false);
    }
  }, [reminderData]);

  const shareAcToWhatsApp = async () => {
    if (!generatedAcImage || !reminderData) return;
    try {
      const res = await fetch(generatedAcImage);
      const blob = await res.blob();
      const file = new File([blob], `ac-bill-room-${reminderData.roomNo}.png`, { type: 'image/png' });
      let phone = reminderData.tenantPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;
      await navigator.clipboard.writeText(displayPhone);
      const shareNavigator = navigator as NavigatorWithFileShare;
      if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
        await shareNavigator.share({ files: [file] });
      } else {
        downloadReceiptImage(generatedAcImage, `ac-bill-room-${reminderData.roomNo}`);
        if (!phone.startsWith('91')) phone = `91${phone}`;
        window.location.href = `https://wa.me/${phone}`;
      }
    } catch (e) {
      if (!isAbortError(e)) toast({ title: 'Share failed', variant: 'destructive' });
    }
  };

  const shareToWhatsApp = async () => {
    if (!reminderData) return;

    setIsSending(true);
    try {
      const image = await getOrCreateReminderImage();
      const res = await fetch(image);
      const blob = await res.blob();
      const safeName = reminderData.tenantName.replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `reminder-${safeName}.png`, { type: 'image/png' });

      let phone = reminderData.tenantPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;

      await navigator.clipboard.writeText(displayPhone);
      toast({ 
        title: `📱 Search: ${reminderData.tenantName}`, 
        description: `Phone ${displayPhone} copied!`,
        duration: 8000,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const shareNavigator = navigator as NavigatorWithFileShare;
      if (shareNavigator.share && shareNavigator.canShare?.({ files: [file] })) {
        // Share only the image file, no text
        await shareNavigator.share({ files: [file] });
      } else {
        // Fallback: download image and open WhatsApp chat (no pre-filled text)
        downloadReceiptImage(image, `reminder-${reminderData.tenantName}`);
        if (!phone.startsWith('91')) phone = `91${phone}`;
        window.location.href = `https://wa.me/${phone}`;
      }
    } catch (e) {
      if (!isAbortError(e)) {
        toast({ title: 'Share failed', variant: 'destructive' });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setGeneratedAcImage(null);
    setTemplateData(null);
    setHideTenantName(false);
    onOpenChange(false);
  };

  const copyDataToClipboard = () => {
    if (!reminderData) return;
    const jsonData = {
      tenant: reminderData.tenantName,
      phone: reminderData.tenantPhone,
      amountDue: reminderData.balance,
      totalAmount: reminderData.amount,
      amountPaid: reminderData.amountPaid || 0,
      forMonth: reminderData.forMonth,
      roomNo: reminderData.roomNo,
    };
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    toast({ title: 'Reminder data copied!' });
  };

  return (
    <>
      {templateData && (
        <div style={{ position: 'fixed', left: '0', top: '0', transform: 'translateX(-200vw)', zIndex: -1, pointerEvents: 'none' }} aria-hidden="true">
          <PaymentReminderTemplate ref={reminderRef} data={templateData} />
          {reminderData?.acBill && (
            <ACBillTemplate ref={acRef} data={{ ...reminderData.acBill, tenantName: reminderData.tenantName }} />
          )}
        </div>
      )}
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                Send Payment Reminder
              </DialogTitle>
            </div>
            <DialogDescription>
              Generate and send payment reminder to {reminderData?.tenantName} via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {reminderData && (
            <div className="py-4 space-y-4">
              {/* Custom: hide tenant name (for common/shared room reminders) */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex flex-col">
                  <Label htmlFor="hideTenantName" className="cursor-pointer font-medium">Hide Tenant Name</Label>
                  <span className="text-xs text-muted-foreground">Send a common reminder for the room (no name)</span>
                </div>
                <Switch
                  id="hideTenantName"
                  checked={hideTenantName}
                  onCheckedChange={(checked) => { setHideTenantName(checked); setGeneratedImage(null); }}
                />
              </div>

              {/* Summary Card matching the receipt dialog style */}
              <div className="rounded-lg p-4 text-sm space-y-2 border border-border bg-muted/30">
                {!hideTenantName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tenant:</span>
                    <span className="font-semibold">{reminderData.tenantName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Due:</span>
                  <span className="font-semibold text-amber-600">
                    ₹{Math.floor(reminderData.balance + (reminderData.acSurcharge?.share || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                {reminderData.acSurcharge && reminderData.acSurcharge.share > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-600 dark:text-blue-400 text-xs">↳ AC Electricity:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 text-xs">
                      ₹{reminderData.acSurcharge.share.toLocaleString('en-IN')}
                      <span className="opacity-70 ml-1">
                        ({reminderData.acSurcharge.units}u × ₹{reminderData.acSurcharge.unitPrice})
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">For Month:</span>
                  <span className="font-semibold">{reminderData.forMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room No:</span>
                  <span className="font-semibold">{reminderData.roomNo}</span>
                </div>
              </div>

              {/* Generated Image Preview */}
              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Payment Reminder" className="w-full rounded-lg border" />
                  <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Generate Reminder Image Button */}
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

              {/* Copy Data Button */}
              <Button 
                onClick={copyDataToClipboard} 
                variant="outline" 
                className="w-full h-11 gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeWidth="2"/>
                </svg>
                Copy Reminder Data (JSON)
              </Button>

              {/* AC Bill section — only for AC rooms with a reading */}
              {reminderData.acBill && (
                <div className="rounded-lg border border-sky-300/50 bg-sky-50 dark:bg-sky-950/20 p-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-sky-700 dark:text-sky-300">⚡ AC Electricity Bill</span>
                    <span className="text-xs text-sky-700/80 dark:text-sky-300/80">
                      {reminderData.acBill.units}u × ₹{reminderData.acBill.unitPrice} = ₹{reminderData.acBill.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {generatedAcImage && (
                    <img src={generatedAcImage} alt="AC Bill" className="w-full rounded-md border" />
                  )}
                  <Button
                    onClick={generateAcBill}
                    disabled={isGeneratingAc}
                    variant="secondary"
                    className="w-full h-10"
                  >
                    {isGeneratingAc ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                    ) : generatedAcImage ? 'Regenerate AC Bill' : 'Generate AC Bill Image'}
                  </Button>
                  {generatedAcImage && (
                    <Button
                      onClick={shareAcToWhatsApp}
                      className="w-full h-10 gap-2 bg-sky-600 hover:bg-sky-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send AC Bill to WhatsApp
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={shareToWhatsApp}
              disabled={isSending || isGenerating || !templateData}
              className="w-full gap-2 bg-green-600 hover:bg-green-700 h-11"
            >
              {isSending || isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Preparing...</>
              ) : (
                <><MessageCircle className="h-4 w-4" />{generatedImage ? 'Send to WhatsApp' : 'Generate & Send to WhatsApp'}</>
              )}
            </Button>
            <Button variant="outline" onClick={handleClose} className="w-full h-11 mt-0">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
