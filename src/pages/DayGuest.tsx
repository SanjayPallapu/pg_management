import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Phone, CreditCard, FileText, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDayGuests, DayGuest } from '@/hooks/useDayGuests';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_PER_DAY_RATE = 350;

const DayGuestPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const roomNo = searchParams.get('roomNo') || '';
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const { dayGuests, isLoading, addDayGuest, updateDayGuest, deleteDayGuest } = useDayGuests(roomId);

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
  const numberOfDays = fromDate && toDate ? Math.max(differenceInDays(toDate, fromDate), 1) : 1;
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

  const handleStatusChange = async (guest: DayGuest, newStatus: 'Paid' | 'Pending') => {
    await updateDayGuest.mutateAsync({
      id: guest.id,
      payment_status: newStatus,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this day guest?')) {
      await deleteDayGuest.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Day Guest</h1>
            <p className="text-sm text-muted-foreground">Room {roomNo}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Add Day Guest Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Day Guest</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guest History</CardTitle>
          </CardHeader>
          <CardContent>
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
                {dayGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{guest.guest_name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            guest.payment_status === 'Paid'
                              ? 'bg-paid text-paid-foreground'
                              : 'bg-pending text-pending-foreground'
                          )}
                        >
                          {guest.payment_status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(guest.from_date), 'MMM d')} -{' '}
                        {format(new Date(guest.to_date), 'MMM d, yyyy')} ({guest.number_of_days} days)
                      </p>
                      <p className="text-sm font-medium text-primary">
                        ₹{guest.total_amount.toLocaleString()}
                      </p>
                      {guest.mobile_number && (
                        <p className="text-xs text-muted-foreground">{guest.mobile_number}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Select
                        value={guest.payment_status}
                        onValueChange={(v) => handleStatusChange(guest, v as 'Paid' | 'Pending')}
                      >
                        <SelectTrigger className="h-8 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(guest.id)}
                          className="h-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DayGuestPage;
