import { useState, useEffect, useCallback } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, Download, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateRulesImage } from '@/utils/generateRulesImage';
import { downloadReceiptImage } from '@/utils/generateReceiptImage';
import { getStoredPGRules, getStoredRulesLanguage, saveStoredRulesLanguage, type RulesLanguage } from '@/lib/pgRules';
import { usePG } from '@/contexts/PGContext';

interface RulesShareInputData {
  tenantName: string;
  tenantPhone: string;
}

interface RulesShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: RulesShareInputData | null;
}

export const RulesShareDialog = ({ open, onOpenChange, shareData }: RulesShareDialogProps) => {
  const { currentPG } = usePG();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [language, setLanguage] = useState<RulesLanguage>('en');

  useBackGesture(open, () => onOpenChange(false));

  useEffect(() => {
    if (open && currentPG) {
      setLanguage(getStoredRulesLanguage(currentPG.id));
      setGeneratedImage(null);
    }
  }, [open, currentPG]);

  const handleLanguageChange = (next: RulesLanguage) => {
    setLanguage(next);
    if (currentPG) saveStoredRulesLanguage(currentPG.id, next);
    setGeneratedImage(null);
  };

  const generate = useCallback(async () => {
    if (!currentPG) {
      toast({ title: 'PG not selected', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const dataUrl = await generateRulesImage({
        pgName: currentPG.name,
        pgLogoUrl: currentPG.logoUrl || '/icon-512.png',
        rules: getStoredPGRules(currentPG.id),
        language,
        templateStyle: 'professional',
      });
      setGeneratedImage(dataUrl);
      toast({ title: 'Rules image generated!' });
    } catch (e) {
      console.error('Rules generation failed:', e);
      toast({ title: 'Failed to generate', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  }, [currentPG, language]);

  const handleDownload = () => {
    if (!generatedImage || !shareData) return;
    downloadReceiptImage(generatedImage, `rules-${shareData.tenantName}`);
    toast({ title: 'Rules image downloaded!' });
  };

  const shareToWhatsApp = async () => {
    if (!generatedImage || !shareData) return;
    setIsSending(true);
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const safeName = shareData.tenantName.replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `rules-${safeName}.png`, { type: 'image/png' });

      let phone = shareData.tenantPhone.replace(/\D/g, '');
      const displayPhone = phone.startsWith('91') ? phone.slice(2) : phone;

      try { await navigator.clipboard.writeText(displayPhone); } catch {}
      toast({
        title: `📱 Search: ${shareData.tenantName}`,
        description: `Phone ${displayPhone} copied!`,
        duration: 8000,
      });

      await new Promise(r => setTimeout(r, 500));

      const navAny = navigator as any;
      if (navAny?.share && navAny?.canShare?.({ files: [file] })) {
        await navAny.share({ files: [file] });
      } else {
        downloadReceiptImage(generatedImage, `rules-${shareData.tenantName}`);
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
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Share Rules & Regulations
          </AlertDialogTitle>
          <AlertDialogDescription>
            Send PG rules to {shareData?.tenantName} via WhatsApp.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {/* Language Toggle */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Choose Language</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('en')}
                className="h-10"
              >
                English
              </Button>
              <Button
                variant={language === 'te' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleLanguageChange('te')}
                className="h-10"
              >
                తెలుగు Telugu
              </Button>
            </div>
          </div>

          {/* Generated Preview */}
          {generatedImage && (
            <div className="relative">
              <img src={generatedImage} alt="Rules" className="w-full rounded-lg border" />
              <Button size="sm" variant="secondary" className="absolute top-2 right-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            onClick={generate}
            disabled={isGenerating}
            variant="secondary"
            className="w-full h-11"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : generatedImage ? 'Regenerate Image' : 'Generate Rules Image'}
          </Button>
        </div>

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
  );
};
