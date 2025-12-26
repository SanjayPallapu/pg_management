import { useState, useRef, useEffect, useCallback } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, Download, Copy, Check, Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ReceiptTemplate, type ReceiptData } from '@/components/ReceiptTemplate';
import { generateReceiptImage, downloadReceiptImage, convertToReceiptData } from '@/utils/generateReceiptImage';

interface ReceiptInputData {
  tenantName: string;
  tenantPhone: string;
  paymentMode: string;
  paymentDate: string;
  joiningDate: string;
  forMonth: string;
  roomNo: string;
  sharingType: string;
  amount: number;
  amountPaid: number;
  isFullPayment: boolean;
  remainingBalance?: number;
}

interface WhatsAppReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptInputData | null;
}

export const WhatsAppReceiptDialog = ({ open, onOpenChange, receiptData }: WhatsAppReceiptDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    if (receiptData && open) {
      const data = convertToReceiptData(
        receiptData.tenantName,
        receiptData.tenantPhone,
        receiptData.paymentMode,
        receiptData.paymentDate,
        receiptData.joiningDate,
        receiptData.forMonth,
        receiptData.roomNo,
        receiptData.sharingType,
        receiptData.amount,
        receiptData.amountPaid,
        receiptData.isFullPayment,
        receiptData.remainingBalance
      );
      setTemplateData(data);
    }
  }, [receiptData, open]);

  const generateReceipt = useCallback(async () => {
    if (!receiptData || !templateData || !receiptRef.current) {
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
  }, [receiptData, templateData]);

  const handleDownload = () => {
    if (!generatedImage || !receiptData) return;
    downloadReceiptImage(generatedImage, receiptData.tenantName);
    toast({ title: 'Receipt downloaded!' });
  };

  const shareReceiptImage = async () => {
    if (!generatedImage || !receiptData) {
      toast({
        title: 'Generate receipt first',
        description: 'Please generate the receipt image before sharing.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `receipt-${receiptData.tenantName.replace(/\s+/g, '-').toLowerCase()}.png`,
        { type: blob.type || 'image/png' }
      );

      const navAny = navigator as any;
      if (navAny?.share && (!navAny?.canShare || navAny.canShare({ files: [file] }))) {
        await navAny.share({
          title: 'Payment Receipt',
          text: `Receipt for ${receiptData.tenantName}`,
          files: [file],
        });
        toast({ title: 'Share opened. Select WhatsApp.' });
        return;
      }

      handleDownload();
      toast({ title: 'Sharing not supported here', description: 'Receipt downloaded instead.' });
    } catch (e) {
      console.error('shareReceiptImage error', e);
      handleDownload();
      toast({ title: 'Share failed', description: 'Receipt downloaded instead.' });
    }
  };

  const openWhatsApp = () => {
    if (!receiptData) return;

    // Clean phone number - remove all non-digits
    let phone = receiptData.tenantPhone.replace(/\D/g, '');

    // Add country code if not present
    if (!phone.startsWith('91')) {
      phone = `91${phone}`;
    }

    const message = receiptData.isFullPayment
      ? `Hi ${receiptData.tenantName},\n\nYour rent payment of ₹${Math.floor(receiptData.amountPaid).toLocaleString('en-IN')} for ${receiptData.forMonth} has been received successfully.\n\nThank you!\n- Amma Women's Hostel`
      : `Hi ${receiptData.tenantName},\n\nWe have received your partial payment of ₹${Math.floor(receiptData.amountPaid).toLocaleString('en-IN')} for ${receiptData.forMonth}.\n\nRemaining balance: ₹${Math.floor(receiptData.remainingBalance || 0).toLocaleString('en-IN')}\n\nPlease pay the remaining amount at your earliest convenience.\n\nThank you!\n- Amma Women's Hostel`;

    const encodedMessage = encodeURIComponent(message);

    // Most reliable deep-link: wa.me (opens app if installed, otherwise web)
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.location.href = whatsappUrl;
  };

  const copyReceiptData = () => {
    if (!receiptData) return;

    const jsonData = JSON.stringify({
      tenant: {
        name: receiptData.tenantName,
        joiningDate: receiptData.joiningDate,
      },
      stay: {
        month: receiptData.forMonth,
        roomNo: receiptData.roomNo,
        sharingType: receiptData.sharingType,
      },
      payment: {
        type: receiptData.isFullPayment ? 'FULL' : 'PARTIAL',
        amount: receiptData.amount,
        paid: receiptData.amountPaid,
        balance: receiptData.remainingBalance || 0,
        mode: receiptData.paymentMode === 'upi' ? 'Online' : 'Cash',
        date: receiptData.paymentDate,
      },
    }, null, 2);

    navigator.clipboard.writeText(jsonData);
    setCopied(true);
    toast({ title: 'Receipt data copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setCopied(false);
    setTemplateData(null);
    onOpenChange(false);
  };

  return (
    <>
      {/* Offscreen receipt template for rendering - always mounted when dialog open */}
      {templateData && (
        <div 
          style={{ 
            position: 'fixed',
            left: '-10000px',
            top: '0',
            visibility: 'hidden',
          }}
          aria-hidden="true"
        >
          <ReceiptTemplate ref={receiptRef} data={templateData} />
        </div>
      )}
      
      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Send Payment Receipt
            </AlertDialogTitle>
            <AlertDialogDescription>
              Generate and send payment receipt to {receiptData?.tenantName} via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {receiptData && (
            <div className="py-4 space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium">{receiptData.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-medium text-green-600">₹{Math.floor(receiptData.amountPaid).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">For Month:</span>
                  <span className="font-medium">{receiptData.forMonth}</span>
                </div>
                {!receiptData.isFullPayment && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-medium text-orange-600">₹{Math.floor(receiptData.remainingBalance || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="relative">
                  <img 
                    src={generatedImage} 
                    alt="Payment Receipt" 
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
                  disabled={isGenerating || !templateData}
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

            {generatedImage && (
              <Button onClick={shareReceiptImage} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share Receipt
              </Button>
            )}

            <Button onClick={openWhatsApp} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Open WhatsApp Chat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
