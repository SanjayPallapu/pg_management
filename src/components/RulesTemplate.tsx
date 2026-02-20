import { useState, useRef } from 'react';
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

export const RulesTemplate = ({ open, onOpenChange, rules = [] }: RulesTemplateProps) => {
  const templateRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentPG } = usePG();

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
      link.download = `${pgName.replace(/\s+/g, '_')}_Rules.png`;
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

  // Split rules into two columns
  const midpoint = Math.ceil(rules.length / 2);
  const leftRules = rules.slice(0, midpoint);
  const rightRules = rules.slice(midpoint);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full md:w-3/4 lg:w-2/3 flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>Rules Template Preview</SheetTitle>
          <SheetDescription>A4 printable template with your PG branding</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="py-4">
            {/* Off-screen render target for image generation */}
            <div
              ref={templateRef}
              style={{
                width: '794px', // A4 width at 96dpi
                minHeight: '1123px', // A4 height
                margin: '0 auto',
                background: '#ffffff',
                fontFamily: "'Segoe UI', 'Roboto', Arial, sans-serif",
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top decorative bar */}
              <div style={{
                width: '100%',
                height: '8px',
                background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%)',
              }} />

              {/* Header Section */}
              <div style={{
                padding: '28px 40px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                borderBottom: '2px solid #e5e7eb',
              }}>
                <img
                  src={pgLogoUrl}
                  alt={pgName}
                  crossOrigin="anonymous"
                  loading="eager"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    background: '#ffffff',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon-512.png';
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    color: '#1e293b',
                    letterSpacing: '-0.5px',
                    lineHeight: 1.2,
                  }}>
                    {pgName}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    fontWeight: 600,
                  }}>
                    Rules & Regulations
                  </div>
                </div>
                <div style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  📋 Official Guidelines
                </div>
              </div>

              {/* Welcome message */}
              <div style={{
                margin: '20px 40px 16px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                borderRadius: '8px',
                borderLeft: '4px solid #2563eb',
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#1e40af',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}>
                  Dear Residents,
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#475569',
                  lineHeight: 1.6,
                }}>
                  Please read and follow these guidelines for a comfortable and harmonious community living experience. Your cooperation is highly appreciated.
                </div>
              </div>

              {/* Rules in two columns */}
              <div style={{
                padding: '0 40px',
                display: 'flex',
                gap: '20px',
              }}>
                {/* Left Column */}
                <div style={{ flex: 1 }}>
                  {leftRules.map((rule, idx) => (
                    <div key={rule.id} style={{
                      marginBottom: '14px',
                      padding: '12px',
                      background: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}>
                        <span style={{ fontSize: '18px' }}>{getIcon(rule.title)}</span>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#1e40af',
                        }}>
                          {idx + 1}. {rule.title}
                        </div>
                      </div>
                      {rule.details.map((detail, dIdx) => (
                        <div key={dIdx} style={{
                          fontSize: '15px',
                          color: '#334155',
                          lineHeight: 1.8,
                          paddingLeft: '28px',
                          position: 'relative',
                          marginBottom: '6px',
                        }}>
                          <span style={{
                            position: 'absolute',
                            left: '16px',
                            top: '2px',
                            color: '#94a3b8',
                            fontSize: '8px',
                          }}>●</span>
                          {detail}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Right Column */}
                <div style={{ flex: 1 }}>
                  {rightRules.map((rule, idx) => (
                    <div key={rule.id} style={{
                      marginBottom: '14px',
                      padding: '12px',
                      background: idx % 2 === 0 ? '#f8fafc' : '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}>
                        <span style={{ fontSize: '18px' }}>{getIcon(rule.title)}</span>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#1e40af',
                        }}>
                          {midpoint + idx + 1}. {rule.title}
                        </div>
                      </div>
                      {rule.details.map((detail, dIdx) => (
                        <div key={dIdx} style={{
                          fontSize: '15px',
                          color: '#334155',
                          lineHeight: 1.8,
                          paddingLeft: '28px',
                          position: 'relative',
                          marginBottom: '6px',
                        }}>
                          <span style={{
                            position: 'absolute',
                            left: '16px',
                            top: '3px',
                            color: '#94a3b8',
                            fontSize: '9px',
                          }}>●</span>
                          {detail}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div style={{
                margin: '20px 40px 0',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#166534',
                  marginBottom: '4px',
                }}>
                  🙏 Thank You for Your Cooperation!
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#4b5563',
                  lineHeight: 1.6,
                }}>
                  For any queries or concerns, please contact the management. We are here to help!
                </div>
              </div>

              {/* Bottom decorative bar */}
              <div style={{
                marginTop: '20px',
                width: '100%',
                height: '8px',
                background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%)',
              }} />
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