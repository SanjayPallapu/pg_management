import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, CreditCard, AlertTriangle, UserCheck, UserPlus, TrendingUp } from 'lucide-react';
import { Room, DashboardStats } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations } from '@/hooks/useRentCalculations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DayGuestSheet } from './DayGuestSheet';
import { SecurityDepositCard } from './SecurityDepositCard';
import { PaymentModeCard } from './PaymentModeCard';
import { isTenantActiveInMonth, isTenantActiveNow } from '@/utils/dateOnly';

interface DashboardProps {
  rooms: Room[];
  onStartRentCycle: () => void;
}

export const Dashboard = ({ rooms }: DashboardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const [dayGuestSheetOpen, setDayGuestSheetOpen] = useState(false);
  
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
        .select('total_amount, payment_status, amount_paid')

        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching day guest stats:', error);
        return { collected: 0, pending: 0, count: 0 };
      }

      const collected = data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
 
      const pending = data.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);


      return { collected, pending, count: data.length };
    },
  });

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  
  // Calculate potential revenue if PG is fully occupied
  // Each bed pays (room rent / capacity) per month
  const potentialRevenue = rooms.reduce((sum, room) => {
    const perBedRent = room.rentAmount / room.capacity;
    return sum + (perBedRent * room.capacity);
  }, 0);
  
  // This simplifies to total of all room rents when fully occupied
  const maxMonthlyRevenue = rooms.reduce((sum, room) => sum + room.rentAmount, 0);
  
  // Check if viewing current month
  const today = new Date();
  const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear();
  
  // Count only tenants active in the selected month (and still active today if current month)
  const totalOccupied = rooms.reduce((sum, room) => {
    const activeInMonth = room.tenants.filter(t => {
      const activeInSelectedMonth = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
      // For current month, also check if tenant is still active today
      if (isCurrentMonth) {
        return activeInSelectedMonth && isTenantActiveNow(t.startDate, t.endDate);
      }
      return activeInSelectedMonth;
    }).length;
    return sum + activeInMonth;
  }, 0);
  
  const fullyOccupiedRooms = rooms.filter(room => {
    const activeInMonth = room.tenants.filter(t => {
      const activeInSelectedMonth = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
      if (isCurrentMonth) {
        return activeInSelectedMonth && isTenantActiveNow(t.startDate, t.endDate);
      }
      return activeInSelectedMonth;
    }).length;
    return activeInMonth === room.capacity;
  }).length;
  
  const vacantRooms = rooms.filter(room => {
    const activeInMonth = room.tenants.filter(t => {
      const activeInSelectedMonth = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
      if (isCurrentMonth) {
        return activeInSelectedMonth && isTenantActiveNow(t.startDate, t.endDate);
      }
      return activeInSelectedMonth;
    }).length;
    return activeInMonth === 0;
  }).length;

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

        {/* Potential Revenue Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">If PG Gets Full</span>
                </div>
                <div className="text-2xl font-bold text-primary">₹{maxMonthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {totalCapacity} beds × ₹{Math.round(maxMonthlyRevenue / totalCapacity).toLocaleString()}/bed avg
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-paid">
                  +₹{(maxMonthlyRevenue - stats.rentCollected - stats.pendingRent).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">More possible</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Cards Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Payment Mode Card - Now first */}
          <PaymentModeCard />

          {/* Day Guest Card - Clickable - Now second */}
          <Card 
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => setDayGuestSheetOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Day Guest Revenue</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
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
              <p className="text-xs text-muted-foreground mt-2 text-center">Tap to view details</p>
            </CardContent>
          </Card>

          {/* Security Deposit Card */}
          <SecurityDepositCard rooms={rooms} />
        </div>
      </div>

      <DayGuestSheet open={dayGuestSheetOpen} onOpenChange={setDayGuestSheetOpen} />
    </>
  );
};
