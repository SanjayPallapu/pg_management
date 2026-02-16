import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { usePG } from '@/contexts/PGContext';
import { useMonthContext } from '@/contexts/MonthContext';

interface DayGuestRevenueCardProps {
  onClick?: () => void;
}

export const DayGuestRevenueCard = ({ onClick }: DayGuestRevenueCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();

  const { data: dayGuestStats, isLoading } = useQuery({
    queryKey: ['day-guest-revenue', selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0 };

      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);

      const { data, error } = await supabase
        .from('day_guests')
        .select('total_amount, payment_status, amount_paid, payment_entries, rooms!inner(pg_id)')
        .eq('rooms.pg_id', currentPG.id)
        .gte('from_date', startOfMonth.toISOString().split('T')[0])
        .lte('from_date', endOfMonth.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching day guest stats:', error);
        return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0 };
      }

      const collected = data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
      const pending = data.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);
      
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
    enabled: !!currentPG?.id,
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev ?? { collected: 0, pending: 0, count: 0, upi: 0, cash: 0 },
  });

  const showSkeleton = isLoading && !dayGuestStats;

  if (showSkeleton) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium">Day Guest Revenue</CardTitle>
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-14 mt-1" />
            </div>
            <div>
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-14 mt-1" />
            </div>
          </div>
          <div className="flex justify-center gap-4 text-xs border-t pt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
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
          <div className="text-upi">
            <span className="font-medium">UPI:</span> ₹{(dayGuestStats?.upi || 0).toLocaleString()}
          </div>
          <div className="text-cash">
            <span className="font-medium">Cash:</span> ₹{(dayGuestStats?.cash || 0).toLocaleString()}
          </div>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-1">
          {dayGuestStats?.count || 0} guest{(dayGuestStats?.count || 0) !== 1 ? 's' : ''}
        </div>
      </CardContent>
    </Card>
  );
};
