import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Phone, CreditCard, FileText, IndianRupee, MessageCircle, Pencil, SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDayGuests, DayGuest } from '@/hooks/useDayGuests';
import { useRooms } from '@/hooks/useRooms';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { DayGuestReminderDialog, type DayGuestReminderInput } from '@/components/DayGuestReminderDialog';
import { AppLayout } from '@/components/layout/AppLayout';

const DEFAULT_PER_DAY_RATE = 350;

const DayGuestPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const roomNo = searchParams.get('roomNo') || '';
  const navigate = useNavigate();
  const { role } = useAuth();
  const { rooms } = useRooms();
  const canManageDayGuests = role === 'admin' || role === 'owner';

  const { dayGuests, isLoading, addDayGuest, updateDayGuest, deleteDayGuest } = useDayGuests(roomId);

  const [isHistoryEditMode, setIsHistoryEditMode] = useState(false);

  // Form state
  const [guestName, setGuestName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [idProof, setIdProof] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(new Date());
  const [toDate, setToDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [perDayRate, setPerDayRate] = useState(DEFAULT_PER_DAY_RATE);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Pending');
  const [notes, setNotes] = useState('');

  // Calculated values
  // Day count: inclusive of both start and end dates (e.g., Mar 23 to Apr 11 = 20 days)
  const numberOfDays = fromDate && toDate ? Math.max(differenceInDays(toDate, fromDate) + 1, 1) : 1;
  const totalAmount = numberOfDays * perDayRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      return;
    }

    if (!fromDate || !toDate) {
      return;
    }

    if (!roomId) return;

    await addDayGuest.mutateAsync({
      room_id: roomId,
      guest_name: guestName.trim(),
      mobile_number: mobileNumber.trim() || undefined,
      id_proof: idProof.trim() || undefined,
      from_date: format(fromDate, 'yyyy-MM-dd'),
      to_date: format(toDate, 'yyyy-MM-dd'),
      number_of_days: numberOfDays,
      per_day_rate: perDayRate,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setGuestName('');
    setMobileNumber('');
    setIdProof('');
    setFromDate(new Date());
    setToDate(addDays(new Date(), 1));
    setPerDayRate(DEFAULT_PER_DAY_RATE);
    setPaymentStatus('Pending');
    setNotes('');
  };

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editGuest, setEditGuest] = useState<{
    id: string; guestName: string; mobileNumber: string; idProof: string;
    fromDate: Date; toDate: Date; perDayRate: number; notes: string;
  } | null>(null);

  // Reminder dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderData, setReminderData] = useState<DayGuestReminderInput | null>(null);

  const openReminder = (guest: DayGuest) => {
    const amountPaid = guest.amount_paid || 0;
    const room = (rooms || []).find(r => r.id === roomId || r.roomNo === roomNo);
    setReminderData({
      guestName: guest.guest_name,
      guestPhone: guest.mobile_number || '',
      fromDate: guest.from_date,
      toDate: guest.to_date,
      numberOfDays: guest.number_of_days,
      perDayRate: guest.per_day_rate,
      totalAmount: guest.total_amount,
      amountPaid,
      balance: guest.total_amount - amountPaid,
      roomNo,
      isAc: Boolean(room?.isAc),
    });
    setReminderDialogOpen(true);
  };

  const handleEditStart = (guest: DayGuest) => {
    setEditGuest({
      id: guest.id,
      guestName: guest.guest_name,
      mobileNumber: guest.mobile_number || '',
      idProof: guest.id_proof || '',
      fromDate: new Date(guest.from_date),
      toDate: new Date(guest.to_date),
      perDayRate: guest.per_day_rate,
      notes: guest.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editGuest || !editGuest.guestName.trim()) return;
    const days = Math.max(differenceInDays(editGuest.toDate, editGuest.fromDate) + 1, 1);
    const total = days * editGuest.perDayRate;
    await updateDayGuest.mutateAsync({
      id: editGuest.id,
      guest_name: editGuest.guestName.trim(),
      mobile_number: editGuest.mobileNumber.trim() || null,
      id_proof: editGuest.idProof.trim() || null,
      from_date: format(editGuest.fromDate, 'yyyy-MM-dd'),
      to_date: format(editGuest.toDate, 'yyyy-MM-dd'),
      number_of_days: days,
      per_day_rate: editGuest.perDayRate,
      total_amount: total,
      notes: editGuest.notes.trim() || null,
    });
    setEditDialogOpen(false);
    setEditGuest(null);
  };

  const handleStatusChange = async (guest: DayGuest, newStatus: 'Paid' | 'Pending') => {
    await updateDayGuest.mutateAsync({
      id: guest.id,
      payment_status: newStatus,
      amount_paid: newStatus === 'Paid' ? guest.total_amount : 0,
      payment_entries: newStatus === 'Paid' ? [{
        amount: guest.total_amount,
        date: new Date().toISOString(),
        type: 'full',
        mode: 'upi',
      }] : [],
    });
    toast.success(newStatus === 'Paid' ? `Marked ${guest.guest_name} as Paid` : `Payment reset to Pending for ${guest.guest_name}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this day guest?')) {
      await deleteDayGuest.mutateAsync(id);
    }
  };

  return (
    <AppLayout title={`Day Guest — Room ${roomNo}`}>
      <div className="px-4 sm:px-6 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Uploaded Illustration Header Banner - Clean, no border, no background */}
        <div className="w-full flex items-center justify-center pt-1 pb-1">
          <img
            src="/add-tenant-illustration.png"
            alt="Add Day Guest Illustration"
            className="w-full max-w-[340px] sm:max-w-[380px] h-auto object-contain"
          />
        </div>

        {/* Add Day Guest Form */}
        <Card className="p-0 border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold">Add Day Guest</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Guest Name */}
              <div className="space-y-2">
                <Label htmlFor="guestName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Guest Name *
                </Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter guest name"
                  required
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="mobile" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile Number
                </Label>
                <Input
                  id="mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Enter mobile number"
                  type="tel"
                />
              </div>

              {/* ID Proof */}
              <div className="space-y-2">
                <Label htmlFor="idProof" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  ID Proof
                </Label>
                <Input
                  id="idProof"
                  value={idProof}
                  onChange={(e) => setIdProof(e.target.value)}
                  placeholder="e.g., Aadhar, Passport, DL"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    From Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !fromDate && 'text-muted-foreground'
                        )}
                      >
                        {fromDate ? format(fromDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    To Date *
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !toDate && 'text-muted-foreground'
                        )}
                      >
                        {toDate ? format(toDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        disabled={(date) => fromDate ? date < fromDate : false}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Auto-calculated Duration & Amount */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Number of Days</span>
                  <span className="font-semibold">{numberOfDays} day{numberOfDays > 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="perDayRate" className="flex items-center gap-2 text-sm">
                    <IndianRupee className="h-4 w-4" />
                    Per Day Rate
                  </Label>
                  <Input
                    id="perDayRate"
                    type="number"
                    value={perDayRate}
                    onChange={(e) => setPerDayRate(Number(e.target.value) || DEFAULT_PER_DAY_RATE)}
                    className="bg-background"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-lg font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Status
                </Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'Paid' | 'Pending')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={addDayGuest.isPending || !guestName.trim()}
              >
                {addDayGuest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Day Guest'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Day Guest History */}
        <Card className="p-0 border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
          <CardHeader className="p-0 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Guest History ({dayGuests.length})</CardTitle>
              {dayGuests.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2.5 text-xs font-bold gap-1 rounded-xl cursor-pointer transition-all",
                    isHistoryEditMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setIsHistoryEditMode(prev => !prev)}
                >
                  <SquarePen className="h-3.5 w-3.5" />
                  <span>{isHistoryEditMode ? "Done" : "Edit"}</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : dayGuests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No day guests recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {dayGuests.map((guest) => {
                  const isPaid = guest.payment_status === 'Paid';
                  const amountPaid = guest.amount_paid || 0;
                  const remaining = guest.total_amount - amountPaid;
                  const isPartial = amountPaid > 0 && amountPaid < guest.total_amount;

                  return (
                    <div
                      key={guest.id}
                      className={cn(
                        "p-3.5 rounded-2xl border space-y-2.5 transition-all",
                        isPaid
                          ? "bg-paid-muted/30 border-paid/40"
                          : isPartial
                          ? "bg-partial-muted/30 border-partial/40"
                          : "bg-pending-muted/30 border-pending/40"
                      )}
                    >
                      {/* Top Row: Name on Left, Amount on Top Right */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-foreground text-sm block truncate">{guest.guest_name}</span>
                          {guest.mobile_number && (
                            <p className="text-xs text-muted-foreground mt-0.5">{guest.mobile_number}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-foreground block">
                            ₹{guest.total_amount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Dates and Days */}
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>
                          {format(new Date(guest.from_date), 'MMM d')} – {format(new Date(guest.to_date), 'MMM d, yyyy')}
                        </span>
                        <span className="font-semibold text-foreground/80">({guest.number_of_days} days)</span>
                      </div>

                      {/* Bottom Row: Actions on Left, Paid/Pending Clickable Badge on Bottom Right */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1.5">
                          {isHistoryEditMode ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1 rounded-lg"
                                onClick={() => handleEditStart(guest)}
                              >
                                <Pencil className="h-3 w-3" />
                                <span>Edit</span>
                              </Button>
                              {canManageDayGuests && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive border-destructive/40 rounded-lg"
                                  onClick={() => handleDelete(guest.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            guest.mobile_number && !guest.mobile_number.includes('•') ? (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={`tel:${guest.mobile_number}`}
                                  className="grid h-7 w-7 place-items-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                                  title={`Call ${guest.guest_name}`}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                                <a
                                  href={`https://wa.me/${guest.mobile_number.replace(/\D/g, "").startsWith("91") ? guest.mobile_number.replace(/\D/g, "") : `91${guest.mobile_number.replace(/\D/g, "")}`}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </a>
                                {!isPaid && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[11px] font-bold gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 rounded-lg"
                                    onClick={() => openReminder(guest)}
                                  >
                                    <MessageCircle className="h-3 w-3" />
                                    Remind
                                  </Button>
                                )}
                              </div>
                            ) : null
                          )}
                        </div>

                        {/* Bottom Right Clickable Payment Status Badge */}
                        <div>
                          {isPaid ? (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(guest, 'Pending')}
                              className="badge-paid-periwinkle px-3.5 py-1 text-xs font-bold rounded-xl cursor-pointer hover:opacity-85 active:scale-95 transition-all shadow-xs"
                              title="Click to undo payment"
                            >
                              Paid
                            </button>
                          ) : isPartial ? (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(guest, 'Paid')}
                              className="px-3.5 py-1 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-xs cursor-pointer"
                              title="Click to mark fully Paid"
                            >
                              Partial (Due ₹{remaining.toLocaleString()})
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(guest, 'Paid')}
                              className="px-3.5 py-1 text-xs font-bold rounded-xl bg-foreground text-background hover:bg-foreground/90 active:scale-95 transition-all shadow-xs cursor-pointer"
                              title="Click to mark Paid"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Day Guest Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Day Guest</AlertDialogTitle>
            <AlertDialogDescription>Update guest details</AlertDialogDescription>
          </AlertDialogHeader>
          {editGuest && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-sm">Guest Name *</Label>
                <Input value={editGuest.guestName} onChange={(e) => setEditGuest({ ...editGuest, guestName: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Mobile</Label>
                  <Input value={editGuest.mobileNumber} onChange={(e) => setEditGuest({ ...editGuest, mobileNumber: e.target.value })} type="tel" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">ID Proof</Label>
                  <Input value={editGuest.idProof} onChange={(e) => setEditGuest({ ...editGuest, idProof: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start mt-1">
                        <Calendar className="h-3 w-3 mr-2" />
                        {format(editGuest.fromDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={editGuest.fromDate} onSelect={(d) => d && setEditGuest({ ...editGuest, fromDate: d })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start mt-1">
                        <Calendar className="h-3 w-3 mr-2" />
                        {format(editGuest.toDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={editGuest.toDate} onSelect={(d) => d && setEditGuest({ ...editGuest, toDate: d })} disabled={(d) => d < editGuest.fromDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label className="text-sm">Per Day Rate</Label>
                <div className="relative mt-1">
                  <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="number" value={editGuest.perDayRate} onChange={(e) => setEditGuest({ ...editGuest, perDayRate: Number(e.target.value) })} className="pl-8" />
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Days:</span>
                  <span className="font-medium">{Math.max(differenceInDays(editGuest.toDate, editGuest.fromDate) + 1, 1)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Total:</span>
                  <span className="font-semibold text-primary">₹{(Math.max(differenceInDays(editGuest.toDate, editGuest.fromDate) + 1, 1) * editGuest.perDayRate).toLocaleString()}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm">Notes</Label>
                <Input value={editGuest.notes} onChange={(e) => setEditGuest({ ...editGuest, notes: e.target.value })} placeholder="Notes..." className="mt-1" />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditSave} disabled={updateDayGuest.isPending || !editGuest?.guestName.trim()}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Day Guest Reminder Dialog */}
      <DayGuestReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />
    </AppLayout>
  );
};

export default DayGuestPage;
