import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { useDayGuests } from '@/hooks/useDayGuests';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectorSettingsDialog } from './CollectorSettingsDialog';
import { useCollectorNames } from '@/hooks/useCollectorNames';

interface TenantCollection {
  tenantName: string;
  roomNo: string;
  amount: number;
  date: string;
  mode: 'upi' | 'cash';
  type?: 'rent' | 'deposit' | 'overdue' | 'dayguest';
}

export const CollectedByCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, isLoading: paymentsLoading } = useTenantPayments();
  const { rooms, isLoading: roomsLoading } = useRooms();
  const { dayGuests } = useDayGuests();
  const { getCollectorDisplayName } = useCollectorNames();
  const [expandedCollector, setExpandedCollector] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { collectionsByPerson, tenantsByCollector, categoryTotals } = useMemo(() => {
    const collections: Record<string, number> = {};
    const tenants: Record<string, TenantCollection[]> = {};
    // Track per-collector category totals
    const catTotals: Record<string, { rent: number; overdue: number; deposit: number; dayguest: number }> = {};

    const addCollection = (displayName: string, entry: TenantCollection) => {
      collections[displayName] = (collections[displayName] || 0) + entry.amount;
      if (!tenants[displayName]) tenants[displayName] = [];
      tenants[displayName].push(entry);
      
      if (!catTotals[displayName]) catTotals[displayName] = { rent: 0, overdue: 0, deposit: 0, dayguest: 0 };
      const cat = entry.type || 'rent';
      if (cat === 'rent') catTotals[displayName].rent += entry.amount;
      else if (cat === 'overdue') catTotals[displayName].overdue += entry.amount;
      else if (cat === 'deposit') catTotals[displayName].deposit += entry.amount;
      else if (cat === 'dayguest') catTotals[displayName].dayguest += entry.amount;
    };

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        // Current month rent payments
        if (isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          if (!tenant.isLocked) {
            const payment = payments.find(
              p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
            );
            if (payment?.paymentEntries) {
              (payment.paymentEntries as PaymentEntry[]).forEach(entry => {
                const displayName = getCollectorDisplayName(entry.collectedBy || 'Unknown');
                addCollection(displayName, {
                  tenantName: tenant.name,
                  roomNo: room.roomNo,
                  amount: entry.amount,
                  date: entry.date,
                  mode: entry.mode,
                  type: 'rent',
                });
              });
            }
          }
        }

        // Previous month overdue collections paid this month
        let pM = selectedMonth - 1, pY = selectedYear;
        if (pM === 0) { pM = 12; pY -= 1; }
        if (isTenantActiveInMonth(tenant.startDate, tenant.endDate, pY, pM)) {
          if (!tenant.isLocked) {
            const payment = payments.find(
              p => p.tenantId === tenant.id && p.month === pM && p.year === pY
            );
            if (payment?.paymentEntries) {
              (payment.paymentEntries as PaymentEntry[]).forEach(entry => {
                const entryDate = new Date(entry.date);
                if (entryDate.getMonth() + 1 === selectedMonth && entryDate.getFullYear() === selectedYear) {
                  const displayName = getCollectorDisplayName(entry.collectedBy || 'Unknown');
                  addCollection(displayName, {
                    tenantName: tenant.name,
                    roomNo: room.roomNo,
                    amount: entry.amount,
                    date: entry.date,
                    mode: entry.mode,
                    type: 'overdue',
                  });
                }
              });
            }
          }
        }

        // Security deposit collections
        if (tenant.securityDepositAmount && tenant.securityDepositAmount > 0 && tenant.securityDepositDate) {
          const depositDate = parseDateOnly(tenant.securityDepositDate);
          const isInMonth =
            depositDate.getMonth() + 1 === selectedMonth && depositDate.getFullYear() === selectedYear;

          if (isInMonth) {
            const displayName = getCollectorDisplayName(tenant.securityDepositCollectedBy || 'Unknown');
            const mode = (tenant.securityDepositMode === 'upi' ? 'upi' : 'cash') as 'upi' | 'cash';
            addCollection(displayName, {
              tenantName: tenant.name,
              roomNo: room.roomNo,
              amount: tenant.securityDepositAmount,
              date: tenant.securityDepositDate,
              mode,
              type: 'deposit',
            });
          }
        }
      });
    });

    // Day guest collections
    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth, 0);
    
    dayGuests.forEach(guest => {
      const fromDate = new Date(guest.from_date);
      if (fromDate >= startOfMonth && fromDate <= endOfMonth) {
        const entries = (guest.payment_entries as any[]) || [];
        const room = rooms.find(r => r.id === guest.room_id);
        const roomNo = room?.roomNo || '?';
        
        entries.forEach((entry: any) => {
          const displayName = getCollectorDisplayName(entry.collectedBy || 'Unknown');
          addCollection(displayName, {
            tenantName: guest.guest_name,
            roomNo,
            amount: entry.amount,
            date: entry.date,
            mode: entry.mode || 'cash',
            type: 'dayguest',
          });
        });
      }
    });

    return { collectionsByPerson: collections, tenantsByCollector: tenants, categoryTotals: catTotals };
  }, [rooms, payments, dayGuests, selectedMonth, selectedYear, getCollectorDisplayName]);

  const entries = Object.entries(collectionsByPerson);
  
  const isInitialLoad = (paymentsLoading || roomsLoading) && rooms.length === 0 && payments.length === 0;
  
  if (isInitialLoad) {
    return (
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span>👥</span>
            Collected By
          </CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
            <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span>👥</span>
            Collected By
          </CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground text-center py-2">No collections yet</p>
        </CardContent>
      </Card>
    );
  }

  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  const toggleCollector = (name: string) => {
    setExpandedCollector(prev => prev === name ? null : name);
  };

  const typeLabel = (t: string) => {
    if (t === 'overdue') return 'Due';
    if (t === 'deposit') return 'Deposit';
    if (t === 'dayguest') return 'Day Guest';
    return null;
  };

  const typeBadgeClass = (t: string) => {
    if (t === 'overdue') return 'bg-amber-500/10 text-amber-500';
    if (t === 'deposit') return 'bg-purple-500/10 text-purple-400';
    if (t === 'dayguest') return 'bg-teal-500/10 text-teal-400';
    return '';
  };

  const categoryOrder = ['rent', 'overdue', 'deposit', 'dayguest'] as const;
  const categoryLabel: Record<string, string> = { rent: 'Current Month', overdue: 'Due (Previous)', deposit: 'Deposit', dayguest: 'Day Guest' };

  return (
    <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>👥</span>
          Collected By
        </CardTitle>
         <div className="flex items-center gap-1">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1 rounded hover:bg-muted/50 transition-colors"
              title="Collector Settings"
            >
              <Settings className="h-4 w-4 text-blue-500" />
            </button>
          </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          {entries.map(([name, amount]) => {
            const isExpanded = expandedCollector === name;
            const tenantList = tenantsByCollector[name] || [];
            const cats = categoryTotals[name] || { rent: 0, overdue: 0, deposit: 0, dayguest: 0 };
            return (
              <div key={name}>
                <button
                  type="button"
                  onClick={() => toggleCollector(name)}
                  className="flex justify-between items-center w-full hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{name}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-paid">₹{amount.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({Math.round((amount / total) * 100)}%)
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="ml-5 mt-1 space-y-2 border-l-2 border-blue-500/20 pl-3 pb-1">
                    {/* Category sub-totals */}
                    <div className="flex flex-wrap gap-2 text-[10px] mb-1">
                      {cats.rent > 0 && (
                        <span className="text-muted-foreground">Rent: <span className="font-medium text-foreground">₹{cats.rent.toLocaleString()}</span></span>
                      )}
                      {cats.overdue > 0 && (
                        <span className="text-amber-500">Due: <span className="font-medium">₹{cats.overdue.toLocaleString()}</span></span>
                      )}
                      {cats.deposit > 0 && (
                        <span className="text-purple-400">Deposit: <span className="font-medium">₹{cats.deposit.toLocaleString()}</span></span>
                      )}
                      {cats.dayguest > 0 && (
                        <span className="text-teal-400">Day Guest: <span className="font-medium">₹{cats.dayguest.toLocaleString()}</span></span>
                      )}
                    </div>
                    {/* Grouped by category, sorted by date within each */}
                    {categoryOrder.map(cat => {
                      const items = tenantList
                        .filter(t => (t.type || 'rent') === cat)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      if (items.length === 0) return null;
                      return (
                        <div key={cat} className="space-y-0.5">
                          <div className={`text-[10px] font-semibold uppercase tracking-wider pt-1 ${
                            cat === 'rent' ? 'text-green-500' :
                            cat === 'overdue' ? 'text-amber-500' :
                            cat === 'deposit' ? 'text-purple-400' :
                            'text-teal-400'
                          }`}>
                            {categoryLabel[cat]} ({items.length})
                          </div>
                          {items.map((t, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs gap-1">
                              <div className="flex items-center gap-1 min-w-0 flex-1">
                                <span className="font-medium truncate">{t.tenantName}</span>
                                <span className="text-muted-foreground shrink-0">R{t.roomNo}</span>
                                <span className={`px-1 py-0.5 rounded text-[10px] font-medium shrink-0 ${t.mode === 'upi' ? 'bg-upi-muted text-upi' : 'bg-cash-muted text-cash'}`}>
                                  {t.mode === 'upi' ? 'UPI' : 'Cash'}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-medium">₹{t.amount.toLocaleString()}</span>
                                <span className="text-muted-foreground ml-1">
                                  {format(t.type === 'deposit' ? parseDateOnly(t.date) : new Date(t.date), 'dd MMM')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <div className="border-t pt-2 flex justify-between items-center">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-sm font-bold">₹{total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
      <CollectorSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Card>
  );
};