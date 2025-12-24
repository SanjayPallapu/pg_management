import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, CreditCard, FileText, Users, ChevronUp, ChevronDown, UserPlus, UserCheck } from 'lucide-react';
import { Room } from '@/types';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useDayGuests } from '@/hooks/useDayGuests';

interface RoomCardProps {
  room: Room;
  onViewDetails: (room: Room) => void;
}

export const RoomCard = ({ room, onViewDetails }: RoomCardProps) => {
  const { payments } = useTenantPayments();
  const { selectedMonth, selectedYear } = useMonthContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { dayGuests } = useDayGuests(room.id);
  
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
    return payments.find(
      p => p.tenantId === tenantId && p.month === selectedMonth && p.year === selectedYear
    );
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

  const paidCount = eligibleTenants.filter(t => {
    const payment = getSelectedMonthPayment(t.id);
    return payment?.paymentStatus === 'Paid';
  }).length;

  const currentStatus =
    occupiedCount === room.capacity
      ? 'Occupied'
      : occupiedCount === 0
      ? 'Vacant'
      : 'Partially Occupied';

  return (
    <Card className="transition-all hover:shadow-md">

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

          {eligibleTenants.length > 0 && (
            <Badge
              variant="outline"
              className={
                paidCount === eligibleTenants.length
                  ? 'bg-paid text-paid-foreground'
                  : 'bg-pending text-pending-foreground'
              }
            >
              {paidCount}/{eligibleTenants.length} paid
            </Badge>
          )}
        </div>

       {/* Tenant List */}
        {room.tenants.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground font-medium">Tenants:</div>
        
            {(isExpanded ? room.tenants : room.tenants.slice(0, 2)).map(tenant => {
              const isEligible = isTenantEligible(tenant.startDate);
              const payment = getSelectedMonthPayment(tenant.id);
              const isPaid = payment?.paymentStatus === 'Paid';
        
              return (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between pb-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {tenant.name}
                    </span>
                  </div>
                  {isEligible ? (
                    <Badge
                      variant="outline"
                      className={
                        isPaid
                          ? 'bg-paid text-paid-foreground text-xs'
                          : 'bg-pending text-pending-foreground text-xs'
                      }
                    >
                      {isPaid ? 'Paid' : 'Not Paid'}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground text-xs"
                    >
                      Not Due
                    </Badge>
                  )}
                </div>
              );
            })}
        
            {!isExpanded && room.tenants.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{room.tenants.length - 2} more
              </div>
            )}
          </div>
        )}

        {/* Rent Info */}
        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            ₹{room.rentAmount.toLocaleString()}
          </span>
        </div>

        {/* Day Guests Info - Show if guests present */}
        {currentGuests.length > 0 && (
          <div className="border border-dashed border-primary/50 rounded-lg p-3 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Day Guests</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-background">
                  {room.tenants.length} Permanent
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {currentGuests.length} Guest{currentGuests.length > 1 ? 's' : ''}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={guestsPaidCount === currentGuests.length 
                    ? 'bg-paid text-paid-foreground' 
                    : 'bg-pending text-pending-foreground'
                  }
                >
                  {guestsPaidCount}/{currentGuests.length} paid
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {room.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-xs">{room.notes}</span>
          </div>
        )}


        {/* Day Guest Button - only show if beds available */}
        {occupiedCount < room.capacity && (
          <div className="pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/day-guest/${room.id}?roomNo=${encodeURIComponent(room.roomNo)}`)}
              className="w-full h-10 flex items-center justify-center gap-2 border-dashed"
            >
              <UserPlus className="h-4 w-4" />
              <span>Day Guest</span>
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {room.tenants.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span>Expand tenants</span>
                </>
              )}
            </button>
          ) : (
            <div />
          )}
        
          <button
            type="button"
            onClick={() => {
              if (!isExpanded) setIsExpanded(true);
              onViewDetails(room);
            }}
            className="text-xs text-primary hover:underline font-medium"
          >
            Manage Room
          </button>
        </div>

      </CardContent>
    </Card>
  );
};
