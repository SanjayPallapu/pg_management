import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Building, Phone, MessageCircle, Receipt, ChevronDown, Settings, History, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useMonthContext } from '@/contexts/MonthContext';
import { BuildingRentReceiptDialog } from './BuildingRentReceiptDialog';
import { BuildingRentSettingsDialog } from './BuildingRentSettingsDialog';
import { BuildingRentHistorySheet } from './BuildingRentHistorySheet';
import { useBuildingRentSettings } from '@/hooks/useBuildingRentSettings';
import { useBuildingRentHistory } from '@/hooks/useBuildingRentHistory';
import { formatIndianCurrency } from '@/utils/numberToWords';

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const BuildingRentCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { settings, updateSettings, resetSettings } = useBuildingRentSettings();
  const { payments, addPayment, deletePayment } = useBuildingRentHistory();
  
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const forMonth = `${months[selectedMonth - 1]} ${selectedYear}`;

  // Check if payment exists for current month
  const currentMonthPayment = payments.find((p) => p.forMonth === forMonth);

  const handleCall = () => {
    window.location.href = `tel:${settings.whatsappNumber}`;
  };

  const handleChat = () => {
    window.open(`https://wa.me/91${settings.whatsappNumber}`, '_blank');
  };

  const copyPhoneNumber = async () => {
    try {
      await navigator.clipboard.writeText(settings.whatsappNumber);
      setCopied(true);
      toast.success('Phone number copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building className="h-4 w-4" />
              Building Rent
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistorySheetOpen(true)}>
                <History className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsDialogOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Amount Display */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Rent</span>
            <span className="text-xl font-bold">₹{formatIndianCurrency(settings.amount)}</span>
          </div>

          {/* Payment status for current month */}
          {currentMonthPayment && (
            <Badge variant="secondary" className="bg-paid-muted text-paid w-full justify-center py-1">
              Paid for {forMonth}
            </Badge>
          )}

          {/* To/From Info */}
          <div className="text-xs text-muted-foreground bg-muted rounded-lg p-2">
            <div className="flex justify-between">
              <span>From: {settings.receivedFrom.split(' ')[0]}</span>
              <span>To: {settings.paidTo}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Call Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4 mr-1" />
              Call
            </Button>

            {/* Copy Number Button */}
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={copyPhoneNumber}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Actions
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <DropdownMenuItem onClick={() => setReceiptDialogOpen(true)}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Generate Receipt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleChat}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat on WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setHistorySheetOpen(true)}>
                  <History className="h-4 w-4 mr-2" />
                  Payment History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <BuildingRentReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        forMonth={forMonth}
        settings={settings}
        onPaymentSaved={addPayment}
      />

      <BuildingRentSettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        settings={settings}
        onSave={updateSettings}
        onReset={resetSettings}
      />

      <BuildingRentHistorySheet
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        payments={payments}
        onDelete={deletePayment}
      />
    </>
  );
};
