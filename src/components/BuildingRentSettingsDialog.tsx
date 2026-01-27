import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { BuildingRentSettings } from '@/hooks/useBuildingRentSettings';
import { formatIndianCurrency } from '@/utils/numberToWords';

interface BuildingRentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: BuildingRentSettings;
  onSave: (settings: Partial<BuildingRentSettings>) => void;
  onReset: () => void;
}

export const BuildingRentSettingsDialog = ({
  open,
  onOpenChange,
  settings,
  onSave,
  onReset,
}: BuildingRentSettingsDialogProps) => {
  const [amount, setAmount] = useState(settings.amount);
  const [receivedFrom, setReceivedFrom] = useState(settings.receivedFrom);
  const [paidTo, setPaidTo] = useState(settings.paidTo);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);

  useEffect(() => {
    setAmount(settings.amount);
    setReceivedFrom(settings.receivedFrom);
    setPaidTo(settings.paidTo);
    setWhatsappNumber(settings.whatsappNumber);
  }, [settings]);

  const handleSave = () => {
    onSave({
      amount,
      receivedFrom: receivedFrom.trim(),
      paidTo: paidTo.trim(),
      whatsappNumber: whatsappNumber.trim(),
    });
    toast.success('Settings saved');
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    toast.success('Settings reset to defaults');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Building Rent Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Monthly Rent Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
              <Input
                id="amount"
                type="number"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="pl-7"
                placeholder="150000"
              />
            </div>
            {amount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ₹{formatIndianCurrency(amount)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="receivedFrom">Received From (Payer)</Label>
            <Input
              id="receivedFrom"
              value={receivedFrom}
              onChange={(e) => setReceivedFrom(e.target.value)}
              placeholder="Pallapu Sanjay Kumar"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="paidTo">Paid To (Owner)</Label>
            <Input
              id="paidTo"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="Vishvanathan"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input
              id="whatsapp"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="9989568666"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
