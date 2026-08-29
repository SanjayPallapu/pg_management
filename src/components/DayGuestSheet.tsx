import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Calendar, SquarePen, Trash2, Loader2, IndianRupee, ArrowLeft, MessageCircle, TrendingUp, AlertTriangle, UserPlus, Plus, Users, DoorOpen, Phone, Pencil } from 'lucide-react';
import { isTenantActiveNow } from '@/utils/dateOnly';
import { useAuth } from '@/hooks/useAuth';
import { useCollectorNames } from '@/hooks/useCollectorNames';
import { DayGuestReminderDialog, type DayGuestReminderInput } from '@/components/DayGuestReminderDialog';
import { DayGuestChatMenu } from '@/components/DayGuestChatMenu';

interface DayGuestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DayGuestPaymentEntry {
  amount: number;
  date: string;
  type: 'full' | 'partial' | 'remaining';
  mode?: 'upi' | 'cash';
  collectedBy?: string;
}

interface EditingGuest {
  id: string;
  guestName: string;
  mobileNumber: string;
  idProof: string;
  fromDate: Date;
  toDate: Date;
  perDayRate: number;
  notes: string;
  paymentEntries: DayGuestPaymentEntry[];
  amountPaid: number;
}

export const DayGuestSheet = ({ open, onOpenChange }: DayGuestSheetProps) => {
  const navigate = useNavigate();
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useMonthContext();
  const { dayGuests, isLoading, updateDayGuest, deleteDayGuest } = useDayGuests();
  const { rooms } = useRooms();
  const { role } = useAuth();
  const { collectors } = useCollectorNames();
  const canManageDayGuests = role === 'admin' || role === 'owner';

  // Active section tab: 'rooms' | 'guests' | 'revenue'
  const [activeTab, setActiveTab] = useState<'rooms' | 'guests' | 'revenue'>('rooms');

  // Handle OS back gesture to close sheet
  useBackGesture(open, () => onOpenChange(false));

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
  const [deleteEntryIdx, setDeleteEntryIdx] = useState<number | null>(null);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentGuest, setPaymentGuest] = useState<DayGuest | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [paymentCollectedBy, setPaymentCollectedBy] = useState<string>('');

  // Mark unpaid confirmation dialog state
  const [unpaidDialogOpen, setUnpaidDialogOpen] = useState(false);
  const [unpaidGuest, setUnpaidGuest] = useState<DayGuest | null>(null);

  // Reminder dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderData, setReminderData] = useState<DayGuestReminderInput | null>(null);

  const openReminder = (guest: DayGuest, roomNo: string) => {
    const amountPaid = guest.amount_paid || 0;
    const room = (rooms || []).find(r => r.roomNo === roomNo);
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

  // Handle OS back gesture to close sub-dialogs
  useBackGesture(editDialogOpen, () => setEditDialogOpen(false));
  useBackGesture(deleteDialogOpen, () => setDeleteDialogOpen(false));
  useBackGesture(paymentDialogOpen, () => setPaymentDialogOpen(false));
  useBackGesture(unpaidDialogOpen, () => setUnpaidDialogOpen(false));

  // Filter guests whose stay overlaps the selected month
  // (from_date <= endOfMonth AND to_date >= startOfMonth)
  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

  const filteredGuests = dayGuests.filter(guest => {
    const fromDate = new Date(guest.from_date);
    const toDate = new Date(guest.to_date);
    return fromDate <= endOfMonth && toDate >= startOfMonth;
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
    const entries = (guest.payment_entries as DayGuestPaymentEntry[]) || [];
    setEditingGuest({
      id: guest.id,
      guestName: guest.guest_name,
      mobileNumber: guest.mobile_number || '',
      idProof: guest.id_proof || '',
      fromDate: new Date(guest.from_date),
      toDate: new Date(guest.to_date),
      perDayRate: guest.per_day_rate,
      notes: guest.notes || '',
      paymentEntries: [...entries],
      amountPaid: guest.amount_paid || 0,
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingGuest || !editGuestData) return;

    const numberOfDays = Math.max(differenceInDays(editingGuest.toDate, editingGuest.fromDate) + 1, 1);
    const totalAmount = numberOfDays * editingGuest.perDayRate;
    const newAmountPaid = editingGuest.paymentEntries.reduce((sum, e) => sum + e.amount, 0);
    const newStatus = newAmountPaid >= totalAmount ? 'Paid' : 'Pending';

    await updateDayGuest.mutateAsync({
      id: editGuestData.id,
      guest_name: editingGuest.guestName.trim(),
      mobile_number: editingGuest.mobileNumber.trim() || null,
      id_proof: editingGuest.idProof.trim() || null,
      from_date: format(editingGuest.fromDate, 'yyyy-MM-dd'),
      to_date: format(editingGuest.toDate, 'yyyy-MM-dd'),
      per_day_rate: editingGuest.perDayRate,
      number_of_days: numberOfDays,
      total_amount: totalAmount,
      amount_paid: newAmountPaid,
      payment_entries: editingGuest.paymentEntries,
      payment_status: newStatus,
      notes: editingGuest.notes.trim() || null,
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
    setPaymentCollectedBy(collectors[0]?.displayName || 'Owner');
    setPaymentDialogOpen(true);
  };

  const handlePaymentConfirm = async () => {
    if (!paymentGuest || paymentAmount <= 0) return;

    const existingPaid = paymentGuest.amount_paid || 0;
    const totalPaid = existingPaid + paymentAmount;
    const isFullPayment = totalPaid >= paymentGuest.total_amount;
    const status = isFullPayment ? 'Paid' : 'Pending';

    const newEntry: DayGuestPaymentEntry = {
      amount: paymentAmount,
      date: format(paymentDate, 'yyyy-MM-dd'),
      type: existingPaid === 0 ? (isFullPayment ? 'full' : 'partial') : (isFullPayment ? 'remaining' : 'partial'),
      mode: paymentMode,
      collectedBy: paymentCollectedBy || collectors[0]?.displayName || 'Owner',
    };

    const existingEntries: DayGuestPaymentEntry[] = (paymentGuest.payment_entries as DayGuestPaymentEntry[]) || [];
    const updatedEntries = [...existingEntries, newEntry];

    await updateDayGuest.mutateAsync({
      id: paymentGuest.id,
      payment_status: status,
      amount_paid: Math.min(totalPaid, paymentGuest.total_amount),
      payment_entries: updatedEntries,
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
    setUnpaidDialogOpen(false);
    setUnpaidGuest(null);
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const totalCollected = filteredGuests.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
  const totalPending = filteredGuests.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);

  // Available rooms for day guests (rooms with at least 1 free bed)
  const availableRooms = (rooms || [])
    .map(room => {
      const activeTenantsCount = (room.tenants || []).filter(t => t && isTenantActiveNow(t.startDate, t.endDate)).length;
      const available = Math.max(0, room.capacity - activeTenantsCount);
      return { ...room, available, activeTenantsCount };
    })
    .filter(room => room.available > 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full max-w-full sm:max-w-xl p-0 [&>button]:hidden bg-slate-50 dark:bg-slate-900"
        >
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header */}
            <SheetHeader className="px-4 pt-4 pb-3 border-b bg-background sticky top-0 z-10 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <SheetTitle className="text-base text-foreground font-bold truncate">
                    Day Guest Hub
                  </SheetTitle>
                </div>

                {/* Month Selector on rightmost side */}
                <div className="flex items-center gap-1 shrink-0">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(val) => setSelectedMonth(parseInt(val))}
                  >
                    <SelectTrigger className="h-8 px-2.5 text-xs font-bold bg-muted/50 border-border/80 rounded-xl min-w-[85px] focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {[
                        { value: 1, label: "Jan" },
                        { value: 2, label: "Feb" },
                        { value: 3, label: "Mar" },
                        { value: 4, label: "Apr" },
                        { value: 5, label: "May" },
                        { value: 6, label: "Jun" },
                        { value: 7, label: "Jul" },
                        { value: 8, label: "Aug" },
                        { value: 9, label: "Sep" },
                        { value: 10, label: "Oct" },
                        { value: 11, label: "Nov" },
                        { value: 12, label: "Dec" },
                      ].map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()} className="text-xs font-medium">
                          {m.label} {selectedYear}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Side-by-Side Section Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl mt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  className={cn(
                    "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'rooms'
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <DoorOpen className="h-3.5 w-3.5" />
                  <span>Rooms</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('guests')}
                  className={cn(
                    "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'guests'
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Guests ({filteredGuests.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('revenue')}
                  className={cn(
                    "flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeTab === 'revenue'
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Revenue</span>
                </button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto bg-background">
              {/* SECTION: Select Room (Only Available Rooms with 4 columns matching Tenant Select Room) */}
              {activeTab === 'rooms' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      Available Rooms ({availableRooms.length})
                    </h3>
                    <span className="text-xs text-muted-foreground">Tap room to open form</span>
                  </div>

                  {availableRooms.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
                      <p className="text-sm font-medium">No available rooms at the moment</p>
                      <p className="text-xs text-muted-foreground/80 mt-1">All rooms are currently fully occupied</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2.5">
                      {availableRooms.map((room) => (
                        <div
                          key={room.id}
                          onClick={() => {
                            onOpenChange(false);
                            navigate(`/day-guest/${room.id}?roomNo=${encodeURIComponent(room.roomNo)}`);
                          }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-border bg-card shadow-xs hover:bg-accent/50 cursor-pointer transition-all active:scale-95 text-center group"
                        >
                          <span className="text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                            {room.roomNo}
                          </span>
                          <div className="flex items-center justify-center gap-1 mt-1 bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full">
                            <span className="text-[10px] font-semibold">{room.available} bed{room.available > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: Revenue Overview */}
              {activeTab === 'revenue' && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Revenue Overview ({monthName})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Collected</span>
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
                        ₹{totalCollected.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending</span>
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-2">
                        ₹{totalPending.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total Expected</span>
                      <span className="font-bold text-foreground">₹{(totalCollected + totalPending).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Total Guests ({monthName})</span>
                      <span className="font-bold text-foreground">{filteredGuests.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: Day Guests Present (Exact Rent Tab Layout with In-Card Room Badge and DayGuestChatMenu) */}
              {activeTab === 'guests' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-foreground" />
                      <h3 className="text-sm font-bold text-foreground">
                        Day Guests Present ({filteredGuests.length})
                      </h3>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredGuests.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground">
                      <p className="text-sm font-medium">No day guests present for {monthName}</p>
                      <p className="text-xs text-muted-foreground/80 mt-1">Switch to Rooms tab to add a new day guest</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredGuests
                        .slice()
                        .sort((a, b) => {
                          const roomA = rooms.find(r => r.id === a.room_id)?.roomNo || '';
                          const roomB = rooms.find(r => r.id === b.room_id)?.roomNo || '';
                          return roomA.localeCompare(roomB, undefined, { numeric: true }) || a.guest_name.localeCompare(b.guest_name);
                        })
                        .map((guest) => {
                          const room = rooms.find(r => r.id === guest.room_id);
                          const roomNo = room?.roomNo || 'Unknown';
                          const amountPaid = guest.amount_paid || 0;
                          const remaining = Math.max(0, guest.total_amount - amountPaid);
                          const isPartial = amountPaid > 0 && amountPaid < guest.total_amount;
                          const isPaid = guest.payment_status === 'Paid';
                          const paymentEntries = (guest.payment_entries as DayGuestPaymentEntry[]) || [];
                          const displayAmount = isPaid ? guest.total_amount : remaining;

                          return (
                            <div
                              key={guest.id}
                              className={cn(
                                "card-interactive p-4 border rounded-2xl relative transition-all duration-200",
                                isPaid
                                  ? "bg-paid-muted/30 border-paid/40"
                                  : isPartial
                                  ? "bg-partial-muted/30 border-partial/40"
                                  : "bg-card border-border"
                              )}
                            >
                              <div className="flex justify-between items-start">
                                {/* Left Column */}
                                <div className="space-y-1 flex-1 pr-2 min-w-0">
                                  {/* Guest Name and Room Badge */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-base text-foreground truncate">
                                      {guest.guest_name}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                                      Room {roomNo}
                                    </span>
                                  </div>

                                  {/* Phone Number */}
                                  {guest.mobile_number && (
                                    <div className="text-xs text-muted-foreground">
                                      {guest.mobile_number}
                                    </div>
                                  )}

                                  {/* Stay Period & Days */}
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(guest.from_date), 'dd MMM yyyy')} – {format(new Date(guest.to_date), 'dd MMM yyyy')} ({guest.number_of_days} days)
                                  </div>

                                  {/* Payments Breakdown */}
                                  {(paymentEntries.length > 0 || isPaid) && (
                                    <div className="mt-2 space-y-1">
                                      <div className={cn("text-xs font-medium", !isPaid ? "font-bold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                        {isPaid ? "Payments:" : "Payment:"}
                                      </div>
                                      {paymentEntries.length > 0 ? (
                                        paymentEntries.map((entry, idx) => (
                                          <div key={idx} className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            <span>₹{entry.amount.toLocaleString()}{entry.date ? ` on ${format(new Date(entry.date), 'dd MMM yyyy')}` : ''}</span>
                                            <span className={entry.mode === 'upi' ? 'tag-upi' : 'tag-cash'}>
                                              {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                                            </span>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-xs text-muted-foreground">
                                          <span>₹{amountPaid.toLocaleString()}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Red Price Badge on bottom of Left Div (for Pending/Partial) */}
                                  {!isPaid && (
                                    <div className="mt-3 pt-1">
                                      <span className="price-badge-red shrink-0">
                                        ₹{displayAmount.toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Right Column */}
                                <div className="flex flex-col justify-between items-end shrink-0 ml-auto text-right">
                                  {/* Top: Price for Paid */}
                                  <div className="w-[84px] text-center">
                                    {isPaid && (
                                      <span className="text-lg font-extrabold text-foreground">
                                        ₹{displayAmount.toLocaleString()}
                                      </span>
                                    )}
                                  </div>

                                  {/* Middle: Action icons */}
                                  {guest.mobile_number && guest.mobile_number !== "••••••••••" ? (
                                    <div className="flex w-[84px] items-center justify-between my-2">
                                      <DayGuestChatMenu
                                        guestName={guest.guest_name}
                                        phone={guest.mobile_number}
                                        isPaid={isPaid}
                                        isPartial={isPartial}
                                        message={!isPaid ? `Hi ${guest.guest_name}, your day guest stay payment of ₹${remaining.toLocaleString()} for Room ${roomNo} is pending. Please pay at your earliest convenience. Thank you!` : undefined}
                                        onReminder={!isPaid ? () => openReminder(guest, roomNo) : undefined}
                                        onReceipt={(isPaid || isPartial) ? () => openReminder(guest, roomNo) : undefined}
                                        onEdit={() => handleEditStart(guest)}
                                        onDelete={canManageDayGuests ? () => handleDeleteStart(guest) : undefined}
                                      />
                                      <a
                                        href={`tel:${guest.mobile_number}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="grid h-9 w-9 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400 cursor-pointer active:scale-95"
                                        title={`Call ${guest.guest_name}`}
                                      >
                                        <Phone className="h-4 w-4" />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="w-[84px] my-2" />
                                  )}

                                  {/* Bottom: Paid badge or Pay button */}
                                  <div className="w-[84px]">
                                    {isPaid ? (
                                      <button
                                        type="button"
                                        className="badge-paid-periwinkle w-full px-0 text-center block cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                                        onClick={() => handleStatusChange(guest, 'Pending')}
                                        title="Click to undo payment"
                                      >
                                        Paid
                                      </button>
                                    ) : isPartial ? (
                                      <button
                                        type="button"
                                        onClick={() => handlePaymentStart(guest)}
                                        className="btn-pay-black w-full px-0 text-center"
                                      >
                                        Pay
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handlePaymentStart(guest)}
                                        className="btn-pay-black w-full px-0 text-center"
                                      >
                                        Pay
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Day Guest</AlertDialogTitle>
            <AlertDialogDescription>
              Update details for {editGuestData?.guest_name}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editingGuest && editGuestData && (
            <div className="space-y-3 py-2">
              {/* Guest Name */}
              <div>
                <Label className="text-sm">Guest Name *</Label>
                <Input
                  value={editingGuest.guestName}
                  onChange={(e) => setEditingGuest(prev => prev ? { ...prev, guestName: e.target.value } : null)}
                  placeholder="Guest name"
                  className="mt-1"
                />
              </div>

              {/* Mobile & ID Proof */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Mobile</Label>
                  <Input
                    value={editingGuest.mobileNumber}
                    onChange={(e) => setEditingGuest(prev => prev ? { ...prev, mobileNumber: e.target.value } : null)}
                    placeholder="Mobile number"
                    type="tel"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">ID Proof</Label>
                  <Input
                    value={editingGuest.idProof}
                    onChange={(e) => setEditingGuest(prev => prev ? { ...prev, idProof: e.target.value } : null)}
                    placeholder="Aadhar, DL..."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start mt-1">
                        <Calendar className="h-3 w-3 mr-2" />
                        {format(editingGuest.fromDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editingGuest.fromDate}
                        onSelect={(date) => date && setEditingGuest(prev => prev ? { ...prev, fromDate: date } : null)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
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
                        disabled={(date) => date < editingGuest.fromDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Per Day Rate */}
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

              {/* Summary */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Days:</span>
                  <span className="font-medium">{Math.max(differenceInDays(editingGuest.toDate, editingGuest.fromDate) + 1, 1)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>New Total:</span>
                  <span className="font-semibold text-primary">
                    ₹{(Math.max(differenceInDays(editingGuest.toDate, editingGuest.fromDate) + 1, 1) * editingGuest.perDayRate).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm">Notes</Label>
                <Input
                  value={editingGuest.notes}
                  onChange={(e) => setEditingGuest(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  placeholder="Additional notes..."
                  className="mt-1"
                />
              </div>

              {/* Payment Entries - Editable */}
              {editingGuest.paymentEntries.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Payment History</Label>
                  </div>
                  {editingGuest.paymentEntries.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="relative">
                          <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                          <Input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => {
                              const updated = [...editingGuest.paymentEntries];
                              updated[idx] = { ...updated[idx], amount: Number(e.target.value) || 0 };
                              setEditingGuest(prev => prev ? { ...prev, paymentEntries: updated } : null);
                            }}
                            className="pl-7 h-8 text-sm"
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.date), 'dd MMM')}
                      </span>
                      {entry.mode && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === 'upi' ? 'bg-upi-muted text-upi' : 'bg-cash-muted text-cash'}`}>
                          {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteEntryIdx(idx)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Total Paid:</span>
                    <span className="font-medium text-paid">
                      ₹{editingGuest.paymentEntries.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
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
      {/* Delete Payment Entry Confirmation */}
      <AlertDialog open={deleteEntryIdx !== null} onOpenChange={(open) => { if (!open) setDeleteEntryIdx(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteEntryIdx(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteEntryIdx !== null && editingGuest) {
                  const updated = editingGuest.paymentEntries.filter((_, i) => i !== deleteEntryIdx);
                  setEditingGuest(prev => prev ? { ...prev, paymentEntries: updated } : null);
                }
                setDeleteEntryIdx(null);
              }}
            >
              Delete Entry
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
    </>
  );
};
