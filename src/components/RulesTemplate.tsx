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
import { ArrowLeft, Image as ImageIcon, Loader2, Printer } from 'lucide-react';
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
  const [templateStyle, setTemplateStyle] = useState<RulesTemplateStyle>('professional');
  const { currentPG } = usePG();

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
  }, [open, templateStyle, rules]);

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
          <SheetDescription>Choose a template style and generate image</SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2 border-b px-6 py-3">
          <Button
            variant={templateStyle === 'professional' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateStyle('professional')}
            className="h-11 gap-1.5"
          >
            📋 Professional
          </Button>
          <Button
            variant={templateStyle === 'elegant' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateStyle('elegant')}
            className="h-11 gap-1.5"
          >
            🌸 Elegant
          </Button>
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
                language={language}
                templateStyle={templateStyle}
              />
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="grid grid-cols-2 gap-3 border-t px-6 py-4">
          <Button
            onClick={handleGenerateImage}
            className="h-12 gap-2"
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Save as Image'}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="h-12 gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
