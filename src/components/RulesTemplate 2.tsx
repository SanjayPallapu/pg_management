import { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Image as ImageIcon, Loader2, Printer, Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePG } from '@/contexts/PGContext';
import { RulesPosterContent } from '@/components/RulesPosterContent';
import { generateReceiptImage } from '@/utils/generateReceiptImage';
import type { Rule, RulesLanguage, RulesTemplateStyle } from '@/lib/pgRules';

interface RulesTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules?: Rule[];
  language?: RulesLanguage;
}

export const RulesTemplate = ({ open, onOpenChange, rules = [], language = 'en' }: RulesTemplateProps) => {
  const templateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [templateStyle, setTemplateStyle] = useState<RulesTemplateStyle>('professional');
  const [activeLanguage, setActiveLanguage] = useState<RulesLanguage>(language);
  const { currentPG } = usePG();

  // Sync language when prop changes (sheet opens with stored preference)
  useEffect(() => {
    setActiveLanguage(language);
  }, [language, open]);

  // Scale template to fit container width
  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth - 16;
      const scale = Math.min(1, containerWidth / 794);
      container.style.setProperty('--template-scale', String(scale));
      const template = templateRef.current;
      if (template) {
        container.style.height = `${template.scrollHeight * scale + 32}px`;
      }
    };
    if (open) {
      setTimeout(updateScale, 100);
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [open, templateStyle, rules, activeLanguage]);

  const pgName = currentPG?.name || 'PG Management';
  const pgLogoUrl = currentPG?.logoUrl || '/icon-512.png';

  const handleGenerateImage = async () => {
    if (!templateRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await generateReceiptImage(templateRef.current);
      const link = document.createElement('a');
      link.download = `${pgName.replace(/\s+/g, '_')}_Rules_${templateStyle}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Success', description: 'Rules image saved successfully' });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: 'Error', description: 'Failed to generate image' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!templateRef.current) return;
    const printWindow = window.open('', '', 'height=auto,width=auto');
    if (!printWindow) {
      toast({ title: 'Error', description: 'Unable to open print window' });
      return;
    }
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${pgName} - Rules</title><style>body{margin:0;padding:0;background:#fff;}@media print{body{padding:0;}}</style></head><body>${templateRef.current.outerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleShareWhatsApp = async () => {
    if (!templateRef.current) return;
    setIsSharing(true);
    try {
      const dataUrl = await generateReceiptImage(templateRef.current);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File(
        [blob],
        `${pgName.replace(/\s+/g, '_')}_Rules_${activeLanguage}.png`,
        { type: 'image/png' },
      );
      const navAny = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      if (navigator.share && navAny.canShare?.({ files: [file] })) {
        // Image-only share (no text) per project policy
        await navigator.share({ files: [file] });
        toast({ title: 'Shared', description: 'Rules image ready to send on WhatsApp' });
      } else {
        // Fallback: download then open WhatsApp Web
        const link = document.createElement('a');
        link.download = file.name;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.open('https://web.whatsapp.com/', '_blank');
        toast({ title: 'Image saved', description: 'Attach the downloaded image in WhatsApp' });
      }
    } catch (error) {
      console.error('Error sharing rules:', error);
      toast({ title: 'Error', description: 'Failed to share rules image' });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="[&>button]:hidden w-full md:w-3/4 lg:w-2/3 flex flex-col p-0">
        <SheetHeader className="relative border-b px-6 pb-4 pt-6 pl-16">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="absolute left-4 top-5 h-8 w-8 rounded-full p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <SheetTitle>Rules Template Preview</SheetTitle>
          <SheetDescription>Choose language & style, then share or save</SheetDescription>
        </SheetHeader>

        {/* Language selector */}
        <div className="border-b px-6 py-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Language</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={activeLanguage === 'en' ? 'default' : 'outline'}
                onClick={() => setActiveLanguage('en')}
                className="mb-[15px]"
              >
                English
              </Button>
              <Button
                variant={activeLanguage === 'te' ? 'default' : 'outline'}
                onClick={() => setActiveLanguage('te')}
                className="mb-[15px]"
              >
                తెలుగు Telugu
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Template Style</p>
            <div className="grid grid-cols-2 gap-2">
          <Button
            variant={templateStyle === 'professional' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateStyle('professional')}
            className="h-10 gap-1.5"
          >
            📋 Professional
          </Button>
          <Button
            variant={templateStyle === 'elegant' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateStyle('elegant')}
            className="h-10 gap-1.5"
          >
            🌸 Elegant
          </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-0">
          <div ref={containerRef} className="py-4 px-2" style={{ position: 'relative' }}>
            <div
              ref={templateRef}
              style={{
                width: '794px',
                minHeight: '1123px',
                margin: '0 auto',
                background: '#ffffff',
                fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
                position: 'relative',
                overflow: 'hidden',
                transform: 'scale(var(--template-scale, 1))',
                transformOrigin: 'top center',
              }}
            >
              <RulesPosterContent
                pgName={pgName}
                pgLogoUrl={pgLogoUrl}
                rules={rules}
                language={activeLanguage}
                templateStyle={templateStyle}
              />
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="grid grid-cols-3 gap-2 border-t px-4 py-3">
          <Button
            onClick={handleShareWhatsApp}
            className="h-12 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
            disabled={isSharing || isGenerating}
          >
            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            <span className="text-xs">{isSharing ? 'Sharing...' : 'WhatsApp'}</span>
          </Button>
          <Button
            onClick={handleGenerateImage}
            variant="secondary"
            className="h-12 gap-1.5"
            disabled={isGenerating || isSharing}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            <span className="text-xs">{isGenerating ? 'Saving...' : 'Save Image'}</span>
          </Button>
          <Button onClick={handlePrint} variant="outline" className="h-12 gap-1.5">
            <Printer className="h-4 w-4" />
            <span className="text-xs">Print</span>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
