import { useState } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDayGuests, DayGuest } from '@/hooks/useDayGuests';
import { useRooms } from '@/hooks/useRooms';
import { useMonthContext } from '@/contexts/MonthContext';
import { Calendar, SquarePen, Trash2, Loader2, IndianRupee } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DayGuestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaymentEntry {
  amount: number;
  date: string;
  type: 'full' | 'partial' | 'remaining';
  mode?: 'upi' | 'cash';
}

interface EditingGuest {
  id: string;
  toDate: Date;
  perDayRate: number;
}

export const DayGuestSheet = ({ open, onOpenChange }: DayGuestSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { dayGuests, isLoading, updateDayGuest, deleteDayGuest } = useDayGuests();
  const { rooms } = useRooms();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  // Handle OS back gesture to close sheet with animation
  const { gestureAnimationClass } = useBackGesture(open, () => onOpenChange(false));

  // Edit mode state - tracks which room is in edit mode
  const [editModeRoom, setEditModeRoom] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<EditingGuest | null>(null);
  const [editGuestData, setEditGuestData] = useState<DayGuest | null>(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const [deletingGuestName, setDeletingGuestName] = useState<string>('');

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentGuest, setPaymentGuest] = useState<DayGuest | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');

  // Mark unpaid confirmation dialog state
  const [unpaidDialogOpen, setUnpaidDialogOpen] = useState(false);
  const [unpaidGuest, setUnpaidGuest] = useState<DayGuest | null>(null);

  // Filter guests for selected month
  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 0);

  const filteredGuests = dayGuests.filter(guest => {
    const fromDate = new Date(guest.from_date);
    return fromDate >= startOfMonth && fromDate <= endOfMonth;
  });

  // Group guests by room
  const guestsByRoom = filteredGuests.reduce((acc, guest) => {
    const room = rooms.find(r => r.id === guest.room_id);
    const roomNo = room?.roomNo || 'Unknown';
    if (!acc[roomNo]) {
      acc[roomNo] = [];
    }
    acc[roomNo].push(guest);
    return acc;
  }, {} as Record<string, DayGuest[]>);

  const handleEditStart = (guest: DayGuest) => {
    setEditGuestData(guest);
    setEditingGuest({
      id: guest.id,
      toDate: new Date(guest.to_date),
      perDayRate: guest.per_day_rate,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingGuest || !editGuestData) return;

    const fromDate = new Date(editGuestData.from_date);
    const numberOfDays = Math.max(differenceInDays(editingGuest.toDate, fromDate), 1);
    const totalAmount = numberOfDays * editingGuest.perDayRate;

    await updateDayGuest.mutateAsync({
      id: editGuestData.id,
      to_date: format(editingGuest.toDate, 'yyyy-MM-dd'),
      per_day_rate: editingGuest.perDayRate,
      number_of_days: numberOfDays,
      total_amount: totalAmount,
    });

    setEditDialogOpen(false);
    setEditingGuest(null);
    setEditGuestData(null);
  };

  const handleDeleteStart = (guest: DayGuest) => {
    setDeletingGuestId(guest.id);
    setDeletingGuestName(guest.guest_name);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGuestId) return;
    await deleteDayGuest.mutateAsync(deletingGuestId);
    setDeleteDialogOpen(false);
    setDeletingGuestId(null);
    setDeletingGuestName('');
  };

  const handlePaymentStart = (guest: DayGuest) => {
    const amountPaid = guest.amount_paid || 0;
    const remaining = guest.total_amount - amountPaid;
    setPaymentGuest(guest);
    setPaymentAmount(remaining);
    setPaymentDate(new Date());
    setPaymentMode('upi');
    setPaymentDialogOpen(true);
  };

  const handlePaymentConfirm = async () => {
    if (!paymentGuest || paymentAmount <= 0) return;

    const existingPaid = paymentGuest.amount_paid || 0;
    const totalPaid = existingPaid + paymentAmount;
    const isFullPayment = totalPaid >= paymentGuest.total_amount;
    const status = isFullPayment ? 'Paid' : 'Pending';

    const newEntry: PaymentEntry = {
      amount: paymentAmount,
      date: format(paymentDate, 'yyyy-MM-dd'),
      type: existingPaid === 0 ? (isFullPayment ? 'full' : 'partial') : (isFullPayment ? 'remaining' : 'partial'),
      mode: paymentMode,
    };

    const existingEntries: PaymentEntry[] = (paymentGuest.payment_entries as PaymentEntry[]) || [];
    const updatedEntries = [...existingEntries, newEntry];

    await updateDayGuest.mutateAsync({
      id: paymentGuest.id,
      payment_status: status,
      amount_paid: Math.min(totalPaid, paymentGuest.total_amount),
      payment_entries: updatedEntries,
    });

    toast.success(isFullPayment ? 'Payment marked as Paid' : 'Partial payment recorded', {
      description: `₹${totalPaid.toLocaleString()} paid${!isFullPayment ? ` • ₹${(paymentGuest.total_amount - totalPaid).toLocaleString()} remaining` : ''}`
    });

    setPaymentDialogOpen(false);
    setPaymentGuest(null);
    setPaymentAmount(0);
  };

  const handleStatusChange = async (guest: DayGuest, newStatus: 'Paid' | 'Pending') => {
    if (newStatus === 'Paid' && guest.payment_status === 'Pending') {
      // Open payment dialog
      handlePaymentStart(guest);
    } else if (newStatus === 'Pending') {
      // Open confirmation dialog
      setUnpaidGuest(guest);
      setUnpaidDialogOpen(true);
    }
  };

  const handleUnpaidConfirm = async () => {
    if (!unpaidGuest) return;
    await updateDayGuest.mutateAsync({
      id: unpaidGuest.id,
      payment_status: 'Pending',
      amount_paid: 0,
      payment_entries: [],
    });
    toast.success('Payment status reset to Pending');
    setUnpaidDialogOpen(false);
    setUnpaidGuest(null);
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const totalCollected = filteredGuests.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
  const totalPending = filteredGuests.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className={`h-[90vh] p-0 ${gestureAnimationClass}`}>
          <SheetHeader className="px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
            <SheetTitle className="text-left">Day Guest Details - {monthName}</SheetTitle>
            <div className="grid grid-cols-2 gap-6 mt-2">
              <div className="bg-paid/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="text-base font-bold text-paid">₹{totalCollected.toLocaleString()}</p>
              </div>
              <div className="bg-pending/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-base font-bold text-pending">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(90vh-100px)]">
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : Object.keys(guestsByRoom).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No day guests for {monthName}
                </div>
              ) : (
                Object.entries(guestsByRoom)
                  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
                  .map(([roomNo, guests]) => (
                    <Card key={roomNo}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">Room {roomNo}</h3>
                            <Badge variant="secondary" className="text-xs">{guests.length}</Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setEditModeRoom(editModeRoom === roomNo ? null : roomNo)}
                          >
                            <SquarePen className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          {guests.map(guest => {
                            const amountPaid = guest.amount_paid || 0;
                            const remaining = guest.total_amount - amountPaid;
                            const isPartial = amountPaid > 0 && amountPaid < guest.total_amount;
                            const isPaid = guest.payment_status === 'Paid';
                            const paymentEntries = (guest.payment_entries as PaymentEntry[]) || [];
                            const showActions = editModeRoom === roomNo;

                            return (
                              <div
                                key={guest.id}
                                className={cn(
                                  "border rounded-lg p-3 space-y-2",
                                  isPaid ? 'bg-paid-muted border-paid' : isPartial ? 'bg-partial-muted border-partial' : 'bg-pending-muted border-pending'
                                )}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{guest.guest_name}</span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          isPaid
                                            ? 'bg-paid text-paid-foreground'
                                            : isPartial
                                            ? 'bg-partial text-partial-foreground'
                                            : 'bg-pending text-pending-foreground'
                                        )}
                                      >
                                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'}
                                      </Badge>
                                    </div>
                                    {guest.mobile_number && (
                                      <p className="text-xs text-muted-foreground">{guest.mobile_number}</p>
                                    )}
                                  </div>

                                  {showActions && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => handleEditStart(guest)}
                                      >
                                        Edit
                                      </Button>
                                      {isAdmin && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 px-2 text-xs text-destructive hover:text-destructive border-destructive/50"
                                          onClick={() => handleDeleteStart(guest)}
                                        >
                                          Delete
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Dates and Amount */}
                                <div className="flex items-center justify-between text-sm">
                                  <div>
                                    <span className="text-muted-foreground">
                                      {format(new Date(guest.from_date), 'MMM d')} - {format(new Date(guest.to_date), 'MMM d')}
                                    </span>
                                    <span className="text-muted-foreground ml-1">({guest.number_of_days} days)</span>
                                  </div>
                                  <span className="font-semibold text-primary">₹{guest.total_amount.toLocaleString()}</span>
                                </div>

                                {/* Payment Summary */}
                                {(isPartial || isPaid) && (
                                  <div className="text-sm font-medium">
                                    <span className="text-paid">Paid: ₹{amountPaid.toLocaleString()}</span>
                                    {!isPaid && (
                                      <>
                                        <span className="mx-2">•</span>
                                        <span className="text-pending">Due: ₹{remaining.toLocaleString()}</span>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Payment Entries */}
                                {paymentEntries.length > 0 && (
                                  <div className="space-y-0.5">
                                    {paymentEntries.map((entry, idx) => (
                                      <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                        <span>{entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Paid'}: ₹{entry.amount.toLocaleString()} on {format(new Date(entry.date), 'dd MMM yyyy')}</span>
                                        {entry.mode && (
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                            {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Payment Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-border">
                                  {isPaid ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => handleStatusChange(guest, 'Pending')}
                                    >
                                      Mark Unpaid
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs bg-foreground text-background hover:bg-foreground/90"
                                        onClick={() => handlePaymentStart(guest)}
                                      >
                                        {isPartial ? 'Pay Remaining' : 'Record Payment'}
                                      </Button>
                                    </>
                                  )}
                                </div>

                                {/* Notes */}
                                {guest.notes && (
                                  <p className="text-xs text-muted-foreground italic">{guest.notes}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Day Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Update the stay details for {editGuestData?.guest_name}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editingGuest && editGuestData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">From Date</Label>
                  <p className="text-sm font-medium mt-1">
                    {format(new Date(editGuestData.from_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start mt-1">
                        <Calendar className="h-3 w-3 mr-2" />
                        {format(editingGuest.toDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editingGuest.toDate}
                        onSelect={(date) => date && setEditingGuest(prev => prev ? { ...prev, toDate: date } : null)}
                        disabled={(date) => date < new Date(editGuestData.from_date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label className="text-sm">Per Day Rate</Label>
                <div className="relative mt-1">
                  <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={editingGuest.perDayRate}
                    onChange={(e) => setEditingGuest(prev => prev ? { ...prev, perDayRate: Number(e.target.value) } : null)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Days:</span>
                  <span className="font-medium">{Math.max(differenceInDays(editingGuest.toDate, new Date(editGuestData.from_date)), 1)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>New Total:</span>
                  <span className="font-semibold text-primary">
                    ₹{(Math.max(differenceInDays(editingGuest.toDate, new Date(editGuestData.from_date)), 1) * editingGuest.perDayRate).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditSave} disabled={updateDayGuest.isPending}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Day Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the record for "{deletingGuestName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              disabled={deleteDayGuest.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Dialog */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record Payment</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentGuest && (
                <>
                  Recording payment for {paymentGuest.guest_name}
                  <br />
                  Total: ₹{paymentGuest.total_amount.toLocaleString()} • 
                  Paid: ₹{(paymentGuest.amount_paid || 0).toLocaleString()} • 
                  Due: ₹{(paymentGuest.total_amount - (paymentGuest.amount_paid || 0)).toLocaleString()}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {paymentGuest && (
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm">Payment Amount</Label>
                <div className="relative mt-1">
                  <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="pl-8"
                    max={paymentGuest.total_amount - (paymentGuest.amount_paid || 0)}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Payment Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start mt-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      {format(paymentDate, 'dd MMM yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={paymentDate}
                      onSelect={(date) => date && setPaymentDate(date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-sm">Payment Mode</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={paymentMode === 'upi' ? 'default' : 'outline'}
                    size="sm"
                    className={cn("flex-1", paymentMode === 'upi' && "bg-foreground text-background")}
                    onClick={() => setPaymentMode('upi')}
                  >
                    UPI
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMode === 'cash' ? 'default' : 'outline'}
                    size="sm"
                    className={cn("flex-1", paymentMode === 'cash' && "bg-foreground text-background")}
                    onClick={() => setPaymentMode('cash')}
                  >
                    Cash
                  </Button>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePaymentConfirm} 
              disabled={updateDayGuest.isPending || paymentAmount <= 0}
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Unpaid Confirmation Dialog */}
      <AlertDialog open={unpaidDialogOpen} onOpenChange={setUnpaidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Unpaid?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the payment for {unpaidGuest?.guest_name}? 
              This will clear ₹{unpaidGuest?.amount_paid?.toLocaleString()} paid amount and all payment entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUnpaidGuest(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnpaidConfirm} 
              disabled={updateDayGuest.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Mark Unpaid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
