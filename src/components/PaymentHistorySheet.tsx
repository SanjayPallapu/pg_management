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
import { X, Filter, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { PaymentEntry } from '@/types';
import { UpiLogo } from './icons/UpiLogo';
import { CashLogo } from './icons/CashLogo';

interface PaymentHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = 'all' | 'upi' | 'cash';
type DateFilter = 'all' | 'current-month' | 'last-month' | 'last-3-months';

interface HistoryEntry {
  id: string;
  tenantId: string;
  tenantName: string;
  roomNo: string;
  amount: number;
  date: string;
  mode: 'upi' | 'cash';
  type: 'partial' | 'full' | 'remaining';
  month: number;
  year: number;
  forMonth: string;
}

export const PaymentHistorySheet = ({ open, onOpenChange }: PaymentHistorySheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const isMobile = useIsMobile();
  
  const [modeFilter, setModeFilter] = useState<FilterType>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useBackGesture(open, () => onOpenChange(false));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Build tenant lookup
  const tenantLookup = useMemo(() => {
    const lookup: Record<string, { name: string; roomNo: string }> = {};
    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        lookup[tenant.id] = { name: tenant.name, roomNo: room.roomNo };
      });
    });
    return lookup;
  }, [rooms]);

  // Extract all payment entries from payments
  const allHistoryEntries = useMemo(() => {
    const entries: HistoryEntry[] = [];
    
    payments.forEach(payment => {
      const tenant = tenantLookup[payment.tenantId];
      if (!tenant) return;
      
      const paymentEntries = payment.paymentEntries || [];
      paymentEntries.forEach((entry: PaymentEntry, index: number) => {
        entries.push({
          id: `${payment.id}-${index}`,
          tenantId: payment.tenantId,
          tenantName: tenant.name,
          roomNo: tenant.roomNo,
          amount: entry.amount,
          date: entry.date,
          mode: entry.mode,
          type: entry.type,
          month: payment.month,
          year: payment.year,
          forMonth: `${months[payment.month - 1]} ${payment.year}`,
        });
      });
    });
    
    // Sort by date descending
    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, tenantLookup]);

  // Apply filters
  const filteredEntries = useMemo(() => {
    let filtered = [...allHistoryEntries];
    
    // Payment mode filter
    if (modeFilter !== 'all') {
      filtered = filtered.filter(e => e.mode === modeFilter);
    }
    
    // Date filter
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    if (dateFilter === 'current-month') {
      filtered = filtered.filter(e => {
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
      filtered = filtered.filter(e => {
        const entryDate = new Date(e.date);
        return entryDate.getMonth() + 1 === lastMonth && entryDate.getFullYear() === lastYear;
      });
    } else if (dateFilter === 'last-3-months') {
      const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
      filtered = filtered.filter(e => new Date(e.date) >= threeMonthsAgo);
    }
    
    return filtered;
  }, [allHistoryEntries, modeFilter, dateFilter]);

  const totalAmount = filteredEntries.reduce((sum, e) => sum + e.amount, 0);
  const upiTotal = filteredEntries.filter(e => e.mode === 'upi').reduce((sum, e) => sum + e.amount, 0);
  const cashTotal = filteredEntries.filter(e => e.mode === 'cash').reduce((sum, e) => sum + e.amount, 0);

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
            {filteredEntries.length} transaction(s)
          </div>
        </div>

        {/* Transaction List */}
        <ScrollArea className={isMobile ? "h-[calc(100vh-320px)]" : "h-[calc(100vh-300px)] mt-2"}>
          <div className="space-y-2 pr-2">
            {filteredEntries.map(entry => (
              <div 
                key={entry.id}
                className="p-3 rounded-lg border bg-card"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{entry.tenantName}</span>
                      <Badge variant="outline" className="text-xs">
                        Room {entry.roomNo}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      For: {entry.forMonth}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-paid">₹{entry.amount.toLocaleString()}</div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {entry.mode === 'upi' ? (
                        <UpiLogo className="h-3 w-3" />
                      ) : (
                        <CashLogo className="h-3 w-3" />
                      )}
                      <span className="text-xs text-muted-foreground capitalize">{entry.mode}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.date), 'dd MMM yyyy')}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={
                      entry.type === 'full' 
                        ? 'bg-paid/10 text-paid border-paid/30' 
                        : entry.type === 'remaining'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                        : 'bg-partial/10 text-partial border-partial/30'
                    }
                  >
                    {entry.type === 'full' ? 'Full' : entry.type === 'remaining' ? 'Remaining' : 'Partial'}
                  </Badge>
                </div>
              </div>
            ))}

            {filteredEntries.length === 0 && (
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
