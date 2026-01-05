import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, UserMinus } from 'lucide-react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useMemo } from 'react';

interface TenantMovementCardProps {
  rooms: Room[];
}

export const TenantMovementCard = ({ rooms }: TenantMovementCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();

  const { joined, left } = useMemo(() => {
    let joinedCount = 0;
    let leftCount = 0;

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        const startDate = new Date(tenant.startDate);
        const startMonth = startDate.getMonth() + 1;
        const startYear = startDate.getFullYear();

        if (startMonth === selectedMonth && startYear === selectedYear) {
          joinedCount++;
        }

        if (tenant.endDate) {
          const endDate = new Date(tenant.endDate);
          const endMonth = endDate.getMonth() + 1;
          const endYear = endDate.getFullYear();

          if (endMonth === selectedMonth && endYear === selectedYear) {
            leftCount++;
          }
        }
      });
    });

    return { joined: joinedCount, left: leftCount };
  }, [rooms, selectedMonth, selectedYear]);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Joined</span>
              <UserPlus className="h-4 w-4 text-paid" />
            </div>
            <div className="text-2xl font-bold text-paid">{joined}</div>
            <p className="text-xs text-muted-foreground">New tenants this month</p>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Left</span>
              <UserMinus className="h-4 w-4 text-pending" />
            </div>
            <div className="text-2xl font-bold text-pending">{left}</div>
            <p className="text-xs text-muted-foreground">Tenants left this month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
