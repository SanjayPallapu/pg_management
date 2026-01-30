import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuditLog } from '@/hooks/useAuditLog';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, Loader2, Search, X, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
interface AuditHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'create':
      return <Plus className="h-3 w-3" />;
    case 'update':
      return <Pencil className="h-3 w-3" />;
    case 'delete':
      return <Trash2 className="h-3 w-3" />;
    default:
      return null;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'create':
      return 'bg-green-500/20 text-green-700 dark:text-green-400';
    case 'update':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
    case 'delete':
      return 'bg-red-500/20 text-red-700 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getTableLabel = (tableName: string) => {
  switch (tableName) {
    case 'tenants':
      return 'Tenant';
    case 'rooms':
      return 'Room';
    case 'tenant_payments':
      return 'Payment';
    case 'day_guests':
      return 'Day Guest';
    default:
      return tableName;
  }
};

const formatChanges = (changes: Record<string, { old: unknown; new: unknown }> | null) => {
  if (!changes) return null;
  
  return Object.entries(changes).map(([key, value]) => {
    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return (
      <div key={key} className="text-xs text-muted-foreground ml-4">
        <span className="font-medium">{formattedKey}:</span>{' '}
        <span className="text-pending line-through">{String(value.old ?? 'null')}</span>
        {' → '}
        <span className="text-paid">{String(value.new ?? 'null')}</span>
      </div>
    );
  });
};

// Helper to parse discount and extra from notes
const parseNotesInfo = (notes?: string) => {
  if (!notes) return { discount: 0, extra: 0, extraReason: '' };
  
  const discountMatch = notes.match(/Discount:\s*₹?(\d+)/i);
  const extraMatch = notes.match(/Extra\s*₹?(\d+):\s*([^|]+)/i);
  
  return {
    discount: discountMatch ? parseInt(discountMatch[1]) : 0,
    extra: extraMatch ? parseInt(extraMatch[1]) : 0,
    extraReason: extraMatch ? extraMatch[2].trim() : ''
  };
};

