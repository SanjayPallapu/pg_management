import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Room } from '@/types';
import { 
  AlertTriangle, 
  BedDouble, 
  CheckCircle, 
  IndianRupee, 
  MapPin, 
  Users, 
  MessageSquare, 
  Search, 
  Layers, 
  TrendingUp, 
  ArrowRight,
  Printer,
  Sparkles
} from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations, TenantWithPayment } from '@/hooks/useRentCalculations';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'occupancy'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const getActiveTenantsInMonth = (room: Room) => 
    room.tenants.filter(t => {
      if (!isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)) return false;
      if (t.endDate) {
        const endDate = new Date(t.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        if (endDate <= today) return false;
      }
      return true;
    });

  const vacantRooms = rooms.filter(room => getActiveTenantsInMonth(room).length === 0);
  const partiallyOccupiedRooms = rooms.filter(room => {
    const activeCount = getActiveTenantsInMonth(room).length;
    return activeCount > 0 && activeCount < room.capacity;
  });

  // Available beds calculations
  const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupiedBeds = rooms.reduce((sum, room) => sum + getActiveTenantsInMonth(room).length, 0);
  const totalAvailableBeds = totalBeds - occupiedBeds;
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  // Collection percentages
  const totalExpectedRevenue = rentCollected + pendingRent;
  const collectionRate = totalExpectedRevenue > 0 ? (rentCollected / totalExpectedRevenue) * 100 : 0;

  // Sorting and filtering pending tenants
  const sortedPendingTenants = useMemo(() => {
    const pending = eligibleTenants.filter(t => t.paymentCategory !== 'paid' && !t.isLocked);
    const getDueDay = (t: TenantWithPayment) => new Date(t.startDate).getDate();
    
    return pending.sort((a, b) => getDueDay(a) - getDueDay(b));
  }, [eligibleTenants]);

  // Filter pending by search input
  const filteredPendingTenants = useMemo(() => {
    return sortedPendingTenants.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.roomNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedPendingTenants, searchTerm]);

  // Group rooms by floors
  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, Room[]> = {};
    rooms.forEach(room => {
      if (!grouped[room.floor]) {
        grouped[room.floor] = [];
      }
      grouped[room.floor].push(room);
    });
    return grouped;
  }, [rooms]);

  const handleSendReminder = (tenantName: string, phone: string, amount: number, roomNo: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Valid contact number not found for tenant");
      return;
    }
    const message = `Hello ${tenantName}, this is a gentle reminder that your rent of ₹${amount.toLocaleString()} for Room ${roomNo} is pending. Please make the payment as soon as possible. Thank you!`;
    const encodedText = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, "_blank");
    toast.success(`Opening WhatsApp reminder chat for ${tenantName}`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const activeMonthName = monthNames[selectedMonth - 1];

  return (
    <div className="space-y-4 text-left">
      {/* Visual Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-primary/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-primary/20 mb-1 hover:bg-primary/20">
            <Sparkles className="h-3 w-3 mr-1" /> Analytics Dashboard
          </Badge>
          <h2 className="text-xl font-bold tracking-tight">{activeMonthName} {selectedYear} Health Check</h2>
          <p className="text-xs text-muted-foreground">
            Complete financial, occupancy, and room health breakdown.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrintReport}
          className="rounded-xl shrink-0 h-9 gap-1.5"
        >
          <Printer className="h-4 w-4" />
          Print / Export
        </Button>
      </div>

      {/* Pill Navigation Tabs */}
      <div className="flex bg-muted p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'overview' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'collections' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Collections & Dues ({sortedPendingTenants.length})
        </button>
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'occupancy' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Rooms & Beds
        </button>
      </div>

      {/* Content Sheets */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Main Visual Gauges Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Rent Collection Progress Gauge */}
            <Card className="overflow-hidden border border-border/80">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center h-28 w-28">
                  {/* SVG circular track */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="56" cy="56" r="48" 
                      className="text-muted/50 stroke-current" 
                      strokeWidth="8" fill="none"
                    />
                    <circle 
                      cx="56" cy="56" r="48" 
                      className="text-emerald-500 stroke-current transition-all duration-700 ease-out" 
                      strokeWidth="8" fill="none"
                      strokeDasharray="301.6"
                      strokeDashoffset={301.6 - (301.6 * collectionRate) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold text-emerald-500">{collectionRate.toFixed(0)}%</span>
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase">Collected</span>
                  </div>
                </div>
                <h4 className="font-bold text-sm mt-3">Rent Collections Progress</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ₹{rentCollected.toLocaleString()} of ₹{totalExpectedRevenue.toLocaleString()} received
                </p>
                <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-4 border-t text-left">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Collected</span>
                    <p className="text-sm font-bold text-emerald-500">₹{rentCollected.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Pending</span>
                    <p className="text-sm font-bold text-amber-500">₹{pendingRent.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy Status Gauge */}
            <Card className="overflow-hidden border border-border/80">
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center h-28 w-28">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="56" cy="56" r="48" 
                      className="text-muted/50 stroke-current" 
                      strokeWidth="8" fill="none"
                    />
                    <circle 
                      cx="56" cy="56" r="48" 
                      className="text-indigo-500 stroke-current transition-all duration-700 ease-out" 
                      strokeWidth="8" fill="none"
                      strokeDasharray="301.6"
                      strokeDashoffset={301.6 - (301.6 * occupancyRate) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold text-indigo-500">{occupancyRate.toFixed(0)}%</span>
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase">Occupied</span>
                  </div>
                </div>
                <h4 className="font-bold text-sm mt-3">Active Bed Occupancy</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {occupiedBeds} beds filled out of {totalBeds} total capacity
                </p>
                <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-4 border-t text-left">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Vacant Rooms</span>
                    <p className="text-sm font-bold text-rose-500">{vacantRooms.length}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Vacant Beds</span>
                    <p className="text-sm font-bold text-indigo-500">{totalAvailableBeds}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-500/10">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">Total Collected</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{rentCollected.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{paidTenants.length + partialTenants.length} Paid payments</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-500/10">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Total Outstanding</span>
                <p className="text-lg font-black text-amber-600 dark:text-amber-400">₹{pendingRent.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{sortedPendingTenants.length} Pending tenants</p>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-500/10">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-indigo-600 dark:text-indigo-400">Occupied Rooms</span>
                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{rooms.length - vacantRooms.length}</p>
                <p className="text-[10px] text-muted-foreground">{partiallyOccupiedRooms.length} Partially filled</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50/50 dark:bg-purple-950/10 border-purple-500/10">
              <CardContent className="p-4 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-purple-600 dark:text-purple-400">Average Collection</span>
                <p className="text-lg font-black text-purple-600 dark:text-purple-400">
                  ₹{eligibleTenants.length > 0 ? Math.round(rentCollected / eligibleTenants.length).toLocaleString() : 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Per registered tenant</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'collections' && (
        <Card className="border border-border/80">
          <CardHeader className="pb-3 pt-4 px-4 flex flex-col xs:flex-row xs:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold">Pending Dues & Reminders</CardTitle>
              <p className="text-xs text-muted-foreground">List of tenants with outstanding payments for this rent cycle.</p>
            </div>
            <div className="relative w-full xs:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tenant or room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 rounded-lg text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPendingTenants.length === 0 ? (
              <div className="text-center py-10 px-4">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="font-semibold text-sm">All clear!</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {searchTerm ? "No pending tenants match your filter." : "All tenants have paid rent for this month."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-t">
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="p-3 font-semibold text-[10px] text-muted-foreground uppercase">Tenant / Room</th>
                      <th className="p-3 font-semibold text-[10px] text-muted-foreground uppercase">Status</th>
                      <th className="p-3 font-semibold text-[10px] text-muted-foreground uppercase text-right">Pending Amount</th>
                      <th className="p-3 font-semibold text-[10px] text-muted-foreground uppercase text-center">Remind</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPendingTenants.map((tenant) => {
                      const isPartial = tenant.paymentCategory === 'partial';
                      const remaining = isPartial ? tenant.monthlyRent - (tenant.amountPaid || 0) : tenant.monthlyRent;
                      const dueDay = new Date(tenant.startDate).getDate();
                      
                      const statusBadgeColor = 
                        tenant.paymentCategory === 'overdue' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        : tenant.paymentCategory === 'partial' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : tenant.paymentCategory === 'advance-not-paid' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/20';

                      return (
                        <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-foreground">{tenant.name}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="bg-muted px-1 py-0.2 rounded font-mono">Room {tenant.roomNo}</span>
                              <span>•</span>
                              <span>Due day: {dueDay}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[10px] font-semibold border ${statusBadgeColor}`}>
                              {tenant.paymentCategory === 'overdue' ? 'Overdue' 
                               : tenant.paymentCategory === 'partial' ? 'Partially Paid' 
                               : tenant.paymentCategory === 'advance-not-paid' ? 'Advance Due' 
                               : 'Not Yet Due'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-foreground">₹{remaining.toLocaleString()}</div>
                            {isPartial && (
                              <div className="text-[9px] text-muted-foreground mt-0.5">
                                Paid: ₹{(tenant.amountPaid || 0).toLocaleString()}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg"
                              onClick={() => handleSendReminder(tenant.name, tenant.phone, remaining, tenant.roomNo)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'occupancy' && (
        <div className="space-y-4">
          {/* Floor lists */}
          {Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b).map((floor) => {
            const floorRooms = roomsByFloor[floor];
            const floorBeds = floorRooms.reduce((sum, r) => sum + r.capacity, 0);
            const floorOccupied = floorRooms.reduce((sum, r) => sum + getActiveTenantsInMonth(r).length, 0);
            const floorAvailable = floorBeds - floorOccupied;

            return (
              <Card key={floor} className="border border-border/80 overflow-hidden">
                <CardHeader className="bg-muted/40 p-4 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary shrink-0" />
                      <CardTitle className="text-sm font-bold">Floor {floor}</CardTitle>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>Occupied: <strong>{floorOccupied}</strong> / {floorBeds} Beds</span>
                      <span className="h-3 w-[1px] bg-border" />
                      <span className="text-emerald-500">Available: <strong>{floorAvailable}</strong> Beds</span>
                    </div>
                  </div>
                  <Progress 
                    value={floorBeds > 0 ? (floorOccupied / floorBeds) * 100 : 0} 
                    className="h-1.5 mt-2 bg-muted-foreground/10" 
                  />
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {floorRooms.sort((a,b) => a.roomNo.localeCompare(b.roomNo)).map((room) => {
                      const roomOccupied = getActiveTenantsInMonth(room).length;
                      const roomAvailable = room.capacity - roomOccupied;
                      const isVacant = roomOccupied === 0;
                      const isFull = roomOccupied >= room.capacity;

                      return (
                        <div 
                          key={room.roomNo} 
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                            isVacant 
                              ? 'bg-rose-500/5 border-rose-500/10' 
                              : isFull 
                                ? 'bg-emerald-500/5 border-emerald-500/10' 
                                : 'bg-amber-500/5 border-amber-500/10'
                          }`}
                        >
                          <div className="text-left space-y-0.5">
                            <span className="text-xs font-bold text-foreground">Room {room.roomNo}</span>
                            <p className="text-[10px] text-muted-foreground">
                              {room.capacity} Sharing • {room.isAc ? "A/C" : "Non-A/C"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                              isVacant 
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                : isFull
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            }`}>
                              {isVacant ? "Vacant" : isFull ? "Full" : `${roomOccupied}/${room.capacity} Bed`}
                            </span>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{roomAvailable} Available</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
