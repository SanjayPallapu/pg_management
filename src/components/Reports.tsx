import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Room } from '@/types';
import { AlertTriangle, CheckCircle, MapPin, Users } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations, TenantWithPayment } from '@/hooks/useRentCalculations';
import { isTenantActiveInMonth } from '@/utils/dateOnly';

interface ReportsProps {
  rooms: Room[];
}

interface RoomWithAvailableBeds {
  room: Room;
  availableBeds: number;
  sharingType: number;
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
    notDueTenants
  } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments
  });

  // Filter tenants active in selected month for accurate counts
  const getActiveTenantsInMonth = (room: Room) => 
    room.tenants.filter(t => isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth));
  
  const vacantRooms = rooms.filter(room => getActiveTenantsInMonth(room).length === 0);
  const partiallyOccupiedRooms = rooms.filter(room => {
    const activeCount = getActiveTenantsInMonth(room).length;
    return activeCount > 0 && activeCount < room.capacity;
  });

  // Group available beds by sharing type
  const bedsByShareType = useMemo(() => {
    const roomsWithBeds: RoomWithAvailableBeds[] = [];
    
    rooms.forEach(room => {
      const activeCount = getActiveTenantsInMonth(room).length;
      const availableBeds = room.capacity - activeCount;
      if (availableBeds > 0) {
        roomsWithBeds.push({
          room,
          availableBeds,
          sharingType: room.capacity
        });
      }
    });

    // Group by sharing type
    const grouped: Record<number, RoomWithAvailableBeds[]> = {};
    roomsWithBeds.forEach(item => {
      if (!grouped[item.sharingType]) {
        grouped[item.sharingType] = [];
      }
      grouped[item.sharingType].push(item);
    });

    // Sort each group by room number
    Object.keys(grouped).forEach(key => {
      grouped[Number(key)].sort((a, b) => a.room.roomNo.localeCompare(b.room.roomNo));
    });

    return grouped;
  }, [rooms, selectedMonth, selectedYear]);

  const totalAvailableBeds = rooms.reduce((sum, room) => sum + (room.capacity - getActiveTenantsInMonth(room).length), 0);

  // Pending tenants = all non-paid (overdue + advance-not-paid + not-due + partial)
  // Sort: Due tenants (overdue + advance-not-paid + partial) by due date, then not-yet-due by due date
  const sortedPendingTenants = useMemo(() => {
    const pending = eligibleTenants.filter(t => t.paymentCategory !== 'paid' && !t.isLocked);
    
    // Sort function: get day of month from start date
    const getDueDay = (t: TenantWithPayment) => new Date(t.startDate).getDate();
    
    // Separate into due (overdue, advance-not-paid, partial) and not-yet-due
    const dueTenants = pending.filter(t => 
      t.paymentCategory === 'overdue' || 
      t.paymentCategory === 'advance-not-paid' || 
      t.paymentCategory === 'partial'
    ).sort((a, b) => getDueDay(a) - getDueDay(b));
    
    const notYetDueTenants = pending.filter(t => t.paymentCategory === 'not-due')
      .sort((a, b) => getDueDay(a) - getDueDay(b));
    
    return [...dueTenants, ...notYetDueTenants];
  }, [eligibleTenants]);
  
  // Exclude locked tenants from financial totals
  const unlockedOverdueTenants = overdueTenants.filter(t => !t.isLocked);
  const unlockedAdvanceNotPaidTenants = advanceNotPaidTenants.filter(t => !t.isLocked);
  const unlockedNotDueTenants = notDueTenants.filter(t => !t.isLocked);
  const unlockedPartialTenants = partialTenants.filter(t => !t.isLocked);
  
  const totalOverdueRent = unlockedOverdueTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalAdvanceNotPaidRent = unlockedAdvanceNotPaidTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalNotYetDueRent = unlockedNotDueTenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalPartialPaid = unlockedPartialTenants.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
  const totalPartialRemaining = unlockedPartialTenants.reduce((sum, t) => sum + (t.monthlyRent - (t.amountPaid || 0)), 0);
  
  const getFloorName = (floor: number) => {
    const floorNames: Record<number, string> = { 1: '1st Floor', 2: '2nd Floor', 3: '3rd Floor' };
    return floorNames[floor] || `Floor ${floor}`;
  };
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return <div className="space-y-4">
      <div>
        <h2 className="font-bold tracking-tight text-xl">Reports</h2>
        <p className="text-muted-foreground">
          {monthNames[selectedMonth - 1]} {selectedYear} - Detailed insights and analytics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Vacant Rooms Report */}
        <Card>
          <CardHeader className="pb-3 px-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-vacant" />
              Vacant Rooms ({vacantRooms.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {vacantRooms.length === 0 ? <p className="text-muted-foreground">All rooms have at least one tenant!</p> : <div className="space-y-2">
                {vacantRooms.map(room => <div key={room.roomNo} className="flex items-center justify-between p-3 bg-vacant-muted rounded-lg">
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
                  </div>)}
              </div>}
          </CardContent>
        </Card>

        {/* Available Beds Report - Grouped by Sharing Type */}
        <Card>
          <CardHeader className="pb-3 px-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-warning" />
              Available Beds ({totalAvailableBeds})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <div className="space-y-4">
              {Object.keys(bedsByShareType)
                .map(Number)
                .sort((a, b) => b - a) // Sort by sharing type descending (5S, 4S, 3S...)
                .map(shareType => {
                  const roomsInType = bedsByShareType[shareType];
                  const totalBedsInType = roomsInType.reduce((sum, r) => sum + r.availableBeds, 0);
                  
                  return (
                    <div key={shareType} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs font-medium">
                          {shareType} Sharing
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {totalBedsInType} bed{totalBedsInType !== 1 ? 's' : ''} in {roomsInType.length} room{roomsInType.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {roomsInType.map(({ room, availableBeds }) => {
                          const isFullyVacant = availableBeds === room.capacity;
                          return (
                            <div 
                              key={room.roomNo} 
                              className={`flex items-center justify-between p-2.5 rounded-lg ${
                                isFullyVacant ? 'bg-vacant-muted' : 'bg-warning-muted'
                              }`}
                            >
                              <div>
                                <div className="font-medium text-sm">Room {room.roomNo}</div>
                                <div className="text-xs text-muted-foreground">
                                  {isFullyVacant 
                                    ? `Fully vacant` 
                                    : `${room.capacity - availableBeds}/${room.capacity} occupied`
                                  }
                                </div>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${isFullyVacant ? 'border-vacant text-vacant' : 'border-warning text-warning'}`}
                              >
                                {availableBeds} bed{availableBeds !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              {totalAvailableBeds === 0 && (
                <p className="text-muted-foreground text-center py-4">All beds are occupied!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Rent Report - Sorted by due date */}
        <Card>
          <CardHeader className="pb-3 px-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-pending" />
              Pending Rent ({sortedPendingTenants.length} tenants)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            {sortedPendingTenants.length === 0 ? (
              <p className="text-muted-foreground">All tenants have paid rent for {monthNames[selectedMonth - 1]}!</p>
            ) : (
              <div className="space-y-2">
                {sortedPendingTenants.map(tenant => {
                  const isPartial = tenant.paymentCategory === 'partial';
                  const remaining = isPartial ? tenant.monthlyRent - (tenant.amountPaid || 0) : tenant.monthlyRent;
                  const dueDay = new Date(tenant.startDate).getDate();
                  
                  const bgClass = tenant.paymentCategory === 'overdue' 
                    ? 'bg-overdue-muted border-l-4 border-overdue' 
                    : tenant.paymentCategory === 'partial' 
                    ? 'bg-partial-muted border-l-4 border-partial' 
                    : tenant.paymentCategory === 'advance-not-paid' 
                    ? 'bg-advance-not-paid-muted border-l-4 border-advance-not-paid' 
                    : 'bg-blue-500/10 border-l-4 border-blue-500';
                  
                  const statusLabel = tenant.paymentCategory === 'overdue' 
                    ? 'Overdue' 
                    : tenant.paymentCategory === 'partial' 
                    ? 'Partial' 
                    : tenant.paymentCategory === 'advance-not-paid' 
                    ? 'Advance Due' 
                    : 'Not Yet Due';
                  
                  const textColorClass = tenant.paymentCategory === 'not-due' ? 'text-blue-600 dark:text-blue-400' : '';
                  
                  return (
                    <div key={tenant.id} className={`flex items-center justify-between p-3 rounded-lg ${bgClass}`}>
                      <div>
                        <div className="font-semibold">
                          {tenant.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            Due: {dueDay}{dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'}
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
                        <div className={`font-medium ${textColorClass || 'text-pending'}`}>₹{remaining.toLocaleString()}</div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            tenant.paymentCategory === 'overdue' ? 'bg-overdue text-overdue-foreground' 
                            : tenant.paymentCategory === 'partial' ? 'bg-partial text-partial-foreground' 
                            : tenant.paymentCategory === 'advance-not-paid' ? 'bg-advance-not-paid text-advance-not-paid-foreground' 
                            : 'bg-blue-500 text-white'
                          }`}
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                
                {/* Summary section */}
                <div className="mt-4 space-y-2">
                  {unlockedPartialTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-partial-muted">
                      <div className="font-medium text-partial">Partial Payments: ₹{totalPartialRemaining.toLocaleString()} remaining</div>
                      <div className="text-xs text-muted-foreground">({unlockedPartialTenants.length} tenants, ₹{totalPartialPaid.toLocaleString()} collected)</div>
                    </div>
                  )}

                  {unlockedAdvanceNotPaidTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-advance-not-paid-muted border-l-4 border-advance-not-paid">
                      <div className="font-medium text-advance-not-paid">Advance Due: ₹{totalAdvanceNotPaidRent.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">({unlockedAdvanceNotPaidTenants.length} tenants - due date passed)</div>
                    </div>
                  )}

                  {unlockedNotDueTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border-l-4 border-blue-500">
                      <div className="font-medium text-blue-600 dark:text-blue-400">Not Yet Due: ₹{totalNotYetDueRent.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">({unlockedNotDueTenants.length} tenants - due date upcoming)</div>
                    </div>
                  )}

                  {unlockedOverdueTenants.length > 0 && (
                    <div className="p-3 rounded-lg bg-overdue-muted">
                      <div className="font-medium text-overdue">Overdue: ₹{totalOverdueRent.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">({unlockedOverdueTenants.length} tenants)</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Collection Summary */}
        <Card>
          <CardHeader className="pb-3 px-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle className="h-5 w-5 text-paid" />
              {monthNames[selectedMonth - 1]} {selectedYear} Collection
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-3 bg-paid-muted rounded-lg">
                <div className="text-2xl font-bold text-paid">₹{rentCollected.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Rent Collected ({paidTenants.length + partialTenants.length} tenants)</div>
              </div>
              
              <div className="p-3 bg-pending-muted rounded-lg">
                <div className="text-2xl font-bold text-pending">₹{pendingRent.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Pending Rent ({sortedPendingTenants.length} tenants)</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Collection Progress</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-paid h-2 rounded-full transition-all duration-500" style={{
                width: `${rentCollected + pendingRent > 0 ? rentCollected / (rentCollected + pendingRent) * 100 : 0}%`
              }}></div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {rentCollected + pendingRent > 0 ? `${(rentCollected / (rentCollected + pendingRent) * 100).toFixed(1)}% collected` : '0% collected'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};