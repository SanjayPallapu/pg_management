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
import { Image as ImageIcon, Loader2, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { toPng } from 'html-to-image';
import { usePG } from '@/contexts/PGContext';

interface Rule {
  id: string;
  title: string;
  description: string;
  details: string[];
}

interface RulesTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules?: Rule[];
}

const RULE_ICONS: Record<string, string> = {
  'Meal Timings': '🍽️',
  'Night Gate Timing': '🚪',
  'Corridor Lights': '💡',
  'Room Cleaning': '🧹',
  'Visitors Policy': '👥',
  'Noise & Behavior': '🔔',
  'Rent Policy': '💰',
  'Notice Period': '📅',
  'Security Deposit': '🔒',
  'Luggage Charges': '🧳',
  'Issues & Support': '🆘',
};

const getIcon = (title: string): string => {
  return RULE_ICONS[title] || '📌';
};

type TemplateStyle = 'professional' | 'elegant';

export const RulesTemplate = ({ open, onOpenChange, rules = [] }: RulesTemplateProps) => {
  const templateRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('professional');
  const { currentPG } = usePG();

  // Scale template to fit container width
  useEffect(() => {
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      const containerWidth = container.clientWidth - 16; // padding
      const scale = Math.min(1, containerWidth / 794);
      container.style.setProperty('--template-scale', String(scale));
      // Set container height to match scaled content
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
      const dataUrl = await toPng(templateRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
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

  // Split rules into two columns for professional template
  const midpoint = Math.ceil(rules.length / 2);
  const leftRules = rules.slice(0, midpoint);
  const rightRules = rules.slice(midpoint);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full md:w-3/4 lg:w-2/3 flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Rules Template Preview</SheetTitle>
          <SheetDescription>Choose a template style and generate image</SheetDescription>
        </SheetHeader>

        {/* Template Selector */}
        <div className="px-6 py-3 border-b flex gap-2">
          <Button
            variant={templateStyle === 'professional' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateStyle('professional')}
            className="gap-1.5"
          >
            📋 Professional
          </Button>
          <Button
            variant={templateStyle === 'elegant' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTemplateStyle('elegant')}
            className="gap-1.5"
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
              {templateStyle === 'professional' ? (
                <ProfessionalTemplate
                  pgName={pgName}
                  pgLogoUrl={pgLogoUrl}
                  rules={rules}
                  leftRules={leftRules}
                  rightRules={rightRules}
                  midpoint={midpoint}
                />
              ) : (
                <ElegantTemplate
                  pgName={pgName}
                  pgLogoUrl={pgLogoUrl}
                  rules={rules}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t px-6 py-4 flex gap-2">
          <Button
            onClick={handleGenerateImage}
            className="gap-2 flex-1"
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Save as Image'}
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2 flex-1">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

/* ─── Professional Template (existing two-column layout) ─── */
interface TemplateInnerProps {
  pgName: string;
  pgLogoUrl: string;
  rules: Rule[];
  leftRules?: Rule[];
  rightRules?: Rule[];
  midpoint?: number;
}

const ProfessionalTemplate = ({ pgName, pgLogoUrl, leftRules = [], rightRules = [], midpoint = 0 }: TemplateInnerProps) => (
  <>
    {/* Top decorative bar */}
    <div style={{ width: '100%', height: '8px', background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%)' }} />

    {/* Header */}
    <div style={{ padding: '28px 40px 20px', display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '2px solid #e5e7eb' }}>
      <img src={pgLogoUrl} alt={pgName} crossOrigin="anonymous" loading="eager"
        style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '12px', border: '2px solid #e5e7eb', background: '#ffffff' }}
        onError={(e) => { (e.target as HTMLImageElement).src = '/icon-512.png'; }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{pgName}</div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Rules & Regulations</div>
      </div>
      <div style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', borderRadius: '8px', color: '#ffffff', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>📋 Official Guidelines</div>
    </div>

    {/* Welcome */}
    <div style={{ margin: '20px 40px 16px', padding: '12px 16px', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
      <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: 600, marginBottom: '4px' }}>Dear Residents,</div>
      <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>Please read and follow these guidelines for a comfortable and harmonious community living experience. Your cooperation is highly appreciated.</div>
    </div>

    {/* Two columns */}
    <div style={{ padding: '0 40px', display: 'flex', gap: '20px' }}>
      <div style={{ flex: 1 }}>
        {leftRules.map((rule, idx) => (
          <div key={rule.id} style={{ marginBottom: '14px', padding: '12px', background: idx % 2 === 0 ? '#f8fafc' : '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{getIcon(rule.title)}</span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af' }}>{idx + 1}. {rule.title}</div>
            </div>
            {rule.details.map((detail, dIdx) => (
              <div key={dIdx} style={{ fontSize: '18px', color: '#334155', lineHeight: 1.8, paddingLeft: '28px', position: 'relative', marginBottom: '6px' }}>
                <span style={{ position: 'absolute', left: '16px', top: '2px', color: '#94a3b8', fontSize: '8px' }}>●</span>
                {detail}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        {rightRules.map((rule, idx) => (
          <div key={rule.id} style={{ marginBottom: '14px', padding: '12px', background: idx % 2 === 0 ? '#f8fafc' : '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px' }}>{getIcon(rule.title)}</span>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af' }}>{midpoint + idx + 1}. {rule.title}</div>
            </div>
            {rule.details.map((detail, dIdx) => (
              <div key={dIdx} style={{ fontSize: '18px', color: '#334155', lineHeight: 1.8, paddingLeft: '28px', position: 'relative', marginBottom: '6px' }}>
                <span style={{ position: 'absolute', left: '16px', top: '3px', color: '#94a3b8', fontSize: '9px' }}>●</span>
                {detail}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>

    {/* Footer */}
    <div style={{ margin: '20px 40px 0', padding: '16px 20px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>🙏 Thank You for Your Cooperation!</div>
      <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.6 }}>For any queries or concerns, please contact the management. We are here to help!</div>
    </div>

    <div style={{ marginTop: '20px', width: '100%', height: '8px', background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%)' }} />
  </>
);

/* ─── Elegant Floral Template (single-column, soft pink/purple) ─── */
const ElegantTemplate = ({ pgName, pgLogoUrl, rules }: TemplateInnerProps) => (
  <div style={{
    width: '100%',
    minHeight: '1123px',
    background: 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 30%, #f5f3ff 60%, #fdf2f8 100%)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    {/* Decorative corner flowers - top left */}
    <div style={{ position: 'absolute', top: 0, left: 0, width: '180px', height: '180px', opacity: 0.25 }}>
      <div style={{ fontSize: '80px', position: 'absolute', top: '-10px', left: '-10px', transform: 'rotate(-30deg)' }}>🌸</div>
      <div style={{ fontSize: '40px', position: 'absolute', top: '50px', left: '60px', transform: 'rotate(15deg)' }}>🌺</div>
      <div style={{ fontSize: '30px', position: 'absolute', top: '10px', left: '100px', transform: 'rotate(-10deg)' }}>🌷</div>
    </div>
    {/* Top right */}
    <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', opacity: 0.25 }}>
      <div style={{ fontSize: '80px', position: 'absolute', top: '-10px', right: '-10px', transform: 'rotate(30deg)' }}>🌸</div>
      <div style={{ fontSize: '40px', position: 'absolute', top: '50px', right: '60px', transform: 'rotate(-15deg)' }}>🌺</div>
      <div style={{ fontSize: '30px', position: 'absolute', top: '10px', right: '100px', transform: 'rotate(10deg)' }}>🌷</div>
    </div>
    {/* Bottom left */}
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '180px', height: '180px', opacity: 0.25 }}>
      <div style={{ fontSize: '80px', position: 'absolute', bottom: '-10px', left: '-10px', transform: 'rotate(30deg)' }}>🌸</div>
      <div style={{ fontSize: '40px', position: 'absolute', bottom: '50px', left: '60px', transform: 'rotate(-15deg)' }}>🌺</div>
    </div>
    {/* Bottom right */}
    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '180px', height: '180px', opacity: 0.25 }}>
      <div style={{ fontSize: '80px', position: 'absolute', bottom: '-10px', right: '-10px', transform: 'rotate(-30deg)' }}>🌸</div>
      <div style={{ fontSize: '40px', position: 'absolute', bottom: '50px', right: '60px', transform: 'rotate(15deg)' }}>🌺</div>
    </div>

    {/* Decorative top border */}
    <div style={{ width: '100%', height: '6px', background: 'linear-gradient(90deg, #ec4899, #a855f7, #ec4899)' }} />

    {/* Inner decorative border */}
    <div style={{
      margin: '12px',
      border: '2px solid #f9a8d4',
      borderRadius: '16px',
      minHeight: 'calc(100% - 30px)',
      position: 'relative',
      padding: '0 0 20px',
    }}>
      {/* Corner dots */}
      {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => {
        const isTop = pos.includes('top');
        const isLeft = pos.includes('left');
        return (
          <div key={pos} style={{
            position: 'absolute',
            [isTop ? 'top' : 'bottom']: '-5px',
            [isLeft ? 'left' : 'right']: '-5px',
            width: '10px', height: '10px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ec4899, #a855f7)',
          }} />
        );
      })}

      {/* Header with Logo left, Text right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 36px 16px' }}>
        <div style={{
          width: '100px', height: '100px', flexShrink: 0,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fce7f3, #f5f3ff)',
          border: '3px solid #f9a8d4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(236, 72, 153, 0.2)',
        }}>
          <img
            src={pgLogoUrl} alt={pgName} crossOrigin="anonymous" loading="eager"
            style={{ width: '80px', height: '80px', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/icon-512.png'; }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize: '32px', fontWeight: 700, color: '#7c3aed',
            lineHeight: 1.2, marginBottom: '4px',
            textShadow: '0 1px 2px rgba(124, 58, 237, 0.15)',
          }}>
            {pgName}
          </div>
          {/* Decorative divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
            <div style={{ width: '80px', height: '2px', background: 'linear-gradient(90deg, transparent, #ec4899)' }} />
            <span style={{ fontSize: '16px' }}>✿</span>
            <div style={{ width: '80px', height: '2px', background: 'linear-gradient(90deg, #ec4899, transparent)' }} />
          </div>
          <div style={{
            display: 'inline-block',
            padding: '8px 32px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            borderRadius: '24px',
            color: '#ffffff',
            fontSize: '16px', fontWeight: 700,
            letterSpacing: '3px', textTransform: 'uppercase',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
          }}>
            Rules & Regulations
          </div>
        </div>
      </div>

      {/* Rules - single column, filter out Luggage Charges */}
      <div style={{ padding: '12px 36px 0' }}>
        {rules.filter(r => r.title !== 'Luggage Charges').map((rule, idx) => (
          <div key={rule.id} style={{ marginBottom: '16px' }}>
            {/* Rule title */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '8px',
            }}>
              <span style={{
                fontSize: '22px',
                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
              }}>{getIcon(rule.title)}</span>
              <div style={{
                fontSize: '17px', fontWeight: 700,
                color: '#7c3aed',
                textDecoration: 'underline',
                textDecorationColor: '#ddd6fe',
                textUnderlineOffset: '4px',
              }}>
                {idx + 1}. {rule.title}
              </div>
            </div>

            {/* Rule details */}
            {rule.details.map((detail, dIdx) => (
              <div key={dIdx} style={{
                fontSize: '18px', color: '#374151',
                lineHeight: 1.8, paddingLeft: '40px',
                position: 'relative', marginBottom: '4px',
              }}>
                <span style={{
                  position: 'absolute', left: '24px', top: '8px',
                  color: '#a855f7', fontSize: '8px',
                }}>●</span>
                {detail}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        margin: '16px 36px 0',
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
        borderRadius: '12px',
        border: '1px solid #fbcfe8',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '16px' }}>✿</span>
          <span style={{ fontSize: '16px' }}>✿</span>
          <span style={{ fontSize: '16px' }}>✿</span>
        </div>
        <div style={{
          fontFamily: "'Georgia', serif",
          fontSize: '16px', fontWeight: 600, color: '#7c3aed',
          marginBottom: '6px',
        }}>
          🙏 Thank You for Your Cooperation!
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
          For any queries or concerns, please contact the management. We are here to help!
        </div>
      </div>
    </div>

    {/* Bottom border */}
    <div style={{ width: '100%', height: '6px', background: 'linear-gradient(90deg, #ec4899, #a855f7, #ec4899)', position: 'absolute', bottom: 0 }} />
  </div>
);
