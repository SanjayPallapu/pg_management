import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useIsMobile } from '@/hooks/use-mobile';
import { X, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentEntry } from '@/types';
import { UpiLogo } from './icons/UpiLogo';
import { CashLogo } from './icons/CashLogo';
import { formatBillingRange } from './PaymentReminderTemplate';

interface PaymentHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = 'all' | 'upi' | 'cash';
type DateFilter = 'all' | 'current-month' | 'last-month' | 'last-3-months';

interface TenantGroupedPayment {
  tenantId: string;
  tenantName: string;
  roomNo: string;
  month: number;
  year: number;
  forPeriod: string;
  joiningDate: string;
  entries: Array<{
    id: string;
    amount: number;
    date: string;
    mode: 'upi' | 'cash';
    type: 'partial' | 'full' | 'remaining';
  }>;
  totalAmount: number;
}

export const PaymentHistorySheet = ({ open, onOpenChange }: PaymentHistorySheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const isMobile = useIsMobile();
  
  const [modeFilter, setModeFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useBackGesture(open, () => onOpenChange(false));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Build tenant lookup with joining date
  const tenantLookup = useMemo(() => {
    const lookup: Record<string, { name: string; roomNo: string; joiningDate: string }> = {};
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        lookup[tenant.id] = { name: tenant.name, roomNo: room.roomNo, joiningDate: tenant.startDate };
      });
    });
    return lookup;
  }, [rooms]);

  // Group payments by tenant + month
  const groupedPayments = useMemo(() => {
    const groups: Map<string, TenantGroupedPayment> = new Map();
    
    payments.forEach(payment => {
      const tenant = tenantLookup[payment.tenantId];
      if (!tenant) return;
      
      const paymentEntries = payment.paymentEntries || [];
      if (paymentEntries.length === 0) return;

      // Apply date filter on entries
      let filteredEntries = [...paymentEntries];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      if (dateFilter === 'current-month') {
        filteredEntries = filteredEntries.filter(e => {
          const entryDate = new Date(e.date);
          return entryDate.getMonth() + 1 === currentMonth && entryDate.getFullYear() === currentYear;
        });
      } else if (dateFilter === 'last-month') {
        let lastMonth = currentMonth - 1;
        let lastYear = currentYear;
        if (lastMonth === 0) {
          lastMonth = 12;
          lastYear -= 1;
        }
        filteredEntries = filteredEntries.filter(e => {
          const entryDate = new Date(e.date);
          return entryDate.getMonth() + 1 === lastMonth && entryDate.getFullYear() === lastYear;
        });
      } else if (dateFilter === 'last-3-months') {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
        filteredEntries = filteredEntries.filter(e => new Date(e.date) >= threeMonthsAgo);
      }

      // Apply mode filter
      if (modeFilter !== 'all') {
        filteredEntries = filteredEntries.filter(e => e.mode === modeFilter);
      }

      if (filteredEntries.length === 0) return;

      const key = `${payment.tenantId}-${payment.month}-${payment.year}`;
      
      const forPeriod = formatBillingRange(tenant.joiningDate, payment.year, payment.month);
      
      const entries = filteredEntries.map((entry: PaymentEntry, index: number) => ({
        id: `${payment.id}-${index}`,
        amount: entry.amount,
        date: entry.date,
        mode: entry.mode,
        type: entry.type,
      }));

      const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

      groups.set(key, {
        tenantId: payment.tenantId,
        tenantName: tenant.name,
        roomNo: tenant.roomNo,
        month: payment.month,
        year: payment.year,
        forPeriod,
        joiningDate: tenant.joiningDate,
        entries,
        totalAmount,
      });
    });
    
    // Sort by most recent first (by latest entry date)
    return Array.from(groups.values()).sort((a, b) => {
      const aLatest = Math.max(...a.entries.map(e => new Date(e.date).getTime()));
      const bLatest = Math.max(...b.entries.map(e => new Date(e.date).getTime()));
      return bLatest - aLatest;
    });
  }, [payments, tenantLookup, modeFilter, dateFilter]);

  // Calculate totals from all filtered entries
  const allEntries = groupedPayments.flatMap(g => g.entries);
  const totalAmount = allEntries.reduce((sum, e) => sum + e.amount, 0);
  const upiTotal = allEntries.filter(e => e.mode === 'upi').reduce((sum, e) => sum + e.amount, 0);
  const cashTotal = allEntries.filter(e => e.mode === 'cash').reduce((sum, e) => sum + e.amount, 0);

  const toggleExpand = (key: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "w-full sm:max-w-lg"}
      >
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              Payment History
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Filters */}
        <div className="space-y-3 py-3 border-b">
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="current-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={modeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModeFilter('all')}
              className="flex-1"
            >
              All
            </Button>
            <Button
              variant={modeFilter === 'upi' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModeFilter('upi')}
              className="flex-1 gap-1"
            >
              <UpiLogo className="h-4 w-4" />
              UPI
            </Button>
            <Button
              variant={modeFilter === 'cash' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setModeFilter('cash')}
              className="flex-1 gap-1"
            >
              <CashLogo className="h-4 w-4" />
              Cash
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="py-3 border-b">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-semibold text-sm">₹{totalAmount.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <div className="text-xs text-muted-foreground">UPI</div>
              <div className="font-semibold text-sm text-blue-600">₹{upiTotal.toLocaleString()}</div>
            </div>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <div className="text-xs text-muted-foreground">Cash</div>
              <div className="font-semibold text-sm text-green-600">₹{cashTotal.toLocaleString()}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            {allEntries.length} transaction(s) • {groupedPayments.length} tenant(s)
          </div>
        </div>

        {/* Grouped Transaction List */}
        <ScrollArea className={isMobile ? "h-[calc(100vh-320px)]" : "h-[calc(100vh-300px)] mt-2"}>
          <div className="space-y-3 pr-2">
            {groupedPayments.map(group => {
              const key = `${group.tenantId}-${group.month}-${group.year}`;
              const isExpanded = expandedCards.has(key) || group.entries.length <= 2;
              const displayEntries = isExpanded ? group.entries : group.entries.slice(0, 2);
              
              return (
                <div 
                  key={key}
                  className="p-3 rounded-lg border bg-card"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{group.tenantName}</span>
                        <Badge variant="outline" className="text-xs">
                          Room {group.roomNo}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        For Period: {group.forPeriod}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-paid">₹{group.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Transaction entries */}
                  <div className="space-y-1.5 pt-2 border-t">
                    {displayEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {format(new Date(entry.date), 'dd MMM yyyy')}
                          </span>
                          <span>–</span>
                          <span className="font-medium">₹{entry.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={
                              entry.type === 'full' 
                                ? 'bg-paid/10 text-paid border-paid/30 text-xs' 
                                : entry.type === 'remaining'
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 text-xs'
                                : 'bg-partial/10 text-partial border-partial/30 text-xs'
                            }
                          >
                            {entry.type === 'full' ? 'Full' : entry.type === 'remaining' ? 'Final' : 'Partial'}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {entry.mode === 'upi' ? (
                              <UpiLogo className="h-3 w-3" />
                            ) : (
                              <CashLogo className="h-3 w-3" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">{entry.mode}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expand/Collapse button */}
                  {group.entries.length > 2 && (
                    <button
                      onClick={() => toggleExpand(key)}
                      className="w-full mt-2 pt-2 border-t flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show {group.entries.length - 2} more
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {groupedPayments.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No transactions found
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};