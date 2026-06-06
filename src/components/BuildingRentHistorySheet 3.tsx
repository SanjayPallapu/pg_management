import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Banknote, CreditCard } from 'lucide-react';
import { BuildingRentPayment } from '@/hooks/useBuildingRentHistory';
import { formatIndianCurrency } from '@/utils/numberToWords';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BuildingRentHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: BuildingRentPayment[];
  onDelete: (id: string) => void;
}

export const BuildingRentHistorySheet = ({
  open,
  onOpenChange,
  payments,
  onDelete,
}: BuildingRentHistorySheetProps) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Group payments by year
  const groupedByYear = payments.reduce(
    (acc, payment) => {
      const year = new Date(payment.date).getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(payment);
      return acc;
    },
    {} as Record<string, BuildingRentPayment[]>
  );

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-center gap-2">
            <Calendar className="h-5 w-5" />
            Building Rent History
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No payment history yet</p>
              <p className="text-sm">Payments will appear here after you generate receipts</p>
            </div>
          ) : (
            years.map((year) => (
              <div key={year}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {year}
                </h3>
                <div className="space-y-3">
                  {groupedByYear[year].map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-card border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{payment.forMonth}</p>
                          <p className="text-sm text-muted-foreground">
                            Paid on {formatDate(payment.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            ₹{formatIndianCurrency(payment.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {payment.upiAmount > 0 && (
                          <Badge variant="secondary" className="bg-upi-muted text-upi">
                            <CreditCard className="h-3 w-3 mr-1" />
                            UPI: ₹{formatIndianCurrency(payment.upiAmount)}
                          </Badge>
                        )}
                        {payment.cashAmount > 0 && (
                          <Badge variant="secondary" className="bg-cash-muted text-cash">
                            <Banknote className="h-3 w-3 mr-1" />
                            Cash: ₹{formatIndianCurrency(payment.cashAmount)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          <span>{payment.receivedFrom}</span>
                          <span className="mx-2">→</span>
                          <span>{payment.paidTo}</span>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payment Record?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the payment record for {payment.forMonth} from history.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(payment.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
