import { useMemo, useState, useEffect } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isSameDay, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { PaymentEntry } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';

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
  allowCustomStart?: boolean;
  onCustomStartChange?: (customStart: string | null, recalculatedDays: number) => void;
}

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
  allowCustomStart = false,
  onCustomStartChange,
}: StayPeriodIndicatorProps) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Use custom start date if set, otherwise use the original startDate
  const activeStartDate = customStartDate ? format(customStartDate, 'yyyy-MM-dd') : startDate;

  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const joinDate = parseISO(activeStartDate);
    const leaveDate = endDate ? parseISO(endDate) : null;
    
    // Check if join date falls within this month
    const isJoinInThisMonth = joinDate >= monthStart && joinDate <= monthEnd;
    
    // Check if leave date falls within this month
    const isLeaveInThisMonth = leaveDate && leaveDate >= monthStart && leaveDate <= monthEnd;
    
    // The ACTUAL start day for highlighting - use join date if in this month
    // For cross-month stays (joined last month, leaving this month), start from 1st
    const effectiveStart = isJoinInThisMonth ? joinDate : monthStart;
    
    // The end day for highlighting - use leave date if in this month, else month end
    const effectiveEnd = isLeaveInThisMonth ? leaveDate : monthEnd;
    
    // Display start is same as effective start for highlighting purposes
    const displayStartDay = effectiveStart;
    
    // Get weekday offset for first day of month (0 = Sunday)
    const startDayOffset = getDay(monthStart);
    
    // Map payment entries to dates
    const paymentsByDate = new Map<string, PaymentEntry[]>();
    paymentEntries.forEach(entry => {
      const dateKey = format(parseISO(entry.date), 'yyyy-MM-dd');
      if (!paymentsByDate.has(dateKey)) {
        paymentsByDate.set(dateKey, []);
      }
      paymentsByDate.get(dateKey)!.push(entry);
    });

    // Calculate days stayed based on effective dates
    const calculatedDays = differenceInDays(effectiveEnd, effectiveStart) + 1;
    
    return {
      days,
      joinDate,
      leaveDate,
      effectiveStart,
      effectiveEnd,
      displayStartDay,
      isJoinInThisMonth,
      isLeaveInThisMonth,
      startDayOffset,
      monthName: format(monthStart, 'MMMM yyyy'),
      paymentsByDate,
      calculatedDays,
    };
  }, [activeStartDate, endDate, year, month, paymentEntries]);

  const { days, leaveDate, effectiveStart, effectiveEnd, displayStartDay, isJoinInThisMonth, isLeaveInThisMonth, startDayOffset, monthName, paymentsByDate, calculatedDays } = calendarData;
  
  // Notify parent of custom start changes
  useEffect(() => {
    if (customStartDate && onCustomStartChange) {
      onCustomStartChange(format(customStartDate, 'yyyy-MM-dd'), calculatedDays);
    }
  }, [customStartDate, calculatedDays, onCustomStartChange]);

  const handleResetCustomStart = () => {
    setCustomStartDate(null);
    if (onCustomStartChange) {
      onCustomStartChange(null, daysStayed || 0);
    }
  };
  
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getPaymentsForDay = (day: Date): PaymentEntry[] => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return paymentsByDate.get(dateKey) || [];
  };

  // Calculate displayed values (use custom if set)
  const displayDays = customStartDate ? calculatedDays : daysStayed;
  const displayRent = customStartDate && dailyRate ? calculatedDays * dailyRate : effectiveRent;

  return (
    <div className={cn("bg-muted/30 rounded-lg space-y-2", compact ? "p-2" : "p-3")}>
      <div className={cn("font-medium text-muted-foreground text-center", compact ? "text-[10px]" : "text-xs")}>
        Stay Period • {monthName}
      </div>
      
      {/* Mini calendar grid */}
      <div className={cn("grid grid-cols-7", compact ? "gap-0.5 text-[8px]" : "gap-0.5 text-[10px]")}>
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
          const isStartDay = isSameDay(day, displayStartDay);
          const isLeaveDay = leaveDate && isSameDay(day, leaveDate);
          const isStayDay = isWithinInterval(day, { start: effectiveStart, end: effectiveEnd });
          const dayPayments = getPaymentsForDay(day);
          const hasPayment = dayPayments.length > 0;
          
          const dayContent = (
            <div
              className={cn(
                "aspect-square flex items-center justify-center rounded-sm transition-colors relative",
                isStartDay && "bg-primary text-primary-foreground font-bold ring-2 ring-primary/50",
                isLeaveDay && !isStartDay && "bg-destructive text-destructive-foreground font-bold ring-2 ring-destructive/50",
                isStayDay && !isStartDay && !isLeaveDay && "bg-primary/20 text-primary",
                !isStayDay && "text-muted-foreground/50",
                hasPayment && "cursor-pointer hover:ring-2 hover:ring-cash"
              )}
              onClick={() => hasPayment && setSelectedDay(day)}
              title={
                isStartDay ? `${isJoinInThisMonth ? 'Joined' : 'Period Start'}: ${format(day, 'd MMM')}` :
                isLeaveDay ? `Left: ${format(day, 'd MMM')}` :
                hasPayment ? `Payment on ${format(day, 'd MMM')} - Click to view` :
                isStayDay ? 'Stay day' : ''
              }
            >
              {format(day, 'd')}
              {hasPayment && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cash" />
              )}
            </div>
          );

          if (hasPayment) {
            return (
              <Popover key={day.toISOString()} open={selectedDay && isSameDay(selectedDay, day)} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <PopoverTrigger asChild>
                  {dayContent}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 text-xs" align="center">
                  <div className="font-medium mb-1">{format(day, 'd MMMM yyyy')}</div>
                  <div className="space-y-1">
                    {dayPayments.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                          entry.mode === 'upi' ? "bg-upi/20 text-upi" : "bg-cash/20 text-cash"
                        )}>
                          {entry.mode}
                        </span>
                        <span className="font-semibold">₹{entry.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            );
          }
          
          return <div key={day.toISOString()}>{dayContent}</div>;
        })}
      </div>
      
      {/* Custom Start Date Selector */}
      {allowCustomStart && !compact && (
        <div className="flex items-center justify-center gap-2 pt-1 border-t border-border/50">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {customStartDate ? format(customStartDate, 'd MMM') : 'Custom Start'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={customStartDate || undefined}
                onSelect={(date) => {
                  setCustomStartDate(date || null);
                  setIsCalendarOpen(false);
                }}
                defaultMonth={new Date(year, month - 1)}
                disabled={(date) => {
                  // Disable dates after leave date or after current month
                  const monthEnd = endOfMonth(new Date(year, month - 1));
                  const monthStart = startOfMonth(new Date(year, month - 1));
                  if (date > monthEnd || date < monthStart) return true;
                  if (leaveDate && date > leaveDate) return true;
                  return false;
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {customStartDate && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs text-muted-foreground"
              onClick={handleResetCustomStart}
            >
              Reset
            </Button>
          )}
        </div>
      )}
      
      {/* Legend */}
      <div className={cn("flex items-center justify-center gap-3 pt-1 border-t border-border/50", compact ? "text-[8px]" : "text-[10px]")}>
        <div className="flex items-center gap-1">
          <div className={cn("rounded-sm bg-primary", compact ? "w-2 h-2" : "w-3 h-3")} />
          <span className="text-muted-foreground">{customStartDate ? 'Custom' : (isJoinInThisMonth ? 'Join' : 'Start')}</span>
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
      {displayDays && dailyRate && displayRent && (
        <div className={cn("text-center text-muted-foreground pt-1 border-t border-border/50", compact ? "text-[10px]" : "text-xs")}>
          <span className="font-medium text-foreground">{displayDays} days</span> × ₹{dailyRate.toLocaleString()}/day = <span className="font-semibold text-primary">₹{displayRent.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};
