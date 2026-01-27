import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building, CreditCard, AlertTriangle, UserCheck, UserPlus, TrendingUp, UserMinus, ChevronDown, Wallet, Users, Settings } from 'lucide-react';
import { Room, DashboardStats, PaymentEntry } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations } from '@/hooks/useRentCalculations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DayGuestSheet } from './DayGuestSheet';
import { SecurityDepositCard } from './SecurityDepositCard';
import { PaymentModeCard } from './PaymentModeCard';
import { EmptyBedsSheet } from './EmptyBedsSheet';
import { TenantLockCard } from './TenantLockCard';
import { PreviousMonthOverdueCard } from './PreviousMonthOverdueCard';
import { TenantMovementCard } from './TenantMovementCard';
import { TotalCollectedCard } from './TotalCollectedCard';
import { PersonalExpensesCard } from './PersonalExpensesCard';
import { TodaySpendingCard } from './TodaySpendingCard';
import { AllCollectedCard } from './AllCollectedCard';
import { PendingTenantsCard } from './PendingTenantsCard';
import { CalculatorCard } from './CalculatorCard';
import { KeyNumbersCard } from './KeyNumbersCard';
import { BuildingRentCard } from './BuildingRentCard';
import { SettlementSummarySheet } from './SettlementSummarySheet';
import { isTenantActiveInMonth, isTenantActiveNow } from '@/utils/dateOnly';
import { getPricePerBed } from '@/constants/pricing';

interface DashboardProps {
  rooms: Room[];
  onStartRentCycle: () => void;
}

