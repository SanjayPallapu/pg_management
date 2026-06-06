import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DayGuestListItem {
  name: string;
  roomNo: string;
  fromDate: string;
  toDate: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
}

interface DayGuestStats {
  collected: number;
  pending: number;
  count: number;
  upi: number;
  cash: number;
  guests?: DayGuestListItem[];
}

interface DayGuestRevenueCardProps {
  onClick?: () => void;
  stats?: DayGuestStats | null;
  isLoading?: boolean;
}

const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const DayGuestRevenueCard = ({ onClick, stats, isLoading }: DayGuestRevenueCardProps) => {
  // Only show skeleton on initial load when no data exists yet
  if (isLoading && !stats) {
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

  const guests = stats?.guests || [];

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
              ₹{(stats?.collected || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-pending">
              ₹{(stats?.pending || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="flex justify-center gap-4 text-xs border-t pt-2">
          <div className="text-upi">
            <span className="font-medium">UPI:</span> ₹{(stats?.upi || 0).toLocaleString()}
          </div>
          <div className="text-cash">
            <span className="font-medium">Cash:</span> ₹{(stats?.cash || 0).toLocaleString()}
          </div>
        </div>
        <div className="text-xs text-center text-muted-foreground mt-1">
          {stats?.count || 0} guest{(stats?.count || 0) !== 1 ? 's' : ''}
        </div>

        {guests.length > 0 && (
          <div className="mt-3 border-t pt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {guests.map((g, idx) => (
              <div
                key={`${g.name}-${idx}`}
                className="flex items-center justify-between text-xs gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{g.name}</div>
                  <div className="text-muted-foreground text-[10px]">
                    Room {g.roomNo} • {formatShortDate(g.fromDate)} - {formatShortDate(g.toDate)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {g.balance > 0 ? (
                    <div className="text-pending font-semibold">
                      ₹{g.balance.toLocaleString()}
                    </div>
                  ) : (
                    <div className="text-paid font-semibold">Paid</div>
                  )}
                  <div className="text-muted-foreground text-[10px]">
                    of ₹{g.total.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
