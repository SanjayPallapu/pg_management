import { useMemo } from 'react';
import { format, getDay, isSameDay, isWithinInterval } from 'date-fns';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { PaymentEntry } from '@/types';

interface StayPeriodMonthProps {
  monthStart: Date;
  days: Date[];
  highlightStart: Date;
  highlightEnd: Date;
  joinDate: Date;
  leaveDate: Date | null;
  paymentsByDate: Map<string, PaymentEntry[]>;
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
  compact?: boolean;
}

export const StayPeriodMonth = ({
  monthStart,
  days,
  highlightStart,
  highlightEnd,
  joinDate,
  leaveDate,
  paymentsByDate,
  selectedDay,
  onSelectDay,
  compact = false,
}: StayPeriodMonthProps) => {
  const startDayOffset = useMemo(() => getDay(monthStart), [monthStart]);
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getPaymentsForDay = (day: Date): PaymentEntry[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return paymentsByDate.get(dateKey) || [];
  };

  const monthLabel = format(monthStart, 'MMMM yyyy');

  return (
    <div className="space-y-1">
      <div className={cn('text-center text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
        {monthLabel}
      </div>

      <div className={cn('grid grid-cols-7', compact ? 'gap-0.5 text-[8px]' : 'gap-0.5 text-[10px]')}>
        {weekDays.map((day, i) => (
          <div key={`header-${monthLabel}-${i}`} className="text-center text-muted-foreground font-medium py-0.5">
            {day}
          </div>
        ))}

        {Array.from({ length: startDayOffset }).map((_, i) => (
          <div key={`empty-${monthLabel}-${i}`} className="aspect-square" />
        ))}

        {days.map((day) => {
          const isStartDay = isSameDay(day, highlightStart);
          const isJoinDay = isSameDay(day, joinDate);
          const isLeaveDay = !!leaveDate && isSameDay(day, leaveDate);
          const isStayDay = isWithinInterval(day, { start: highlightStart, end: highlightEnd });

          const dayPayments = getPaymentsForDay(day);
          const hasPayment = dayPayments.length > 0;

          const dateKey = format(day, 'yyyy-MM-dd');

          const title =
            isStartDay
              ? `${isJoinDay ? 'Joined' : 'Period Start'}: ${format(day, 'd MMM')}`
              : isLeaveDay
                ? `Left: ${format(day, 'd MMM')}`
                : hasPayment
                  ? `Payment on ${format(day, 'd MMM')} - Click to view`
                  : isStayDay
                    ? 'Stay day'
                    : '';

          const dayContent = (
            <div
              className={cn(
                'aspect-square flex items-center justify-center rounded-sm transition-colors relative',
                isStartDay && 'bg-primary text-primary-foreground font-bold ring-2 ring-primary/50',
                isLeaveDay && !isStartDay && 'bg-destructive text-destructive-foreground font-bold ring-2 ring-destructive/50',
                isStayDay && !isStartDay && !isLeaveDay && 'bg-primary/20 text-primary',
                !isStayDay && 'text-muted-foreground/50',
                hasPayment && 'cursor-pointer hover:ring-2 hover:ring-cash'
              )}
              onClick={() => hasPayment && onSelectDay(day)}
              title={title}
            >
              {format(day, 'd')}
              {hasPayment && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cash" />
              )}
            </div>
          );

          if (!hasPayment) return <div key={dateKey}>{dayContent}</div>;

          return (
            <Popover
              key={dateKey}
              open={!!selectedDay && isSameDay(selectedDay, day)}
              onOpenChange={(open) => !open && onSelectDay(null)}
            >
              <PopoverTrigger asChild>{dayContent}</PopoverTrigger>
              <PopoverContent className="w-auto p-2 text-xs" align="center">
                <div className="font-medium mb-1">{format(day, 'd MMMM yyyy')}</div>
                <div className="space-y-1">
                  {dayPayments.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                          entry.mode === 'upi' ? 'bg-upi/20 text-upi' : 'bg-cash/20 text-cash'
                        )}
                      >
                        {entry.mode}
                      </span>
                      <span className="font-semibold">₹{entry.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
};