export const Dashboard = ({ rooms }: DashboardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const [dayGuestSheetOpen, setDayGuestSheetOpen] = useState(false);
  const [emptyBedsSheetOpen, setEmptyBedsSheetOpen] = useState(false);
  const [settlementSheetOpen, setSettlementSheetOpen] = useState(false);
  
  // Collapsible section states
  const [financialsOpen, setFinancialsOpen] = useState(true);
  const [tenantsOpen, setTenantsOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  
  const { rentCollected, pendingRent } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  // Fetch day guest stats for selected month
  const { data: dayGuestStats } = useQuery({
    queryKey: ['day-guest-stats', selectedMonth, selectedYear],
    queryFn: async () => {
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);

      const { data, error } = await supabase
        .from('day_guests')
        .select('total_amount, payment_status, amount_paid, payment_entries')
        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching day guest stats:', error);
        return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0 };
      }

      const collected = data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
      const pending = data.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);
      
      // Calculate UPI and Cash totals
      let upi = 0;
      let cash = 0;
      data.forEach(g => {
        const entries = (g.payment_entries as any[]) || [];
        entries.forEach(entry => {
          if (entry.mode === 'upi') {
            upi += entry.amount || 0;
          } else if (entry.mode === 'cash') {
            cash += entry.amount || 0;
          }
        });
      });

      return { collected, pending, count: data.length, upi, cash };
    },
  });

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  
  // Check if viewing current month
  const today = new Date();
  const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();

  const roomStats = rooms.map(room => {
    const activeTenants = room.tenants.filter(t => {
      const activeInSelectedMonth = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
      if (isCurrentMonth) {
        return activeInSelectedMonth && isTenantActiveNow(t.startDate, t.endDate);
      }
      return activeInSelectedMonth;
    });
    const activeCount = activeTenants.length;
    
    // Ensure we don't count more occupied than capacity
    const occupied = Math.min(activeCount, room.capacity);
    const emptyBeds = Math.max(0, room.capacity - occupied);
    const perBedRent = getPricePerBed(room.capacity);
    const potentialAdditionalRent = emptyBeds * perBedRent;
    
    return {
      roomNo: room.roomNo,
      capacity: room.capacity,
      occupied,
      emptyBeds,
      perBedRent,
      potentialAdditionalRent,
      floor: room.floor,
      isFull: occupied === room.capacity,
      isEmpty: occupied === 0,
    };
  });
  
  const totalOccupied = roomStats.reduce((sum, r) => sum + r.occupied, 0);
  const totalEmptyBeds = roomStats.reduce((sum, r) => sum + r.emptyBeds, 0);
  const totalPotentialAdditionalRevenue = roomStats.reduce((sum, r) => sum + r.potentialAdditionalRent, 0);
  const fullyOccupiedRooms = roomStats.filter(r => r.isFull).length;
  const vacantRooms = roomStats.filter(r => r.isEmpty).length;
  
  // Current revenue from present tenants (sum of their monthly rents)
  const currentMonthlyRevenue = rooms.reduce((sum, room) => {
    const activeTenants = room.tenants.filter(t => {
      const activeInSelectedMonth = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
      if (isCurrentMonth) {
        return activeInSelectedMonth && isTenantActiveNow(t.startDate, t.endDate);
      }
      return activeInSelectedMonth;
    });
    return sum + activeTenants.reduce((s, t) => s + t.monthlyRent, 0);
  }, 0);
  
  // Max monthly revenue if all beds filled (using fixed per-bed rates)
  const maxMonthlyRevenue = rooms.reduce((sum, room) => sum + (room.capacity * getPricePerBed(room.capacity)), 0);

  // Calculate total collected (same logic as TotalCollectedCard) for PersonalExpensesCard
  const totalCollectedForExpenses = useMemo(() => {
    // This month rent from payment entries
    let thisMonthRent = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (tenant.isLocked) return;
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return;
        
        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );
        if (payment?.paymentEntries) {
          (payment.paymentEntries as PaymentEntry[]).forEach((entry: PaymentEntry) => {
            thisMonthRent += entry.amount;
          });
        }
      });
    });

    // Overdue collections (previous month payments made in current month)
    let overdueCollected = 0;
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({ ...tenant, roomNo: room.roomNo })));
    const prevMonthActiveTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, prevYear, prevMonth)
    );
    prevMonthActiveTenants.forEach(tenant => {
      if (tenant.isLocked) return;
      const payment = payments.find(p => 
        p.tenantId === tenant.id && p.month === prevMonth && p.year === prevYear
      );
      if (!payment) return;
      const entries = (payment.paymentEntries || []) as PaymentEntry[];
      entries.forEach(entry => {
        const entryDate = new Date(entry.date);
        if (entryDate.getMonth() + 1 === selectedMonth && entryDate.getFullYear() === selectedYear) {
          overdueCollected += entry.amount;
        }
      });
    });

    // Extra amounts from notes
    let extraAmounts = 0;
    const currentMonthTenants = allTenants.filter(tenant => 
      isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)
    );
    currentMonthTenants.forEach(tenant => {
      if (tenant.isLocked) return;
      const payment = payments.find(p => 
        p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
      );
      if (!payment || !payment.notes) return;
      const extraMatch = payment.notes.match(/Extra:\s*₹?([\d,]+)/);
      if (extraMatch) {
        extraAmounts += parseInt(extraMatch[1].replace(/,/g, '')) || 0;
      }
    });

    // Security deposits this month
    let securityDeposits = 0;
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!tenant.securityDepositAmount || !tenant.securityDepositDate) return;
        const depositDate = new Date(tenant.securityDepositDate);
        if (depositDate.getMonth() + 1 === selectedMonth && depositDate.getFullYear() === selectedYear) {
          securityDeposits += tenant.securityDepositAmount;
        }
      });
    });

    return thisMonthRent + overdueCollected + (dayGuestStats?.collected || 0) + securityDeposits + extraAmounts;
  }, [rooms, payments, selectedMonth, selectedYear, dayGuestStats]);

  const stats: DashboardStats = {
    totalRooms: rooms.length,
    occupiedCount: fullyOccupiedRooms,
    vacantCount: vacantRooms,
    rentCollected,
    pendingRent,
  };

  return (
    <>
      <div className="space-y-6">

        {/* Split KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Capacity & Occupancy Split Card */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Left: Capacity */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Capacity</span>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{totalOccupied}/{totalCapacity}</div>
                  <p className="text-xs text-muted-foreground">{stats.totalRooms} rooms across 3 floors</p>
                </div>
                {/* Right: Occupancy */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Occupancy</span>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{stats.occupiedCount} rooms</div>
                  <p className="text-xs text-muted-foreground">
                    {((totalOccupied / totalCapacity) * 100).toFixed(1)}% total occupancy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rent Collected & Pending Split Card */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Left: Collected */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Collected</span>
                    <CreditCard className="h-4 w-4 text-paid" />
                  </div>
                  <div className="text-2xl font-bold text-paid">₹{stats.rentCollected.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
                {/* Right: Pending */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Pending</span>
                    <AlertTriangle className="h-4 w-4 text-pending" />
                  </div>
                  <div className="text-2xl font-bold text-pending">₹{stats.pendingRent.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Needs collection</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Section - Collapsible */}
        <Collapsible open={financialsOpen} onOpenChange={setFinancialsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Financials</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${financialsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {/* Payment Mode Card */}
              <PaymentModeCard rooms={rooms} />

              {/* Total Collected Card */}
              <TotalCollectedCard rooms={rooms} rentCollected={rentCollected} />

              {/* All Collections Card - UPI/Cash breakdown */}
              <AllCollectedCard rooms={rooms} />

              {/* Potential Revenue Card - Clickable */}
              <Card 
                className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 cursor-pointer transition-all hover:shadow-md"
                onClick={() => setEmptyBedsSheetOpen(true)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">If PG Gets Full</span>
                    </div>
                  </div>
                  
                  {/* Current vs Max revenue comparison */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <div className="text-lg font-bold text-paid">₹{currentMonthlyRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">{totalOccupied} tenants now</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">₹{maxMonthlyRevenue.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Max capacity</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-sm font-semibold text-pending">
                      +₹{Math.round(maxMonthlyRevenue - currentMonthlyRevenue).toLocaleString()} possible
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {totalEmptyBeds} beds empty
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">Tap to view breakdown</p>
                </CardContent>
              </Card>

              {/* Today's Spending Card - Above PG Expenses */}
              <TodaySpendingCard />

              {/* Personal Expenses Card */}
              <PersonalExpensesCard totalCollected={totalCollectedForExpenses} />

              {/* Security Deposit Card - Below PG Expenses */}
              <SecurityDepositCard rooms={rooms} />

              {/* Previous Month Overdue Card */}
              <PreviousMonthOverdueCard />

              {/* Building Rent Card */}
              <BuildingRentCard />

              {/* Day Guest Card */}
              <Card 
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setDayGuestSheetOpen(true)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                  <CardTitle className="text-sm font-medium">Day Guest Revenue</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-2xl font-bold text-paid">
                        ₹{(dayGuestStats?.collected || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Collected</p>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-pending">
                        ₹{(dayGuestStats?.pending || 0).toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  {/* UPI/Cash breakdown */}
                  <div className="flex justify-center gap-4 text-xs border-t pt-2">
                    <div className="text-blue-600 dark:text-blue-400">
                      UPI: ₹{(dayGuestStats?.upi || 0).toLocaleString()}
                    </div>
                    <div className="text-green-600 dark:text-green-400">
                      Cash: ₹{(dayGuestStats?.cash || 0).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">Tap to view details</p>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Tenants Section - Collapsible */}
        <Collapsible open={tenantsOpen} onOpenChange={setTenantsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Tenants</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${tenantsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {/* Pending Tenants Card */}
              <PendingTenantsCard rooms={rooms} />

              {/* Tenant Movement Card */}
              <TenantMovementCard rooms={rooms} />

              {/* Settlement Summary Card */}
              <Card 
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setSettlementSheetOpen(true)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Left Tenants</span>
                    <UserMinus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">Settlement Summary</div>
                  <p className="text-xs text-muted-foreground">View pro-rata calculations for departed tenants</p>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Tools Section - Collapsible (collapsed by default) */}
        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Tools & Admin</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${toolsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Calculator Card */}
              <CalculatorCard />

              {/* Key Numbers Card */}
              <KeyNumbersCard />

              {/* Tenant Lock Card */}
              <TenantLockCard rooms={rooms} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <DayGuestSheet open={dayGuestSheetOpen} onOpenChange={setDayGuestSheetOpen} />
      <EmptyBedsSheet 
        open={emptyBedsSheetOpen} 
        onOpenChange={setEmptyBedsSheetOpen}
        roomStats={roomStats}
        totalEmptyBeds={totalEmptyBeds}
        totalPotentialRevenue={totalPotentialAdditionalRevenue}
      />
      <SettlementSummarySheet
        open={settlementSheetOpen}
        onOpenChange={setSettlementSheetOpen}
        rooms={rooms}
      />
    </>
  );
};
