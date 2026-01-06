import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuditLog } from '@/hooks/useAuditLog';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subMonths } from 'date-fns';
import { Plus, Pencil, Trash2, Loader2, Search, X, Filter } from 'lucide-react';

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

const formatNewData = (newData: Record<string, unknown> | null, tableName: string) => {
  if (!newData || tableName !== 'tenant_payments') return null;
  
  const { amount, mode, type, status } = newData as { amount?: number; mode?: string; type?: string; status?: string };
  
  return (
    <div className="text-xs text-muted-foreground ml-4 space-y-0.5">
      {amount !== undefined && (
        <div>
          <span className="font-medium">Amount:</span>{' '}
          <span className="text-paid">₹{Number(amount).toLocaleString()}</span>
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
      {status && (
        <div>
          <span className="font-medium">Status:</span>{' '}
          <span className={status === 'Paid' ? 'text-paid' : status === 'Partial' ? 'text-partial' : 'text-pending'}>
            {status}
          </span>
        </div>
      )}
    </div>
  );
};

type DateRangeOption = 'all' | 'today' | 'week' | 'month';

export const AuditHistorySheet = ({ open, onOpenChange }: AuditHistorySheetProps) => {
  const { logs, isLoading } = useAuditLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeOption>('all');

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
          default:
            start = new Date(0);
        }

        if (!isWithinInterval(logDate, { start, end: endOfDay(now) })) {
          return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, actionFilter, dateRange]);

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
  };

  const hasFilters = searchQuery || actionFilter !== 'all' || dateRange !== 'all';

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

            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
              </SelectContent>
            </Select>

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

                        {log.newData && log.tableName === 'tenant_payments' && (
                          <div className="pt-1">
                            {formatNewData(log.newData, log.tableName)}
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