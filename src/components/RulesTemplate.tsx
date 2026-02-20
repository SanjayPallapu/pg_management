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
import { Download, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RulesTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RulesTemplate = ({ open, onOpenChange }: RulesTemplateProps) => {
  const templateRef = useRef<HTMLDivElement>(null);

  const rules = [
    {
      title: 'Meal Timings',
      icon: '🍽️',
      content: [
        'Breakfast (Tiffin): 7:30 AM – 9:00 AM',
        'Lunch: 12:30 PM – 2:00 PM',
        'Dinner: 7:30 PM – 9:00 PM',
        'Note: If food gets over during the above timings, residents may inform the management. We will be happy to prepare food again, subject to availability.',
      ],
    },
    {
      title: 'Night Gate Timing',
      icon: '🚪',
      content: ['The main gate will be closed at 10:00 PM.'],
    },
    {
      title: 'Corridor Lights',
      icon: '💡',
      content: ['Corridor lights will be switched off at 10:00 PM.'],
    },
    {
      title: 'Room Cleaning',
      icon: '🧹',
      content: ['Rooms will be cleaned once a week.'],
    },
    {
      title: 'Visitors Policy',
      icon: '👥',
      content: [
        'Friends, relatives, or any outsiders are not allowed inside rooms.',
        'Bringing any friend into your room without prior permission will result in a fine of ₹1000.',
      ],
    },
    {
      title: 'Noise & Behavior',
      icon: '🔔',
      content: [
        'Loud noise inside or outside the rooms is not permitted.',
        'Do not disturb others.',
        'Respect other residents\' privacy at all times.',
      ],
    },
    {
      title: 'Rent Policy',
      icon: '💰',
      content: [
        'Full monthly rent must be paid even if you stay outside or go home for any duration.',
      ],
    },
    {
      title: 'Notice Period',
      icon: '📅',
      content: [
        'Residents must inform 15–30 days in advance before vacating the room.',
      ],
    },
    {
      title: 'Security Deposit',
      icon: '🔒',
      content: [
        'The security deposit is refundable at the time of vacating, subject to applicable deductions.',
      ],
    },
    {
      title: 'Luggage Charges',
      icon: '🧳',
      content: ['Extra luggage storage will be charged ₹150 per day.'],
    },
    {
      title: 'Issues & Support',
      icon: '🆘',
      content: [
        'If you face any issues or problems during your stay, please inform the management.',
        'We will review the matter and try to resolve it as early as possible.',
      ],
    },
  ];

  const handlePrint = () => {
    if (!templateRef.current) return;
    
    const printWindow = window.open('', '', 'height=auto,width=auto');
    if (!printWindow) {
      toast({ title: 'Error', description: 'Unable to open print window' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>PG Rules & Regulations</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 8.5in;
            margin: 0 auto;
            padding: 20px;
            background: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          .logo {
            max-width: 100px;
            height: auto;
            margin: 0 auto 15px;
            display: block;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin: 10px 0;
          }
          .subtitle {
            font-size: 14px;
            color: #666;
            margin: 5px 0;
          }
          .rules-container {
            margin-top: 20px;
          }
          .rule {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .rule-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .rule-icon {
            font-size: 20px;
          }
          .rule-content {
            margin-left: 20px;
            font-size: 13px;
            line-height: 1.8;
          }
          .rule-content li {
            margin-bottom: 6px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        ${templateRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleDownload = () => {
    try {
      const element = templateRef.current;
      if (!element) {
        toast({ title: 'Error', description: 'Template not found' });
        return;
      }

      const html = element.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'PG_Rules_Regulations.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Success', description: 'Rules downloaded successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to download rules' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full md:w-3/4 flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle>PG Rules & Regulations Template</SheetTitle>
          <SheetDescription>Printable template for residents</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="pr-4">
            <div
              ref={templateRef}
              className="max-w-2xl mx-auto bg-white p-8 rounded-lg border"
              style={{ minHeight: '600px' }}
            >
              {/* Header with Logo */}
              <div className="text-center mb-8 pb-6 border-b-4 border-blue-600">
                <div className="mb-3">
                  <img
                    src="/src/assets/pg-logo.png"
                    alt="PG Logo"
                    className="h-16 w-auto mx-auto"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <h1 className="text-3xl font-bold text-blue-700 mb-2">
                  PG Rules & Regulations
                </h1>
                <p className="text-gray-600 text-sm">
                  Please read and abide by these rules for a harmonious community living
                </p>
              </div>

              {/* Rules Section */}
              <div className="space-y-6">
                {rules.map((rule, idx) => (
                  <div key={idx} className="break-inside-avoid">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{rule.icon}</span>
                      <h2 className="text-lg font-bold text-blue-700">
                        {rule.title}
                      </h2>
                    </div>
                    <ul className="ml-8 space-y-2">
                      {rule.content.map((item, itemIdx) => (
                        <li
                          key={itemIdx}
                          className="text-sm text-gray-700 leading-relaxed list-disc"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-10 pt-6 border-t-2 border-gray-300 text-center text-xs text-gray-600">
                <p className="font-semibold mb-2">Thank you for your cooperation!</p>
                <p>
                  In case of any queries or concerns, please contact the management
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t pt-4 flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            className="gap-2 flex-1"
          >
            <Download className="h-4 w-4" />
            Download HTML
          </Button>
          <Button onClick={handlePrint} className="gap-2 flex-1">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
