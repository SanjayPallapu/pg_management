import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, CreditCard, FileText, Users, ChevronUp, ChevronDown, UserPlus, UserCheck, MessageCircle, Phone } from 'lucide-react';
import { Room } from '@/types';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDayGuests } from '@/hooks/useDayGuests';
import { WhatsAppReceiptDialog } from './WhatsAppReceiptDialog';
import { format } from 'date-fns';
interface RoomCardProps {
  room: Room;
  onViewDetails: (room: Room) => void;
}
export const RoomCard = ({
  room,
  onViewDetails
}: RoomCardProps) => {
  const {
    payments,
    markWhatsappSent
  } = useTenantPayments();
  const {
    selectedMonth,
    selectedYear
  } = useMonthContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const {
    dayGuests
  } = useDayGuests(room.id);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    tenantName: string;
    tenantPhone: string;
    paymentMode: string;
    paymentDate: string;
    joiningDate: string;
    forMonth: string;
    roomNo: string;
    sharingType: string;
    amount: number;
    amountPaid: number;
    isFullPayment: boolean;
    remainingBalance?: number;
    tenantId: string;
  } | null>(null);
  const months = [{
    value: 1,
    label: 'January'
  }, {
    value: 2,
    label: 'February'
  }, {
    value: 3,
    label: 'March'
  }, {
    value: 4,
    label: 'April'
  }, {
    value: 5,
    label: 'May'
  }, {
    value: 6,
    label: 'June'
  }, {
    value: 7,
    label: 'July'
  }, {
    value: 8,
    label: 'August'
  }, {
    value: 9,
    label: 'September'
  }, {
    value: 10,
    label: 'October'
  }, {
    value: 11,
    label: 'November'
  }, {
    value: 12,
    label: 'December'
  }];

  // Filter day guests for current month
  const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
  const endOfMonth = new Date(selectedYear, selectedMonth, 0);
  const currentGuests = dayGuests.filter(guest => {
    const fromDate = new Date(guest.from_date);
    const toDate = new Date(guest.to_date);
    return fromDate <= endOfMonth && toDate >= startOfMonth;
  });
  const guestsPaidCount = currentGuests.filter(g => g.payment_status === 'Paid').length;
  const getStatusColor = (status: string) => {
    if (status === 'Occupied') return 'bg-occupied text-occupied-foreground';
    if (status === 'Partially Occupied') return 'bg-warning text-warning-foreground';
    return 'bg-vacant text-vacant-foreground';
  };

  // Get payment for selected month
  const getSelectedMonthPayment = (tenantId: string) => {
    return payments.find(p => p.tenantId === tenantId && p.month === selectedMonth && p.year === selectedYear);
  };

  // Parse date string (YYYY-MM-DD) to get year, month, day without timezone issues
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Check if tenant was active during selected month
  // Active means: joined on or before the end of the month AND (no end date OR left during/after the month)
  const isTenantActiveInMonth = (startDate: string, endDate?: string) => {
    const joinDate = parseDate(startDate);
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0); // Last day of month
    
    // Tenant must have joined on or before the end of the selected month
    if (joinDate > monthEnd) return false;
    
    // If tenant has no end date, they're still active
    if (!endDate) return true;
    
    // If tenant has end date, they must have left during or after the selected month
    const leaveDate = parseDate(endDate);
    return leaveDate >= monthStart;
  };

  // Check if tenant left during the selected month
  const tenantLeftInMonth = (endDate?: string) => {
    if (!endDate) return false;
    const leaveDate = parseDate(endDate);
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);
    return leaveDate >= monthStart && leaveDate <= monthEnd;
  };

  // Check if tenant joined during the selected month
  const tenantJoinedInMonth = (startDate: string) => {
    const joinDate = parseDate(startDate);
    const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);
    return joinDate >= monthStart && joinDate <= monthEnd;
  };

  // Filter tenants active in selected month
  const tenantsInMonth = room.tenants.filter(t => isTenantActiveInMonth(t.startDate, t.endDate));
  
  // For payment eligibility, tenant must have joined before the month end
  const eligibleTenants = tenantsInMonth.filter(t => {
    const joinDate = new Date(t.startDate);
    const monthEnd = new Date(selectedYear, selectedMonth, 0);
    return joinDate <= monthEnd;
  });
  
  // Current active tenants (no end date or end date in future)
  const currentTenants = room.tenants.filter(t => !t.endDate);
  const occupiedCount = currentTenants.length;

  // Calculate collected amount from tenant_payments for selected month
  const totalCollected = eligibleTenants.reduce((sum, t) => {
    const payment = getSelectedMonthPayment(t.id);
    return sum + (payment?.paymentStatus === 'Paid' ? payment.amount : 0);
  }, 0);

  // Calculate expected rent for eligible tenants
  const expectedRent = eligibleTenants.reduce((sum, t) => sum + t.monthlyRent, 0);

  // Calculate paid count from tenants active in the selected month
  const paidCount = tenantsInMonth.filter(t => {
    const payment = getSelectedMonthPayment(t.id);
    return payment?.paymentStatus === 'Paid';
  }).length;
  const currentStatus = occupiedCount === room.capacity ? 'Occupied' : occupiedCount === 0 ? 'Vacant' : 'Partially Occupied';
  return <Card className="transition-all hover:shadow-md overflow-hidden w-full min-w-0 rounded-sm">

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-primary">
            ₹{totalCollected.toLocaleString()} / ₹{expectedRent.toLocaleString()}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Room {room.roomNo}</CardTitle>
          <Badge className={getStatusColor(currentStatus)}>
            {currentStatus}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Occupancy Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {occupiedCount}/{room.capacity} occupied
            </span>
          </div>

          {tenantsInMonth.length > 0 && <Badge variant="outline" className={`rounded-sm ${paidCount === tenantsInMonth.length ? 'bg-paid text-paid-foreground' : 'bg-pending text-pending-foreground'}`}>
              {paidCount}/{tenantsInMonth.length} paid
            </Badge>}
        </div>

       {/* Tenant List */}
        {tenantsInMonth.length > 0 && <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Tenants:</div>
        
            {(isExpanded ? tenantsInMonth : tenantsInMonth.slice(0, 2)).map(tenant => {
          const leftThisMonth = tenantLeftInMonth(tenant.endDate);
          const joinedThisMonth = tenantJoinedInMonth(tenant.startDate);
          const payment = getSelectedMonthPayment(tenant.id);
          const isPaid = payment?.paymentStatus === 'Paid';
          const isPartial = payment?.paymentStatus === 'Partial';
          const whatsappSent = payment?.whatsappSent;
          const handlePaidClick = () => {
            if (!isPaid && !isPartial) return;
            const lastEntry = payment?.paymentEntries?.[payment.paymentEntries.length - 1];
            setReceiptData({
              tenantName: tenant.name,
              tenantPhone: tenant.phone,
              paymentMode: lastEntry?.mode || 'cash',
              paymentDate: lastEntry?.date ? format(new Date(lastEntry.date), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy'),
              joiningDate: format(new Date(tenant.startDate), 'dd-MMM-yyyy'),
              forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
              roomNo: room.roomNo,
              sharingType: `${room.capacity} Sharing`,
              amount: tenant.monthlyRent,
              amountPaid: payment?.amountPaid || tenant.monthlyRent,
              isFullPayment: isPaid,
              remainingBalance: isPartial ? tenant.monthlyRent - (payment?.amountPaid || 0) : 0,
              tenantId: tenant.id
            });
            setWhatsappDialogOpen(true);
          };
          const openWhatsAppChat = () => {
            const phone = tenant.phone.replace(/\D/g, '');
            const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
            window.open(`https://wa.me/${formattedPhone}`, '_blank');
          };
          return <div key={tenant.id} className={`flex items-center justify-between gap-2 pb-2 border-b last:border-b-0 ${leftThisMonth ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate block">
                        {tenant.name}
                      </span>
                      {leftThisMonth && tenant.endDate && (
                        <span className="text-xs text-destructive">
                          Left: {format(new Date(tenant.endDate), 'dd MMM')}
                        </span>
                      )}
                      {joinedThisMonth && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Joined: {format(new Date(tenant.startDate), 'dd MMM')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      onClick={openWhatsAppChat}
                      className="p-1 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      title={`Chat with ${tenant.name}`}
                    >
                      <Phone className="h-3 w-3" />
                    </button>
                    {(isPaid || isPartial) && <button onClick={handlePaidClick} className={`p-1 rounded-full transition-colors ${whatsappSent ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'}`} title={whatsappSent ? 'Receipt sent' : 'Send receipt'}>
                        <MessageCircle className="h-3.5 w-3.5" />
                      </button>}
                    <Badge variant="outline" className={isPaid ? 'bg-paid text-paid-foreground text-xs cursor-pointer hover:opacity-80' : isPartial ? 'bg-partial text-partial-foreground text-xs cursor-pointer hover:opacity-80' : 'bg-pending text-pending-foreground text-xs'} onClick={isPaid || isPartial ? handlePaidClick : undefined}>
                      {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Not Paid'}
                    </Badge>
                  </div>
                </div>;
        })}
        
            {!isExpanded && tenantsInMonth.length > 2 && <div className="text-xs text-muted-foreground">
                +{tenantsInMonth.length - 2} more
              </div>}
          </div>}

        {/* Rent Info */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            ₹{room.rentAmount.toLocaleString()}
          </span>
        </div>

        {/* Day Guests Info - Show if guests present */}
        {currentGuests.length > 0 && <div className="border border-dashed border-primary/50 rounded-lg p-3 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Day Guests</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-background border-0 rounded-sm">
                  {room.tenants.length} Present
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 rounded-sm">
                  {currentGuests.length} Guest{currentGuests.length > 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className={guestsPaidCount === currentGuests.length ? 'bg-paid text-paid-foreground' : 'bg-pending text-pending-foreground'}>
                  {guestsPaidCount}/{currentGuests.length} paid
                </Badge>
              </div>
            </div>
            {/* Guest List with WhatsApp */}
            <div className="space-y-1.5 pt-1">
              {currentGuests.map(guest => {
                const openGuestWhatsApp = () => {
                  if (!guest.mobile_number) return;
                  const phone = guest.mobile_number.replace(/\D/g, '');
                  const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
                  window.open(`https://wa.me/${formattedPhone}`, '_blank');
                };
                return (
                  <div key={guest.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{guest.guest_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {guest.mobile_number && (
                        <button 
                          onClick={openGuestWhatsApp}
                          className="p-1 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          title={`Chat with ${guest.guest_name}`}
                        >
                          <Phone className="h-3 w-3" />
                        </button>
                      )}
                      <Badge variant="outline" className={guest.payment_status === 'Paid' ? 'bg-paid text-paid-foreground' : 'bg-pending text-pending-foreground'}>
                        {guest.payment_status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>}

        {/* Notes */}
        {room.notes && <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs">{room.notes}</span>
          </div>}


        {/* Day Guest Button - only show if beds available */}
        {occupiedCount < room.capacity && <div className="pt-2 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={() => navigate(`/day-guest/${room.id}?roomNo=${encodeURIComponent(room.roomNo)}`)} className="w-full h-10 flex items-center justify-center gap-2 border-dashed">
              <UserPlus className="h-4 w-4" />
              <span>Day Guest</span>
            </Button>
          </div>}

        <div className="flex items-center justify-between pt-2">
          {tenantsInMonth.length > 0 ? <button type="button" onClick={() => setIsExpanded(prev => !prev)} className="flex items-center gap-1 text-xs text-muted-foreground">
              {isExpanded ? <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Collapse</span>
                </> : <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Expand tenants</span>
                </>}
            </button> : <div />}
        
          <button type="button" onClick={() => {
          if (!isExpanded) setIsExpanded(true);
          onViewDetails(room);
        }} className="text-xs text-primary hover:underline font-medium">
            Manage Room
          </button>
        </div>

      </CardContent>

      {/* WhatsApp Receipt Dialog */}
      <WhatsAppReceiptDialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen} receiptData={receiptData} onWhatsappSent={() => {
      if (receiptData?.tenantId) {
        markWhatsappSent.mutate({
          tenantId: receiptData.tenantId,
          month: selectedMonth,
          year: selectedYear
        });
      }
    }} />
    </Card>;
};