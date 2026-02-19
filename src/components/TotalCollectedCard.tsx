import { Card, CardContent } from '@/components/ui/card';
import { Wallet } from 'lucide-react';
import { Room } from '@/types';
import { useTotalCollected } from '@/hooks/useTotalCollected';

interface TotalCollectedCardProps {
  rooms: Room[];
  rentCollected: number;
}

export const TotalCollectedCard = ({ rooms }: TotalCollectedCardProps) => {
  const {
    totalCollected,
    thisMonthRent,
    overdueCollected,
    dayGuestRevenue,
    securityDeposits,
    extraAmounts,
    totalRefunded,
  } = useTotalCollected(rooms);

  return (
    <Card className="bg-gradient-to-r from-paid/10 to-paid/5 border-paid/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Total Collected</span>
          <Wallet className="h-4 w-4 text-paid" />
        </div>
        <div className="text-2xl font-bold text-paid">₹{totalCollected.toLocaleString()}</div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>This Month Rent</span>
            <span>₹{thisMonthRent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Overdue Collections</span>
            <span>₹{overdueCollected.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Day Guest Revenue</span>
            <span>₹{dayGuestRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Security Deposits</span>
            <div className="flex items-center gap-2">
              <span>₹{securityDeposits.total.toLocaleString()}</span>
              {(securityDeposits.upi > 0 || securityDeposits.cash > 0) && (
                <span className="text-[10px]">
                  (<span className="text-blue-600 dark:text-blue-400">U:{securityDeposits.upi.toLocaleString()}</span>
                  {' / '}
                  <span className="text-green-600 dark:text-green-400">C:{securityDeposits.cash.toLocaleString()}</span>)
                </span>
              )}
            </div>
          </div>
          {extraAmounts > 0 && (
            <div className="flex justify-between">
              <span>Extra Amounts</span>
              <span>₹{extraAmounts.toLocaleString()}</span>
            </div>
          )}
          {totalRefunded > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Refunds Paid</span>
              <span>-₹{totalRefunded.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