const formatNewData = (newData: Record<string, unknown> | null, tableName: string, action: string, recordName?: string) => {
  if (!newData) return null;
  
  // Generate a descriptive paragraph
  const generateDescription = () => {
    const tenantName = recordName?.split(' - ')[0] || 'Unknown';
    
    if (tableName === 'tenant_payments') {
      const { amount, mode, type, status, totalPaid, date, isPreviousMonth, notes } = newData as any;
      const modeText = mode === 'upi' ? 'UPI' : 'Cash';
      const { discount, extra, extraReason } = parseNotesInfo(notes);
      
      let description = '';
      if (action === 'create') {
        description = `Recorded payment of ₹${Number(amount).toLocaleString()} via ${modeText} for ${tenantName}. Status: ${status}.`;
      } else if (action === 'update') {
        description = `Updated payment for ${tenantName}. Amount: ₹${Number(amount).toLocaleString()} via ${modeText}. Total paid: ₹${Number(totalPaid).toLocaleString()}. Status: ${status}.`;
      }
      
      // Add previous month indicator
      if (isPreviousMonth) {
        description += ' (Previous Month)';
      }
      
      return description;
    }
    
    if (tableName === 'tenants') {
      const { monthly_rent, room_no, start_date, end_date, is_locked, security_deposit_amount } = newData as any;
      
      if (action === 'create') {
        return `Added new tenant ${tenantName} to Room ${room_no}. Rent: ₹${Number(monthly_rent).toLocaleString()}/month.`;
      } else if (action === 'update') {
        if (end_date) {
          return `Marked ${tenantName} as left. End date: ${end_date}.`;
        }
        if (is_locked !== undefined) {
          return `${is_locked ? 'Locked' : 'Unlocked'} tenant ${tenantName}. They will ${is_locked ? 'be excluded from' : 'be included in'} financial calculations.`;
        }
        if (security_deposit_amount) {
          return `Updated security deposit for ${tenantName} to ₹${Number(security_deposit_amount).toLocaleString()}.`;
        }
        return `Updated tenant ${tenantName}'s details.`;
      } else if (action === 'delete') {
        return `Removed tenant ${tenantName} from the system.`;
      }
    }
    
    return null;
  };
  
  const description = generateDescription();
  
  if (tableName === 'tenant_payments') {
    const { amount, mode, type, status, totalPaid, date, isPreviousMonth, notes } = newData as { 
      amount?: number; mode?: string; type?: string; status?: string; 
      totalPaid?: number; date?: string; isPreviousMonth?: boolean; notes?: string;
    };
    
    const { discount, extra, extraReason } = parseNotesInfo(notes);
    
    return (
      <div className="text-xs text-muted-foreground ml-4 space-y-1">
        {description && (
          <p className="text-foreground italic mb-2">{description}</p>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {date && (
            <div>
              <span className="font-medium">Payment Date:</span>{' '}
              <span className="text-foreground">{format(parseISO(date), 'dd MMM yyyy')}</span>
            </div>
          )}
          {amount !== undefined && (
            <div>
              <span className="font-medium">Amount:</span>{' '}
              <span className="text-paid">₹{Number(amount).toLocaleString()}</span>
              {type && <span className="ml-1">({type})</span>}
            </div>
          )}
          {mode && (
            <div>
              <span className="font-medium">Mode:</span>{' '}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                mode === 'upi' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {mode === 'upi' ? 'UPI' : 'Cash'}
              </span>
            </div>
          )}
          {totalPaid !== undefined && (
            <div>
              <span className="font-medium">Total Paid:</span>{' '}
              <span className="text-paid">₹{Number(totalPaid).toLocaleString()}</span>
            </div>
          )}
          {status && (
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className={status === 'Paid' ? 'text-paid' : status === 'Partial' ? 'text-partial' : 'text-pending'}>
                {status}
              </span>
            </div>
          )}
        </div>
        {/* Show previous month, discount, and extra indicators */}
        <div className="flex flex-wrap gap-2 mt-2">
          {isPreviousMonth && (
            <Badge variant="outline" className="text-[10px] bg-pending/20 text-pending border-pending/30">
              Previous Month
            </Badge>
          )}
          {discount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary border-primary/30">
              Discount: ₹{discount.toLocaleString()}
            </Badge>
          )}
          {extra > 0 && (
            <Badge variant="outline" className="text-[10px] bg-upi/20 text-upi border-upi/30">
              Extra: ₹{extra.toLocaleString()}{extraReason ? ` (${extraReason})` : ''}
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  // For tenants - show more details
  if (tableName === 'tenants') {
    const { monthly_rent, room_no, start_date, end_date, phone, is_locked, security_deposit_amount } = newData as any;
    
    return (
      <div className="text-xs text-muted-foreground ml-4 space-y-1">
        {description && (
          <p className="text-foreground italic mb-2">{description}</p>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {monthly_rent !== undefined && (
            <div><span className="font-medium">Rent:</span> ₹{Number(monthly_rent).toLocaleString()}</div>
          )}
          {room_no && (
            <div><span className="font-medium">Room:</span> {room_no}</div>
          )}
          {start_date && (
            <div><span className="font-medium">Start:</span> {start_date}</div>
          )}
          {end_date && (
            <div><span className="font-medium">End:</span> {end_date}</div>
          )}
          {is_locked !== undefined && (
            <div><span className="font-medium">Locked:</span> {is_locked ? '🔒 Yes' : 'No'}</div>
          )}
          {security_deposit_amount !== undefined && security_deposit_amount > 0 && (
            <div><span className="font-medium">Deposit:</span> ₹{Number(security_deposit_amount).toLocaleString()}</div>
          )}
        </div>
      </div>
    );
  }
  
  return null;
};

type DateRangeOption = 'all' | 'today' | 'week' | 'month' | 'custom';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}
export const AuditHistorySheet = ({ open, onOpenChange }: AuditHistorySheetProps) => {
  const { logs, isLoading } = useAuditLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter - by tenant name/record name
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = log.recordName?.toLowerCase().includes(query);
        if (!matchesName) return false;
      }

      // Action filter
      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== 'all') {
        const logDate = new Date(log.createdAt);
        const now = new Date();
        
        let start: Date;
        let end: Date = endOfDay(now);
        
        switch (dateRange) {
          case 'today':
            start = startOfDay(now);
            break;
          case 'week':
            start = startOfDay(subDays(now, 7));
            break;
          case 'month':
            start = startOfDay(subMonths(now, 1));
            break;
          case 'custom':
            if (!customDateRange.from) return true;
            start = startOfDay(customDateRange.from);
            end = customDateRange.to ? endOfDay(customDateRange.to) : endOfDay(customDateRange.from);
            break;
          default:
            start = new Date(0);
        }

        if (!isWithinInterval(logDate, { start, end })) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter, dateRange, customDateRange]);

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const date = format(new Date(log.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, typeof logs>);

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setDateRange('all');
    setCustomDateRange({ from: undefined, to: undefined });
  };

  const hasFilters = searchQuery || actionFilter !== 'all' || dateRange !== 'all';

  const handleDateRangeChange = (value: string) => {
    const newValue = value as DateRangeOption;
    setDateRange(newValue);
    if (newValue === 'custom') {
      setCalendarOpen(true);
    }
  };

  const getDateRangeLabel = () => {
    if (dateRange === 'custom' && customDateRange.from) {
      if (customDateRange.to && customDateRange.from.getTime() !== customDateRange.to.getTime()) {
        return `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d')}`;
      }
      return format(customDateRange.from, 'MMM d, yyyy');
    }
    switch (dateRange) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last Month';
      default: return 'All Time';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Activity History</SheetTitle>
        </SheetHeader>

        {/* Filters */}
        <div className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    dateRange === 'custom' && customDateRange.from && "text-foreground"
                  )}
                  onClick={() => setCalendarOpen(true)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">{getDateRangeLabel()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-2 border-b">
                  <Select value={dateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last Month</SelectItem>
                      <SelectItem value="custom">Custom Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {dateRange === 'custom' && (
                  <Calendar
                    mode="range"
                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                    onSelect={(range) => {
                      setCustomDateRange({ from: range?.from, to: range?.to });
                    }}
                    numberOfMonths={1}
                    className={cn("p-3 pointer-events-auto")}
                  />
                )}
                {dateRange === 'custom' && customDateRange.from && (
                  <div className="p-2 border-t">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => setCalendarOpen(false)}
                    >
                      Apply Filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-220px)] mt-4 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasFilters ? 'No matching activity found' : 'No activity recorded yet'}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                <div key={date}>
                  <div className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {format(new Date(date), 'EEEE, MMM d, yyyy')}
                  </div>
                  <div className="space-y-3">
                    {dateLogs.map(log => (
                      <div key={log.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`${getActionColor(log.action)} border-0 flex items-center gap-1`}
                          >
                            {getActionIcon(log.action)}
                            {log.action}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getTableLabel(log.tableName)}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(new Date(log.createdAt), 'h:mm a')}
                          </span>
                        </div>
                        
                        {log.recordName && (
                          <div className="text-sm font-medium">
                            {log.recordName}
                          </div>
                        )}
                        
                        {log.changes && (
                          <div className="pt-1">
                            {formatChanges(log.changes)}
                          </div>
                        )}

                        {log.newData && (
                          <div className="pt-1">
                            {formatNewData(log.newData, log.tableName, log.action, log.recordName || undefined)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};