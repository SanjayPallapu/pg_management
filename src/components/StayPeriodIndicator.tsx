import { useMemo } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface StayPeriodIndicatorProps {
  startDate: string;
  endDate?: string;
  year: number;
  month: number; // 1-12
  daysStayed?: number;
  dailyRate?: number;
  effectiveRent?: number;
}

export const StayPeriodIndicator = ({
  startDate,
  endDate,
  year,
  month,
  daysStayed,
  dailyRate,
  effectiveRent,
}: StayPeriodIndicatorProps) => {
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const joinDate = parseISO(startDate);
    const leaveDate = endDate ? parseISO(endDate) : null;
    
    // Calculate effective stay period within this month
    const effectiveStart = joinDate > monthStart ? joinDate : monthStart;
    const effectiveEnd = leaveDate && leaveDate < monthEnd ? leaveDate : monthEnd;
    
    // Get weekday offset for first day of month (0 = Sunday)
    const startDayOffset = getDay(monthStart);
    
    return {
      days,
      joinDate,
      leaveDate,
      effectiveStart,
      effectiveEnd,
      startDayOffset,
      monthName: format(monthStart, 'MMMM yyyy'),
    };
  }, [startDate, endDate, year, month]);

  const { days, joinDate, leaveDate, effectiveStart, effectiveEnd, startDayOffset, monthName } = calendarData;
  
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
      <div className="text-xs font-medium text-muted-foreground text-center">
        Stay Period • {monthName}
      </div>
      
      {/* Mini calendar grid */}
      <div className="grid grid-cols-7 gap-0.5 text-[10px]">
        {/* Weekday headers */}
        {weekDays.map((day, i) => (
          <div key={`header-${i}`} className="text-center text-muted-foreground font-medium py-0.5">
            {day}
          </div>
        ))}
        
        {/* Empty cells for offset */}
        {Array.from({ length: startDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {/* Day cells */}
        {days.map((day) => {
          const isJoinDay = isSameDay(day, joinDate);
          const isLeaveDay = leaveDate && isSameDay(day, leaveDate);
          const isStayDay = isWithinInterval(day, { start: effectiveStart, end: effectiveEnd });
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "aspect-square flex items-center justify-center rounded-sm transition-colors",
                isJoinDay && "bg-primary text-primary-foreground font-bold ring-2 ring-primary/50",
                isLeaveDay && "bg-destructive text-destructive-foreground font-bold ring-2 ring-destructive/50",
                isStayDay && !isJoinDay && !isLeaveDay && "bg-primary/20 text-primary",
                !isStayDay && "text-muted-foreground/50"
              )}
              title={
                isJoinDay ? `Joined: ${format(day, 'd MMM')}` :
                isLeaveDay ? `Left: ${format(day, 'd MMM')}` :
                isStayDay ? 'Stay day' : ''
              }
            >
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-3 text-[10px] pt-1 border-t border-border/50">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Join</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary/20" />
          <span className="text-muted-foreground">Stay</span>
        </div>
        {leaveDate && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-destructive" />
            <span className="text-muted-foreground">Leave</span>
          </div>
        )}
      </div>
      
      {/* Pro-rata summary */}
      {daysStayed && dailyRate && effectiveRent && (
        <div className="text-xs text-center text-muted-foreground pt-1 border-t border-border/50">
          <span className="font-medium text-foreground">{daysStayed} days</span> × ₹{dailyRate.toLocaleString()}/day = <span className="font-semibold text-primary">₹{effectiveRent.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
