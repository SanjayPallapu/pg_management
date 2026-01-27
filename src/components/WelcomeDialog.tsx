import { useState, useRef, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, PartyPopper, Download, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { WelcomeTemplate, type WelcomeData } from '@/components/WelcomeTemplate';
import { generateReceiptImage, downloadReceiptImage } from '@/utils/generateReceiptImage';

const FIXED_SECURITY_DEPOSIT = 2000;

interface WelcomeInputData {
  tenantName: string;
  tenantPhone: string;
  joiningDate: string;
  roomNo: string;
  sharingType: string;
  monthlyRent: number;
  securityDeposit?: number;
}

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  welcomeData: WelcomeInputData | null;
}

export const WelcomeDialog = ({ open, onOpenChange, welcomeData }: WelcomeDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const [templateData, setTemplateData] = useState<WelcomeData | null>(null);
  const [includeSecurityDeposit, setIncludeSecurityDeposit] = useState(false);

  useBackGesture(open, () => onOpenChange(false));

  // Initialize security deposit toggle based on incoming data
  useEffect(() => {
    if (welcomeData && open) {
      // If security deposit was already included, set toggle on
      setIncludeSecurityDeposit(!!welcomeData.securityDeposit && welcomeData.securityDeposit > 0);
    }
  }, [welcomeData, open]);

  // Update template data whenever security deposit toggle changes
  useEffect(() => {
    if (welcomeData && open) {
      const joinDate = new Date(welcomeData.joiningDate);
      const selectedMonth = joinDate.getMonth() + 1;
      const selectedYear = joinDate.getFullYear();

      setTemplateData({
        tenant: {
          name: welcomeData.tenantName,
          joiningDate: welcomeData.joiningDate,
          phone: welcomeData.tenantPhone,
        },
        stay: {
          roomNo: welcomeData.roomNo,
          sharingType: welcomeData.sharingType,
        },
        payment: {
          monthlyRent: welcomeData.monthlyRent,
          securityDeposit: includeSecurityDeposit ? FIXED_SECURITY_DEPOSIT : undefined,
        },
        selectedMonth,
        selectedYear,
      });
      // Clear generated image when toggle changes
      setGeneratedImage(null);
    }
  }, [welcomeData, open, includeSecurityDeposit]);

  const generateWelcome = useCallback(async () => {
    if (!welcomeData || !templateData || !welcomeRef.current) {
      toast({ title: 'Error', description: 'Data not ready.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(welcomeRef.current);
      setGeneratedImage(dataUrl);
      toast({ title: 'Welcome image generated!' });
    } catch (error) {
      console.error('Error generating welcome image:', error);
      toast({ title: 'Failed to generate', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [welcomeData, templateData]);

  const handleDownload = () => {
    if (!generatedImage || !welcomeData) return;
    downloadReceiptImage(generatedImage, `welcome-${welcomeData.tenantName}`);
    toast({ title: 'Welcome image downloaded!' });
  };

  const shareToWhatsApp = async () => {
    if (!generatedImage || !welcomeData) return;

    setIsSending(true);
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const safeName = welcomeData.tenantName.replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `welcome-${safeName}.png`, { type: 'image/png' });

      let phone = welcomeData.tenantPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;

      await navigator.clipboard.writeText(displayPhone);
      toast({
        title: `📱 Search: ${welcomeData.tenantName}`,
        description: `Phone ${displayPhone} copied!`,
        duration: 8000,
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      const navAny = navigator as any;
      if (navAny?.share && navAny?.canShare?.({ files: [file] })) {
        // Share only the image file, no text
        await navAny.share({ files: [file] });
      } else {
        // Fallback: download image and open WhatsApp chat (no pre-filled text)
        downloadReceiptImage(generatedImage, `welcome-${welcomeData.tenantName}`);
        if (!phone.startsWith('91')) phone = `91${phone}`;
        window.location.href = `https://wa.me/${phone}`;
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
    setIncludeSecurityDeposit(false);
    onOpenChange(false);
  };

  return (
    <>
      {templateData && (
        <div style={{ position: 'fixed', left: '0', top: '0', transform: 'translateX(-200vw)', zIndex: -1, pointerEvents: 'none' }} aria-hidden="true">
          <WelcomeTemplate ref={welcomeRef} data={templateData} />
        </div>
      )}

      <AlertDialog open={open} onOpenChange={handleClose}>
        <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-pink-600" />
              Welcome New Tenant
            </AlertDialogTitle>
            <AlertDialogDescription>
              Generate and send a welcome message to {welcomeData?.tenantName} via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {welcomeData && (
            <div className="py-4 space-y-4">
              {/* Security Deposit Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-pink-200 bg-pink-50/50 dark:border-pink-900 dark:bg-pink-950/20">
                <div className="flex flex-col">
                  <Label htmlFor="includeDeposit" className="cursor-pointer font-medium">Include Security Deposit</Label>
                  <span className="text-xs text-muted-foreground">Fixed amount: ₹{FIXED_SECURITY_DEPOSIT.toLocaleString()}</span>
                </div>
                <Switch
                  id="includeDeposit"
                  checked={includeSecurityDeposit}
                  onCheckedChange={setIncludeSecurityDeposit}
                />
              </div>

              {/* Summary Card */}
              <div className="rounded-lg p-4 text-sm space-y-2 border border-border bg-pink-50/50 dark:bg-pink-950/20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-semibold">{welcomeData.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-semibold">{welcomeData.roomNo} ({welcomeData.sharingType})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Rent:</span>
                  <span className="font-semibold text-pink-600">₹{welcomeData.monthlyRent.toLocaleString('en-IN')}</span>
                </div>
                {includeSecurityDeposit && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Security Deposit:</span>
                    <span className="font-semibold text-purple-600">₹{FIXED_SECURITY_DEPOSIT.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Generated Image Preview */}
              {generatedImage && (
                <div className="relative">
                  <img src={generatedImage} alt="Welcome Message" className="w-full rounded-lg border" />
                  <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Generate Welcome Image Button */}
              <Button
                onClick={generateWelcome}
                disabled={isGenerating || !templateData}
                variant="secondary"
                className="w-full h-11"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                ) : generatedImage ? 'Regenerate Image' : 'Generate Welcome Image'}
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
