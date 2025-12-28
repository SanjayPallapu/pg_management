import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, CreditCard, FileText, Users, ChevronUp, ChevronDown, UserPlus, UserCheck, MessageCircle } from 'lucide-react';
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

  // Check if tenant is eligible for selected month (joined on or before)
  const isTenantEligible = (startDate: string) => {
    const joinDate = new Date(startDate);
    const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);
    return joinDate <= selectedDate;
  };

  // Filter eligible tenants for selected month
  const eligibleTenants = room.tenants.filter(t => isTenantEligible(t.startDate));
  const occupiedCount = room.tenants.length;

  // Calculate collected amount from tenant_payments for selected month
  const totalCollected = eligibleTenants.reduce((sum, t) => {
    const payment = getSelectedMonthPayment(t.id);
    return sum + (payment?.paymentStatus === 'Paid' ? payment.amount : 0);
  }, 0);

  // Calculate expected rent for eligible tenants
  const expectedRent = eligibleTenants.reduce((sum, t) => sum + t.monthlyRent, 0);

  // Calculate paid count from all tenants in the room (not just eligible)
  const paidCount = room.tenants.filter(t => {
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

          {room.tenants.length > 0 && <Badge variant="outline" className={`rounded-sm ${paidCount === room.tenants.length ? 'bg-paid text-paid-foreground' : 'bg-pending text-pending-foreground'}`}>
              {paidCount}/{room.tenants.length} paid
            </Badge>}
        </div>

       {/* Tenant List */}
        {room.tenants.length > 0 && <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Tenants:</div>
        
            {(isExpanded ? room.tenants : room.tenants.slice(0, 2)).map(tenant => {
          const isEligible = isTenantEligible(tenant.startDate);
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
          return <div key={tenant.id} className="flex items-center justify-between gap-2 pb-2 border-b last:border-b-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="min-w-0 text-sm font-medium truncate">
                      {tenant.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <>
                      {(isPaid || isPartial) && <button onClick={handlePaidClick} className={`p-1 rounded-full transition-colors ${whatsappSent ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'}`} title={whatsappSent ? 'Receipt sent' : 'Send receipt'}>
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>}
                      <Badge variant="outline" className={isPaid ? 'bg-paid text-paid-foreground text-xs cursor-pointer hover:opacity-80' : isPartial ? 'bg-partial text-partial-foreground text-xs cursor-pointer hover:opacity-80' : 'bg-pending text-pending-foreground text-xs'} onClick={isPaid || isPartial ? handlePaidClick : undefined}>
                        {isPaid ? 'Paid' : isPartial ? 'Partial' : 'Not Paid'}
                      </Badge>
                    </>
                  </div>
                </div>;
        })}
        
            {!isExpanded && room.tenants.length > 2 && <div className="text-xs text-muted-foreground">
                +{room.tenants.length - 2} more
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
        {currentGuests.length > 0 && <div className="border border-dashed border-primary/50 rounded-lg p-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Day Guests</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-background border-0 rounded-sm">
                  {room.tenants.length} Permanent
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 rounded-sm">
                  {currentGuests.length} Guest{currentGuests.length > 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className={guestsPaidCount === currentGuests.length ? 'bg-paid text-paid-foreground' : 'bg-pending text-pending-foreground'}>
                  {guestsPaidCount}/{currentGuests.length} paid
                </Badge>
              </div>
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
          {room.tenants.length > 0 ? <button type="button" onClick={() => setIsExpanded(prev => !prev)} className="flex items-center gap-1 text-xs text-muted-foreground">
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