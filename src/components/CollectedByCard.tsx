import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
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
}

export const CollectedByCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments, isLoading: paymentsLoading } = useTenantPayments();
  const { rooms, isLoading: roomsLoading } = useRooms();
  const { collectors } = useCollectorNames();
  const [expandedCollector, setExpandedCollector] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Build a map from collector ID to display name
  const collectorDisplayNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    collectors.forEach(c => { map[c.id] = c.displayName; });
    return map;
  }, [collectors]);

  const { collectionsByPerson, tenantsByCollector } = useMemo(() => {
    const collections: Record<string, number> = {};
    const tenants: Record<string, TenantCollection[]> = {};

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (tenant.isLocked) return;
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return;

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );
        if (!payment?.paymentEntries) return;

        (payment.paymentEntries as PaymentEntry[]).forEach(entry => {
          const rawId = entry.collectedBy || 'Unknown';
          // Map the stored ID to its display name, fallback to raw ID
          const displayName = collectorDisplayNameMap[rawId] || rawId;
          collections[displayName] = (collections[displayName] || 0) + entry.amount;
          if (!tenants[displayName]) tenants[displayName] = [];
          tenants[displayName].push({
            tenantName: tenant.name,
            roomNo: room.roomNo,
            amount: entry.amount,
            date: entry.date,
            mode: entry.mode,
          });
        });
      });
    });

    return { collectionsByPerson: collections, tenantsByCollector: tenants };
  }, [rooms, payments, selectedMonth, selectedYear, collectorDisplayNameMap]);

  const entries = Object.entries(collectionsByPerson);
  
  // Show skeleton only on true initial load (no cached data at all)
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

  // If no collections at all (data loaded but nothing collected), show empty state
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
                {isExpanded && tenantList.length > 0 && (
                  <div className="ml-5 mt-1 space-y-1 border-l-2 border-blue-500/20 pl-3 pb-1">
                    {tenantList.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{t.tenantName}</span>
                          <span className="text-muted-foreground">R{t.roomNo}</span>
                          <span className={`px-1 py-0.5 rounded text-[10px] font-medium ${t.mode === 'upi' ? 'bg-upi-muted text-upi' : 'bg-cash-muted text-cash'}`}>
                            {t.mode === 'upi' ? 'UPI' : 'Cash'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">₹{t.amount.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-1">
                            {format(new Date(t.date), 'dd MMM')}
                          </span>
                        </div>
                      </div>
                    ))}
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
