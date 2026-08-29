import { useState, useMemo, useEffect, useRef } from 'react';
import { PaymentEntry } from '@/types';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useBackGesture } from '@/hooks/useBackGesture';
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

  // Cache latest values to prevent content disappearing during exit animations
  const cachedData = useRef({
    tenantName,
    monthlyRent,
    paymentEntries
  });

  if (open && (tenantName || (paymentEntries && paymentEntries.length > 0))) {
    cachedData.current = {
      tenantName: tenantName || cachedData.current.tenantName,
      monthlyRent: monthlyRent || cachedData.current.monthlyRent,
      paymentEntries: (paymentEntries && paymentEntries.length > 0) ? paymentEntries : cachedData.current.paymentEntries,
    };
  }

  const activeName = tenantName || cachedData.current.tenantName;
  const activeRent = monthlyRent || cachedData.current.monthlyRent;
  const activeEntries = (paymentEntries && paymentEntries.length > 0) ? paymentEntries : cachedData.current.paymentEntries;

  useBackGesture(open, () => {
    onOpenChange(false);
  });

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setSelectedIndices([]);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const toggleEntry = (index: number) => {
    setSelectedIndices(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const toggleAll = () => {
    if (selectedIndices.length === activeEntries.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(activeEntries.map((_, i) => i));
    }
  };

  const {
    newTotal,
    newEntries,
    remainingBalance
  } = useMemo(() => {
    const remaining = activeEntries.filter((_, i) => !selectedIndices.includes(i));
    const total = remaining.reduce((sum, entry) => sum + entry.amount, 0);
    return {
      newTotal: total,
      newEntries: remaining,
      remainingBalance: activeRent - total
    };
  }, [selectedIndices, activeEntries, activeRent]);

  const handleConfirm = () => {
    onConfirmDelete(selectedIndices, newTotal, newEntries);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md w-[92vw] sm:w-full max-h-[85vh] overflow-y-auto rounded-2xl p-5 shadow-2xl z-[100]">
        <button
          type="button"
          onClick={handleCancel}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <AlertDialogHeader className="pr-6">
          <AlertDialogTitle>Remove Payment Entries</AlertDialogTitle>
          <AlertDialogDescription>
            Select which payment entries to remove for {activeName}. Unselected entries will be kept.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2 space-y-3">
          {/* Select All option */}
          {activeEntries.length > 1 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={toggleAll}>
              <Checkbox checked={selectedIndices.length === activeEntries.length} onCheckedChange={toggleAll} />
              <span className="font-semibold text-sm">Select All ({activeEntries.length} entries)</span>
            </div>
          )}

          {/* Payment entries list */}
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {activeEntries.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedIndices.includes(index) ? 'bg-destructive/10 border-destructive/30' : 'bg-card hover:bg-muted/50'}`}
                onClick={() => toggleEntry(index)}
              >
                <Checkbox checked={selectedIndices.includes(index)} onCheckedChange={() => toggleEntry(index)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold ${selectedIndices.includes(index) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      ₹{entry.amount.toLocaleString()}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${entry.mode === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${entry.type === 'partial' ? 'bg-partial/20 text-partial' : 'bg-paid/20 text-paid'}`}>
                      {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Full'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(entry.date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {selectedIndices.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                After deletion:
              </p>
              <div className="mt-1.5 space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
                <p>• Amount paid: ₹{newTotal.toLocaleString()}</p>
                <p>• Balance to pay: ₹{remainingBalance > 0 ? remainingBalance.toLocaleString() : '0'}</p>
                <p>• Status: {newTotal >= monthlyRent ? 'Paid' : newTotal > 0 ? 'Partial' : 'Pending'}</p>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-2 border-t mt-2">
          <Button variant="outline" onClick={handleCancel} className="rounded-xl">Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={selectedIndices.length === 0} className="rounded-xl">
            Delete {selectedIndices.length > 0 ? `(${selectedIndices.length})` : ''}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};