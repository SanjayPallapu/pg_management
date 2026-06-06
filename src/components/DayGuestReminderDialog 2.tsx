import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Download, MessageCircle } from 'lucide-react';
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

  useBackGesture(open, () => onOpenChange(false));

  useEffect(() => {
    if (reminderData && open) {
      setTemplateData({
        guestName: reminderData.guestName,
        fromDate: reminderData.fromDate,
        toDate: reminderData.toDate,
        numberOfDays: reminderData.numberOfDays,
        perDayRate: reminderData.perDayRate,
        totalAmount: reminderData.totalAmount,
        amountPaid: reminderData.amountPaid,
        balance: reminderData.balance,
        roomNo: reminderData.roomNo,
        pgName: currentPG?.name,
        pgLogoUrl: currentPG?.logoUrl,
      });
    }
  }, [reminderData, open, currentPG]);

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

  const handleDownload = () => {
    if (!generatedImage || !reminderData) return;
    downloadReceiptImage(generatedImage, `dayguest-reminder-${reminderData.guestName}`);
    toast({ title: 'Reminder downloaded!' });
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
      toast({
        title: `📱 Search: ${reminderData.guestName}`,
        description: `Phone ${displayPhone} copied!`,
        duration: 8000,
      });

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

      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-green-600" />
              Send Payment Reminder
            </AlertDialogTitle>
            <AlertDialogDescription>
              Generate and send day guest payment reminder to {reminderData?.guestName} via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>

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

          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
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
            <AlertDialogCancel onClick={handleClose} className="w-full h-11 mt-0">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
