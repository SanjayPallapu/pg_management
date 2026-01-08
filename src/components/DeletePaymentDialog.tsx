import { useState, useMemo } from 'react';
import { PaymentEntry } from '@/types';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
interface DeletePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
  monthlyRent: number;
  paymentEntries: PaymentEntry[];
  onConfirmDelete: (entriesToDelete: number[], newAmountPaid: number, newEntries: PaymentEntry[]) => void;
}
export const DeletePaymentDialog = ({
  open,
  onOpenChange,
  tenantName,
  monthlyRent,
  paymentEntries,
  onConfirmDelete
}: DeletePaymentDialogProps) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const toggleEntry = (index: number) => {
    setSelectedIndices(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };
  const toggleAll = () => {
    if (selectedIndices.length === paymentEntries.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(paymentEntries.map((_, i) => i));
    }
  };
  const {
    newTotal,
    newEntries,
    remainingBalance
  } = useMemo(() => {
    const remaining = paymentEntries.filter((_, i) => !selectedIndices.includes(i));
    const total = remaining.reduce((sum, entry) => sum + entry.amount, 0);
    return {
      newTotal: total,
      newEntries: remaining,
      remainingBalance: monthlyRent - total
    };
  }, [selectedIndices, paymentEntries, monthlyRent]);
  const handleConfirm = () => {
    onConfirmDelete(selectedIndices, newTotal, newEntries);
    setSelectedIndices([]);
    onOpenChange(false);
  };
  const handleCancel = () => {
    setSelectedIndices([]);
    onOpenChange(false);
  };
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Payment Entries</AlertDialogTitle>
          <AlertDialogDescription>
            Select which payment entries to remove for {tenantName}. Unselected entries will be kept.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {/* Select All option */}
          {paymentEntries.length > 1 && <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted" onClick={toggleAll}>
              <Checkbox checked={selectedIndices.length === paymentEntries.length} onCheckedChange={toggleAll} />
              <span className="font-medium text-sm">Select All ({paymentEntries.length} entries)</span>
            </div>}

          {/* Payment entries list */}
          <div className="space-y-2">
            {paymentEntries.map((entry, index) => <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedIndices.includes(index) ? 'bg-destructive/10 border-destructive/30' : 'bg-card hover:bg-muted/50'}`} onClick={() => toggleEntry(index)}>
                <Checkbox checked={selectedIndices.includes(index)} onCheckedChange={() => toggleEntry(index)} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${selectedIndices.includes(index) ? 'line-through text-muted-foreground' : ''}`}>
                      ₹{entry.amount.toLocaleString()}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.type === 'partial' ? 'bg-partial/20 text-partial' : 'bg-paid/20 text-paid'}`}>
                      {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Full'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(entry.date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>)}
          </div>

          {/* Summary */}
          {selectedIndices.length > 0 && <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                After deletion:
              </p>
              <div className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
                <p>• Amount paid: ₹{newTotal.toLocaleString()}</p>
                <p>• Balance to pay: ₹{remainingBalance > 0 ? remainingBalance.toLocaleString() : '0'}</p>
                <p>• Status: {newTotal >= monthlyRent ? 'Paid' : newTotal > 0 ? 'Partial' : 'Pending'}</p>
              </div>
            </div>}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={selectedIndices.length === 0} className="mb-[12px]">
            Delete {selectedIndices.length > 0 ? `(${selectedIndices.length})` : ''}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>;
};