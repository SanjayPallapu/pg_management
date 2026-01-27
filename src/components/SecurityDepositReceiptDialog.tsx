import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, Download, Copy, Check, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SecurityDepositReceiptTemplate, type SecurityDepositReceiptData } from '@/components/SecurityDepositReceiptTemplate';
import { generateReceiptImage, downloadReceiptImage } from '@/utils/generateReceiptImage';

interface SecurityDepositReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SecurityDepositReceiptData | null;
  tenantPhone?: string;
}

export const SecurityDepositReceiptDialog = ({ 
  open, 
  onOpenChange, 
  data,
  tenantPhone 
}: SecurityDepositReceiptDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Handle OS back gesture to close dialog
  useBackGesture(open, () => onOpenChange(false));

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setGeneratedImage(null);
      setCopied(false);
    }
  }, [open]);

  const generateReceipt = useCallback(async () => {
    if (!data || !receiptRef.current) {
      toast({
        title: 'Error',
        description: 'Receipt data not ready. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const dataUrl = await generateReceiptImage(receiptRef.current);
      setGeneratedImage(dataUrl);
      toast({ title: 'Receipt generated successfully!' });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: 'Failed to generate receipt',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [data]);

  const handleDownload = () => {
    if (!generatedImage || !data) return;
    downloadReceiptImage(generatedImage, `${data.tenant.name}-deposit`);
    toast({ title: 'Receipt downloaded!' });
  };

  const shareReceiptToWhatsApp = async () => {
    if (!generatedImage || !data || !tenantPhone) {
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
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const safeName = data.tenant.name.replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `deposit-receipt-${safeName}.png`, { type: 'image/png' });

      // Clean phone number for display
      let phone = tenantPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;

      const message = `Hi ${data.tenant.name},\n\nYour security deposit of ₹${Math.floor(data.deposit.amount).toLocaleString('en-IN')} has been received successfully.\n\nThis amount is refundable upon vacating the hostel.\n\nThank you!\n- Amma Women's Hostel`;

      // Copy phone number to clipboard for easy search
      await navigator.clipboard.writeText(displayPhone);

      // Show tenant details in toast for searching
      toast({ 
        title: `📱 Search: ${data.tenant.name}`, 
        description: `Phone ${displayPhone} copied! Paste in WhatsApp search.`,
        duration: 8000,
      });

      // Small delay so user sees the toast
      await new Promise(resolve => setTimeout(resolve, 500));

      // Use Web Share API to share image
      const navAny = navigator as any;
      if (navAny?.share && navAny?.canShare?.({ files: [file] })) {
        await navAny.share({
          text: message,
          files: [file],
        });
      } else {
        // Fallback: download and open WhatsApp
        downloadReceiptImage(generatedImage, `${data.tenant.name}-deposit`);
        if (!phone.startsWith('91')) phone = `91${phone}`;
        window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      }
    } catch (e: any) {
      console.error('shareReceiptToWhatsApp error', e);
      if (e?.name !== 'AbortError') {
        toast({
          title: 'Share failed',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const copyReceiptData = () => {
    if (!data) return;

    const jsonData = JSON.stringify({
      tenant: data.tenant,
      room: data.room,
      deposit: data.deposit,
    }, null, 2);

    navigator.clipboard.writeText(jsonData);
    setCopied(true);
    toast({ title: 'Receipt data copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <>
      {/* Offscreen receipt template for rendering */}
      {data && (
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
          <SecurityDepositReceiptTemplate ref={receiptRef} data={data} />
        </div>
      )}
      
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              Security Deposit Receipt
            </AlertDialogTitle>
            <AlertDialogDescription>
              Generate and send security deposit receipt to {data?.tenant.name} via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {data && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium">{data.tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-medium">{data.room.roomNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium text-purple-600">₹{Math.floor(data.deposit.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="font-medium">{data.deposit.mode === 'upi' ? 'UPI/Online' : 'Cash'}</span>
                </div>
              </div>

              {generatedImage && (
                <div className="relative">
                  <img 
                    src={generatedImage} 
                    alt="Security Deposit Receipt" 
                    className="w-full rounded-lg border"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  onClick={generateReceipt}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Receipt...
                    </>
                  ) : generatedImage ? (
                    'Regenerate Receipt'
                  ) : (
                    'Generate Receipt Image'
                  )}
                </Button>

                <Button
                  onClick={copyReceiptData}
                  variant="outline"
                  className="w-full"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Receipt Data (JSON)
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleClose}>Close</AlertDialogCancel>

            {generatedImage && tenantPhone && (
              <Button 
                onClick={shareReceiptToWhatsApp} 
                disabled={isSending}
                className="gap-2 bg-green-600 hover:bg-green-700"
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
