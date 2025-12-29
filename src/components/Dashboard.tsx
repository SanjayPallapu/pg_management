import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, CreditCard, AlertTriangle, UserCheck, UserPlus } from 'lucide-react';
import { Room, DashboardStats } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations } from '@/hooks/useRentCalculations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DayGuestSheet } from './DayGuestSheet';
import { SecurityDepositCard } from './SecurityDepositCard';
import { PaymentModeCard } from './PaymentModeCard';
import { isTenantActiveInMonth } from '@/utils/dateOnly';

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
  
  // Count only tenants active in the selected month
  const totalOccupied = rooms.reduce((sum, room) => {
    const activeInMonth = room.tenants.filter(t => 
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
    ).length;
    return sum + activeInMonth;
  }, 0);
  
  const fullyOccupiedRooms = rooms.filter(room => {
    const activeInMonth = room.tenants.filter(t => 
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
    ).length;
    return activeInMonth === room.capacity;
  }).length;
  
  const vacantRooms = rooms.filter(room => {
    const activeInMonth = room.tenants.filter(t => 
      isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
    ).length;
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOccupied}/{totalCapacity}</div>
              <p className="text-xs text-muted-foreground">{stats.totalRooms} rooms across 3 floors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fully Occupied</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.occupiedCount}</div>
              <p className="text-xs text-muted-foreground">
                {((totalOccupied / totalCapacity) * 100).toFixed(1)}% total occupancy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rent Collected</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-paid">₹{stats.rentCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Rent</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-pending">₹{stats.pendingRent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Needs collection
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Cards Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Day Guest Card - Clickable */}
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

          {/* Payment Mode Card */}
          <PaymentModeCard />

          {/* Security Deposit Card */}
          <SecurityDepositCard rooms={rooms} />
        </div>
      </div>

      <DayGuestSheet open={dayGuestSheetOpen} onOpenChange={setDayGuestSheetOpen} />
    </>
  );
};
