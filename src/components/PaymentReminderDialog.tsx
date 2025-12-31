import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Download, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PaymentReminderTemplate, type ReminderData } from '@/components/PaymentReminderTemplate';
import { generateReceiptImage, downloadReceiptImage } from '@/utils/generateReceiptImage';

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
}

interface PaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminderData: ReminderInputData | null;
}

export const PaymentReminderDialog = ({ open, onOpenChange, reminderData }: PaymentReminderDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const reminderRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<ReminderData | null>(null);

  useBackGesture(open, () => onOpenChange(false));

  useEffect(() => {
    if (reminderData && open) {
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
      });
    }
  }, [reminderData, open]);

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
    downloadReceiptImage(generatedImage, `reminder-${reminderData.tenantName}`);
    toast({ title: 'Reminder downloaded!' });
  };

  const shareToWhatsApp = async () => {
    if (!generatedImage || !reminderData) return;

    setIsSending(true);
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const safeName = reminderData.tenantName.replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `reminder-${safeName}.png`, { type: 'image/png' });

      let phone = reminderData.tenantPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;

      const message = `Hi ${reminderData.tenantName},\n\nThis is a gentle reminder for your rent payment of ₹${Math.floor(reminderData.balance).toLocaleString('en-IN')} for ${reminderData.forMonth}.\n\nPlease make the payment at your earliest convenience.\n\nThank you!\n- Amma Women's Hostel`;

      await navigator.clipboard.writeText(displayPhone);
      toast({ 
        title: `📱 Search: ${reminderData.tenantName}`, 
        description: `Phone ${displayPhone} copied!`,
        duration: 8000,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const navAny = navigator as any;
      if (navAny?.share && navAny?.canShare?.({ files: [file] })) {
        await navAny.share({ text: message, files: [file] });
      } else {
        downloadReceiptImage(generatedImage, `reminder-${reminderData.tenantName}`);
        if (!phone.startsWith('91')) phone = `91${phone}`;
        window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
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
        <div style={{ position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden' }} aria-hidden="true">
          <PaymentReminderTemplate ref={reminderRef} data={templateData} />
        </div>
      )}
      
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              Payment Reminder
            </AlertDialogTitle>
            <AlertDialogDescription>
              Generate and send payment reminder to {reminderData?.tenantName}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {reminderData && (
            <div className="py-4 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-sm space-y-1 border border-amber-200 dark:border-amber-800">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium">{reminderData.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Due:</span>
                  <span className="font-medium text-amber-600">₹{Math.floor(reminderData.balance).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">For Month:</span>
                  <span className="font-medium">{reminderData.forMonth}</span>
                </div>
              </div>

              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Payment Reminder" className="w-full rounded-lg border" />
                  <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button onClick={generateReminder} disabled={isGenerating || !templateData} variant="outline" className="w-full">
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : generatedImage ? 'Regenerate Image' : 'Generate Reminder Image'}
              </Button>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Close</AlertDialogCancel>
            {generatedImage && (
              <Button onClick={shareToWhatsApp} disabled={isSending} className="gap-2 bg-amber-600 hover:bg-amber-700">
                {isSending ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : <><MessageCircle className="h-4 w-4" />Send to WhatsApp</>}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
