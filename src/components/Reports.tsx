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
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
  Percent
} from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations, TenantWithPayment } from '@/hooks/useRentCalculations';
import { useExpenseEntries } from '@/hooks/useExpenseEntries';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { toast } from 'sonner';

interface ReportsProps {
  rooms: Room[];
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

  // Query expenses for the selected month/year
  const { entries: expenses = [], grandTotal: totalExpenses } = useExpenseEntries(selectedMonth, selectedYear);

  const getActiveTenantsInMonth = (room: Room) => 
    room.tenants.filter(t => isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth));

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

  // Financial P&L
  const actualNetIncome = rentCollected - totalExpenses;
  const projectedNetIncome = totalExpectedRevenue - totalExpenses;
  const expenseRatio = rentCollected > 0 ? (totalExpenses / rentCollected) * 100 : 0;

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
    <div className="space-y-3.5 text-left">
      {/* Visual Header - More compact padding */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-primary/10 p-3.5 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[9px] px-1.5 py-0">
            <Sparkles className="h-2.5 w-2.5 mr-1" /> Analytics Dashboard
          </Badge>
          <h2 className="text-sm font-bold tracking-tight">{activeMonthName} {selectedYear} Health Check</h2>
          <p className="text-[10px] text-muted-foreground">
            Month-to-date collections and occupancy breakdown.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrintReport}
          className="rounded-xl shrink-0 h-8 text-[11px] gap-1 px-2.5"
        >
          <Printer className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {/* Pill Navigation Tabs - Segmented Control (iOS style, compact) */}
      <div className="flex bg-muted/80 p-0.5 rounded-lg gap-0.5 max-w-full">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
            activeTab === 'overview' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
            activeTab === 'collections' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Collections ({sortedPendingTenants.length})
        </button>
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
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
        <div className="space-y-3">
          
          {/* Executive P&L Income Statement Card - Compact Padding */}
          <Card className="border border-primary/10 overflow-hidden relative bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between border-b bg-muted/20">
              <div className="text-left">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Financial Statement (P&L)</CardTitle>
              </div>
              <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-3 gap-1 divide-x">
                <div className="space-y-0.5 text-left">
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <ArrowUpCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                    Revenue
                  </span>
                  <p className="text-sm font-extrabold text-foreground">₹{rentCollected.toLocaleString()}</p>
                  <p className="text-[8px] text-muted-foreground">₹{totalExpectedRevenue.toLocaleString()} proj.</p>
                </div>
                <div className="space-y-0.5 text-left pl-2">
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <ArrowDownCircle className="h-3 w-3 text-rose-500 shrink-0" />
                    Expenses
                  </span>
                  <p className="text-sm font-extrabold text-foreground">₹{totalExpenses.toLocaleString()}</p>
                  <p className="text-[8px] text-muted-foreground">{expenses.length} bills</p>
                </div>
                <div className="space-y-0.5 text-left pl-2">
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-indigo-500 shrink-0" />
                    Net Income
                  </span>
                  <p className={`text-sm font-black ${actualNetIncome >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    ₹{actualNetIncome.toLocaleString()}
                  </p>
                  <p className="text-[8px] text-muted-foreground">₹{projectedNetIncome.toLocaleString()} proj.</p>
                </div>
              </div>

              {/* Progress bars indicators */}
              <div className="space-y-1.5 pt-2 border-t text-[10px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-muted-foreground">Expense-to-Revenue Ratio</span>
                  <span className="font-semibold text-muted-foreground">{expenseRatio.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, expenseRatio)} className="h-1 bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Gauges Grid - Compact design */}
          <div className="grid gap-3 grid-cols-2">
            <Card className="border border-border/80">
              <CardContent className="p-3.5 flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center h-20 w-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-muted/40 stroke-current" 
                      strokeWidth="5" fill="none"
                    />
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-emerald-500 stroke-current transition-all duration-700 ease-out" 
                      strokeWidth="5" fill="none"
                      strokeDasharray="213.6"
                      strokeDashoffset={213.6 - (213.6 * collectionRate) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-bold text-emerald-500">{collectionRate.toFixed(0)}%</span>
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Collected</span>
                  </div>
                </div>
                <h4 className="font-bold text-[10px] mt-2">Rent Collection</h4>
              </CardContent>
            </Card>

            <Card className="border border-border/80">
              <CardContent className="p-3.5 flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center h-20 w-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-muted/40 stroke-current" 
                      strokeWidth="5" fill="none"
                    />
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-indigo-500 stroke-current transition-all duration-700 ease-out" 
                      strokeWidth="5" fill="none"
                      strokeDasharray="213.6"
                      strokeDashoffset={213.6 - (213.6 * occupancyRate) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-bold text-indigo-500">{occupancyRate.toFixed(0)}%</span>
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Occupied</span>
                  </div>
                </div>
                <h4 className="font-bold text-[10px] mt-2">Beds Filled</h4>
              </CardContent>
            </Card>
          </div>

          {/* Quick Metrics Grid - Denser padding */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Vacant Rooms</span>
                <p className="text-sm font-black text-rose-500 mt-0.5">{vacantRooms.length} Rooms</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            </Card>
            <Card className="p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Vacant Beds</span>
                <p className="text-sm font-black text-indigo-500 mt-0.5">{totalAvailableBeds} Beds</p>
              </div>
              <BedDouble className="h-4 w-4 text-indigo-500 shrink-0" />
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'collections' && (
        <Card className="border border-border/80">
          <CardHeader className="py-2.5 px-3 flex items-center justify-between gap-3 border-b">
            <div className="text-left">
              <CardTitle className="text-xs font-bold">Outstanding Rent List</CardTitle>
            </div>
            <div className="relative w-44">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-6 h-7 rounded-lg text-[10px] py-1"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPendingTenants.length === 0 ? (
              <div className="text-center py-6 px-4">
                <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <h4 className="font-semibold text-xs">All clear!</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  No pending rent payments found.
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[380px] overflow-y-auto">
                {filteredPendingTenants.map((tenant) => {
                  const isPartial = tenant.paymentCategory === 'partial';
                  const remaining = isPartial ? tenant.monthlyRent - (tenant.amountPaid || 0) : tenant.monthlyRent;
                  const dueDay = new Date(tenant.startDate).getDate();
                  
                  const statusColor = 
                    tenant.paymentCategory === 'overdue' ? 'text-rose-500 border-rose-500/20 bg-rose-500/5'
                    : tenant.paymentCategory === 'partial' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                    : 'text-blue-500 border-blue-500/20 bg-blue-500/5';

                  return (
                    <div key={tenant.id} className="flex items-center justify-between p-2.5 hover:bg-muted/10 transition-colors">
                      <div className="text-left space-y-0.5">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          {tenant.name}
                          <Badge variant="outline" className={`text-[8px] font-bold px-1.5 py-0 rounded ${statusColor}`}>
                            {tenant.paymentCategory === 'overdue' ? 'Overdue' 
                             : tenant.paymentCategory === 'partial' ? 'Partial' 
                             : 'Upcoming'}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span className="font-semibold text-foreground">Room {tenant.roomNo}</span>
                          <span>•</span>
                          <span>Due Day: {dueDay}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-black text-xs text-foreground">₹{remaining.toLocaleString()}</span>
                          {isPartial && (
                            <span className="block text-[8px] text-muted-foreground">Paid ₹{tenant.amountPaid}</span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 border-emerald-500/10 rounded-lg shrink-0"
                          onClick={() => handleSendReminder(tenant.name, tenant.phone, remaining, tenant.roomNo)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'occupancy' && (
        <div className="space-y-2.5">
          {Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b).map((floor) => {
            const floorRooms = roomsByFloor[floor];
            const floorBeds = floorRooms.reduce((sum, r) => sum + r.capacity, 0);
            const floorOccupied = floorRooms.reduce((sum, r) => sum + getActiveTenantsInMonth(r).length, 0);
            const floorAvailable = floorBeds - floorOccupied;

            return (
              <Card key={floor} className="border border-border/80 overflow-hidden text-left">
                <CardHeader className="bg-muted/30 p-2.5 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                      <CardTitle className="text-xs font-bold">Floor {floor}</CardTitle>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <span>{floorOccupied}/{floorBeds} Filled</span>
                      <span className="h-2.5 w-[1px] bg-border" />
                      <span className="text-emerald-500 font-semibold">{floorAvailable} Empty</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3">
                    {floorRooms.sort((a,b) => a.roomNo.localeCompare(b.roomNo)).map((room) => {
                      const roomOccupied = getActiveTenantsInMonth(room).length;
                      const isVacant = roomOccupied === 0;
                      const isFull = roomOccupied >= room.capacity;

                      return (
                        <div 
                          key={room.roomNo} 
                          className={`p-2 rounded-lg border flex items-center justify-between gap-1 transition-all ${
                            isVacant 
                              ? 'bg-rose-500/5 border-rose-500/10' 
                              : isFull 
                                ? 'bg-emerald-500/5 border-emerald-500/10' 
                                : 'bg-amber-500/5 border-amber-500/10'
                          }`}
                        >
                          <div className="space-y-0.5 truncate text-left">
                            <span className="text-[11px] font-bold text-foreground">Room {room.roomNo}</span>
                            <p className="text-[8px] text-muted-foreground truncate">{room.capacity} Sharing</p>
                          </div>
                          <span className={`inline-flex rounded px-1 py-0.2 text-[8px] font-extrabold shrink-0 ${
                            isVacant 
                              ? "bg-rose-500/10 text-rose-600"
                              : isFull
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {isVacant ? "Empty" : isFull ? "Full" : `${roomOccupied}/${room.capacity}`}
                          </span>
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
