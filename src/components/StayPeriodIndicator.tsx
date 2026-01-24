import { useMemo, useState } from 'react';
import { parseISO, startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { PaymentEntry } from '@/types';
import { StayPeriodMonth } from './stay-period/StayPeriodMonth';

interface StayPeriodIndicatorProps {
  startDate: string;
  endDate?: string;
  year: number;
  month: number; // 1-12
  daysStayed?: number;
  dailyRate?: number;
  effectiveRent?: number;
  paymentEntries?: PaymentEntry[];
  compact?: boolean;
}

// Helper to clamp day to valid range for a month
const makeClampedDate = (year: number, monthIndex: number, day: number) => {
  const targetMonth = new Date(year, monthIndex, 1).getMonth();
  const d = new Date(year, monthIndex, day);
  if (d.getMonth() !== targetMonth) {
    return new Date(year, monthIndex + 1, 0); // last day of target month
  }
  return d;
};

// Get billing cycle anchored to join day
const getBillingCycle = (joinDate: Date, year: number, month: number) => {
  const joinDay = joinDate.getDate();
  const joinedThisMonth = joinDate.getFullYear() === year && joinDate.getMonth() + 1 === month;

  if (joinDay === 1) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  }

  const start = joinedThisMonth
    ? new Date(joinDate)
    : makeClampedDate(year, month - 2, joinDay);

  const nextCycleStart = makeClampedDate(year, joinedThisMonth ? month : month - 1, joinDay);
  const end = new Date(nextCycleStart);
  end.setDate(end.getDate() - 1);

  return { start, end };
};

export const StayPeriodIndicator = ({
  startDate,
  endDate,
  year,
  month,
  daysStayed,
  dailyRate,
  effectiveRent,
  paymentEntries = [],
  compact = false,
}: StayPeriodIndicatorProps) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const calendarData = useMemo(() => {
    const joinDate = parseISO(startDate);
    const leaveDate = endDate ? parseISO(endDate) : null;

    // Get billing cycle for this month
    const { start: cycleStart, end: cycleEnd } = getBillingCycle(joinDate, year, month);

    // Determine actual highlight range
    // Start: max of (joinDate, cycleStart)
    const highlightStart = isAfter(joinDate, cycleStart) ? joinDate : cycleStart;
    // End: min of (leaveDate or cycleEnd, cycleEnd)
    const highlightEnd = leaveDate && isBefore(leaveDate, cycleEnd) ? leaveDate : cycleEnd;

    // Generate list of months to display
    const monthsToRender: Date[] = [];
    let current = startOfMonth(cycleStart);
    const lastMonth = startOfMonth(cycleEnd);
    
    while (current <= lastMonth) {
      monthsToRender.push(current);
      current = addMonths(current, 1);
    }

    // Build payment map
    const paymentsByDate = new Map<string, PaymentEntry[]>();
    paymentEntries.forEach(entry => {
      const dateKey = format(parseISO(entry.date), 'yyyy-MM-dd');
      if (!paymentsByDate.has(dateKey)) {
        paymentsByDate.set(dateKey, []);
      }
      paymentsByDate.get(dateKey)!.push(entry);
    });

    return {
      joinDate,
      leaveDate,
      highlightStart,
      highlightEnd,
      monthsToRender,
      paymentsByDate,
    };
  }, [startDate, endDate, year, month, paymentEntries]);

  const { joinDate, leaveDate, highlightStart, highlightEnd, monthsToRender, paymentsByDate } = calendarData;

  return (
    <div className={cn("bg-muted/30 rounded-lg space-y-2", compact ? "p-2" : "p-3")}>
      <div className={cn("font-medium text-muted-foreground text-center", compact ? "text-[10px]" : "text-xs")}>
        Stay Period • {format(highlightStart, 'd MMM')} – {format(highlightEnd, 'd MMM yyyy')}
      </div>
      
      {/* Multi-month calendar grid */}
      <div className={cn(
        "grid gap-3",
        monthsToRender.length === 1 ? "grid-cols-1" : "grid-cols-2"
      )}>
        {monthsToRender.map((monthStart) => {
          const monthEnd = endOfMonth(monthStart);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

          return (
            <StayPeriodMonth
              key={format(monthStart, 'yyyy-MM')}
              monthStart={monthStart}
              days={days}
              highlightStart={highlightStart}
              highlightEnd={highlightEnd}
              joinDate={joinDate}
              leaveDate={leaveDate}
              paymentsByDate={paymentsByDate}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              compact={compact}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className={cn("flex items-center justify-center gap-3 pt-1 border-t border-border/50", compact ? "text-[8px]" : "text-[10px]")}>
        <div className="flex items-center gap-1">
          <div className={cn("rounded-sm bg-primary", compact ? "w-2 h-2" : "w-3 h-3")} />
          <span className="text-muted-foreground">Join</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn("rounded-sm bg-primary/20", compact ? "w-2 h-2" : "w-3 h-3")} />
          <span className="text-muted-foreground">Stay</span>
        </div>
        {leaveDate && (
          <div className="flex items-center gap-1">
            <div className={cn("rounded-sm bg-destructive", compact ? "w-2 h-2" : "w-3 h-3")} />
            <span className="text-muted-foreground">Leave</span>
          </div>
        )}
        {paymentEntries.length > 0 && (
          <div className="flex items-center gap-1">
            <div className={cn("rounded-full bg-cash", compact ? "w-1.5 h-1.5" : "w-2 h-2")} />
            <span className="text-muted-foreground">Payment</span>
          </div>
        )}
      </div>
      
      {/* Pro-rata summary */}
      {daysStayed && dailyRate && effectiveRent && (
        <div className={cn("text-center text-muted-foreground pt-1 border-t border-border/50", compact ? "text-[10px]" : "text-xs")}>
          <span className="font-medium text-foreground">{daysStayed} days</span> × ₹{dailyRate.toLocaleString()}/day = <span className="font-semibold text-primary">₹{effectiveRent.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};