import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Room } from '@/types';
import { AlertTriangle, CheckCircle, MapPin, Users } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations } from '@/hooks/useRentCalculations';

interface ReportsProps {
  rooms: Room[];
}

export const Reports = ({ rooms }: ReportsProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();

  const {
    rentCollected,
    pendingRent,
    eligibleTenants,
    paidTenants,
    partialTenants,
    overdueTenants,
    advanceNotPaidTenants,
    notDueTenants,
  } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  const vacantRooms = rooms.filter(room => room.tenants.length === 0);
  const partiallyOccupiedRooms = rooms.filter(room => room.tenants.length > 0 && room.tenants.length < room.capacity);

  // Pending tenants = all non-paid (overdue + advance-not-paid + not-due + partial)
  const pendingTenants = eligibleTenants.filter(t => t.paymentCategory !== 'paid');

  const totalOverdueRent = overdueTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalAdvanceNotPaidRent = advanceNotPaidTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalNotYetDueRent = notDueTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalPartialPaid = partialTenants.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
  const totalPartialRemaining = partialTenants.reduce((sum, t) => sum + (t.monthlyRent - (t.amountPaid || 0)), 0);

  const getFloorName = (floor: number) => {
    const floorNames = { 1: '1st Floor', 2: '2nd Floor', 3: '3rd Floor' };
    return floorNames[floor as keyof typeof floorNames];
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          {monthNames[selectedMonth - 1]} {selectedYear} - Detailed insights and analytics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Vacant Rooms Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-vacant" />
              Vacant Rooms ({vacantRooms.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vacantRooms.length === 0 ? (
              <p className="text-muted-foreground">All rooms have at least one tenant!</p>
            ) : (
              <div className="space-y-3">
                {vacantRooms.map(room => (
                  <div key={room.roomNo} className="flex items-center justify-between p-3 bg-vacant-muted rounded-lg">
                    <div>
                      <div className="font-semibold">Room {room.roomNo}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getFloorName(room.floor)} • {room.capacity} bed capacity
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₹{room.rentAmount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Expected rent</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Beds Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-warning" />
              Available Beds ({rooms.reduce((sum, room) => sum + (room.capacity - room.tenants.length), 0)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {partiallyOccupiedRooms.map(room => (
                <div key={room.roomNo} className="flex items-center justify-between p-3 bg-warning-muted rounded-lg">
                  <div>
                    <div className="font-semibold">Room {room.roomNo}</div>
                    <div className="text-sm text-muted-foreground">
                      {room.tenants.length}/{room.capacity} occupied • {room.capacity - room.tenants.length} beds available
                    </div>
                  </div>
                </div>
              ))}
              {vacantRooms.map(room => (
                <div key={room.roomNo} className="flex items-center justify-between p-3 bg-vacant-muted rounded-lg">
                  <div>
                    <div className="font-semibold">Room {room.roomNo}</div>
                    <div className="text-sm text-muted-foreground">
                      Fully vacant • {room.capacity} beds available
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Rent Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-pending" />
              Pending Rent ({pendingTenants.length} tenants)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTenants.length === 0 ? (
              <p className="text-muted-foreground">All tenants have paid rent for {monthNames[selectedMonth - 1]}!</p>
            ) : (
              <div className="space-y-3">
                {pendingTenants.map(tenant => {
                  const isPartial = tenant.paymentCategory === 'partial';
                  const remaining = isPartial ? tenant.monthlyRent - (tenant.amountPaid || 0) : tenant.monthlyRent;

                  const bgClass = tenant.paymentCategory === 'overdue' 
                    ? 'bg-overdue-muted border-l-4 border-overdue' 
                    : tenant.paymentCategory === 'partial'
                    ? 'bg-partial-muted border-l-4 border-partial'
                    : tenant.paymentCategory === 'advance-not-paid'
                    ? 'bg-advance-not-paid-muted border-l-4 border-advance-not-paid'
                    : 'bg-not-due-muted border-l-4 border-not-due';
                  
                  const statusLabel = tenant.paymentCategory === 'overdue' 
                    ? 'Overdue' 
                    : tenant.paymentCategory === 'partial'
                    ? 'Partial'
                    : tenant.paymentCategory === 'advance-not-paid'
                    ? 'Advance Due'
                    : 'Pending';

                  return (
                    <div
                      key={tenant.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${bgClass}`}
                    >
                      <div>
                        <div className="font-semibold">
                          {tenant.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            {`: ${new Date(tenant.startDate).getDate()} ${new Date(tenant.startDate).toLocaleString('en-US', { month: 'short' })}`}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">Room {tenant.roomNo}</div>
                        {isPartial && (
                          <div className="text-xs mt-1">
                            <span className="text-paid">Paid: ₹{(tenant.amountPaid || 0).toLocaleString()}</span>
                            <span className="mx-1">•</span>
                            <span className="text-partial">Due: ₹{remaining.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-pending">₹{remaining.toLocaleString()}</div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            tenant.paymentCategory === 'overdue'
                              ? 'bg-overdue text-overdue-foreground'
                              : tenant.paymentCategory === 'partial'
                              ? 'bg-partial text-partial-foreground'
                              : tenant.paymentCategory === 'advance-not-paid'
                              ? 'bg-advance-not-paid text-advance-not-paid-foreground'
                              : 'bg-not-due text-not-due-foreground'
                          }`}
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 space-y-2">
                  {partialTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-partial-muted">
                      <div className="font-medium text-partial">Partial Payments: ₹{totalPartialRemaining.toLocaleString()} remaining</div>
                      <div className="text-xs text-muted-foreground">({partialTenants.length} tenants, ₹{totalPartialPaid.toLocaleString()} collected)</div>
                    </div>
                  )}

                  {advanceNotPaidTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-advance-not-paid-muted">
                      <div className="font-medium text-advance-not-paid">Advance Due: ₹{totalAdvanceNotPaidRent.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">({advanceNotPaidTenants.length} new tenants)</div>
                    </div>
                  )}

                  {notDueTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-not-due-muted">
                      <div className="font-medium text-not-due">Not Yet Due: ₹{totalNotYetDueRent.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">({notDueTenants.length} tenants)</div>
                    </div>
                  )}

                  {overdueTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-overdue-muted">
                      <div className="font-medium text-overdue">Overdue: ₹{totalOverdueRent.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">({overdueTenants.length} tenants)</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Collection Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-paid" />
              {monthNames[selectedMonth - 1]} {selectedYear} Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-paid-muted rounded-lg">
                <div className="text-2xl font-bold text-paid">₹{rentCollected.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Rent Collected ({paidTenants.length + partialTenants.length} tenants)</div>
              </div>
              
              <div className="p-4 bg-pending-muted rounded-lg">
                <div className="text-2xl font-bold text-pending">₹{pendingRent.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Pending Rent ({pendingTenants.length} tenants)</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium mb-2">Collection Progress</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-paid h-2 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${rentCollected + pendingRent > 0 ? (rentCollected / (rentCollected + pendingRent)) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {rentCollected + pendingRent > 0 ? 
                  `${((rentCollected / (rentCollected + pendingRent)) * 100).toFixed(1)}% collected` : 
                  '0% collected'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
