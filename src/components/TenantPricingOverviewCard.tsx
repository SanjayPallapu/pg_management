import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Users } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import { useMonthContext } from '@/contexts/MonthContext';
import { isTenantActiveInMonth, isTenantActiveNow } from '@/utils/dateOnly';
import { BED_PRICING } from '@/constants/pricing';

interface SharingGroup {
  sharing: number;
  label: string;
  tenantCount: number;
  totalRent: number;
  standardRate: number;
}

export const TenantPricingOverviewCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { rooms } = useRooms();
  const [isOpen, setIsOpen] = useState(false);

  const today = new Date();
  const isCurrentMonth = selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();

  const { sharingGroups, grandTotal, totalTenants } = useMemo(() => {
    const groupMap: Record<number, SharingGroup> = {};

    rooms.forEach(room => {
      const activeTenants = room.tenants.filter(t => {
        const active = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
        return isCurrentMonth ? active && isTenantActiveNow(t.startDate, t.endDate) : active;
      });

      if (activeTenants.length === 0) return;

      const sharing = room.capacity;
      if (!groupMap[sharing]) {
        groupMap[sharing] = {
          sharing,
          label: sharing === 1 ? 'Single' : `${sharing} Sharing`,
          tenantCount: 0,
          totalRent: 0,
          standardRate: BED_PRICING[sharing] || 4000,
        };
      }

      activeTenants.forEach(t => {
        if (t.isLocked) return;
        groupMap[sharing].tenantCount++;
        groupMap[sharing].totalRent += t.monthlyRent;
      });
    });

    const groups = Object.values(groupMap).sort((a, b) => a.sharing - b.sharing);
    const grandTotal = groups.reduce((s, g) => s + g.totalRent, 0);
    const totalTenants = groups.reduce((s, g) => s + g.tenantCount, 0);

    return { sharingGroups: groups, grandTotal, totalTenants };
  }, [rooms, selectedMonth, selectedYear, isCurrentMonth]);

  if (totalTenants === 0) return null;

  const SHARE_COLORS: Record<number, string> = {
    1: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    2: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    3: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    4: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    5: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <div className="text-left">
                  <h3 className="font-semibold text-sm">Tenant Pricing Overview</h3>
                  <p className="text-xs text-muted-foreground">
                    {totalTenants} tenants · ₹{grandTotal.toLocaleString()}/mo
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 space-y-3">
            {/* Sharing-wise breakdown */}
            <div className="space-y-2">
              {sharingGroups.map(group => (
                <div
                  key={group.sharing}
                  className={`p-3 rounded-lg border ${SHARE_COLORS[group.sharing] || 'bg-muted/50 border-border'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{group.label}</div>
                      <div className="text-xs opacity-80">
                        {group.tenantCount} tenant{group.tenantCount !== 1 ? 's' : ''} · ₹{group.standardRate.toLocaleString()}/bed standard
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">₹{group.totalRent.toLocaleString()}</div>
                      <div className="text-xs opacity-70">/month</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Total Monthly Revenue</div>
                  <div className="text-xs text-muted-foreground">{totalTenants} active tenants</div>
                </div>
                <div className="text-xl font-bold text-primary">
                  ₹{grandTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
