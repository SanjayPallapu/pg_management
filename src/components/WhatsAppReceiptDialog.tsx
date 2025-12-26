import { useState, useRef, useEffect } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, Download, Copy, Check } from 'lucide-react';
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

  const generateReceipt = async () => {
    if (!receiptRef.current || !receiptData) return;

    setIsGenerating(true);
    try {
      // Wait a bit for images to render
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
  };

  const handleDownload = () => {
    if (!generatedImage || !receiptData) return;
    downloadReceiptImage(generatedImage, receiptData.tenantName);
    toast({ title: 'Receipt downloaded!' });
  };

  const openWhatsApp = () => {
    if (!receiptData) return;

    const phone = receiptData.tenantPhone.replace(/\D/g, '');
    const phoneNumber = phone.startsWith('91') ? phone : `91${phone}`;
    
    const message = receiptData.isFullPayment
      ? `Hi ${receiptData.tenantName},\n\nYour rent payment of ₹${Math.floor(receiptData.amountPaid).toLocaleString('en-IN')} for ${receiptData.forMonth} has been received successfully.\n\nThank you!\n- Amma Women's Hostel`
      : `Hi ${receiptData.tenantName},\n\nWe have received your partial payment of ₹${Math.floor(receiptData.amountPaid).toLocaleString('en-IN')} for ${receiptData.forMonth}.\n\nRemaining balance: ₹${Math.floor(receiptData.remainingBalance || 0).toLocaleString('en-IN')}\n\nPlease pay the remaining amount at your earliest convenience.\n\nThank you!\n- Amma Women's Hostel`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
      {/* Hidden receipt template for rendering */}
      {templateData && <ReceiptTemplate ref={receiptRef} data={templateData} />}
      
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
            <AlertDialogAction 
              onClick={openWhatsApp}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Open WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
