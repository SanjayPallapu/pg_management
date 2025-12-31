import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Lock, Search, User } from 'lucide-react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { toast } from '@/hooks/use-toast';
import { isTenantActiveInMonth, isTenantActiveNow } from '@/utils/dateOnly';

interface TenantLockCardProps {
  rooms: Room[];
}

export const TenantLockCard = ({ rooms }: TenantLockCardProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedMonth, selectedYear } = useMonthContext();
  const { updateTenant } = useRooms();

  const isCurrentMonth = (() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  })();

  // Get all active tenants
  const allTenants = useMemo(() => {
    return rooms.flatMap(room =>
      room.tenants
        .filter(t => 
          isCurrentMonth
            ? isTenantActiveNow(t.startDate, t.endDate)
            : isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
        )
        .map(tenant => ({
          ...tenant,
          roomNo: room.roomNo,
        }))
    );
  }, [rooms, selectedMonth, selectedYear, isCurrentMonth]);

  // Get locked tenants count
  const lockedCount = allTenants.filter(t => t.isLocked).length;

  // Filter tenants based on search
  const filteredTenants = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allTenants.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.roomNo.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to 5 results
  }, [allTenants, searchQuery]);

  const handleToggleLock = (tenant: typeof allTenants[0]) => {
    const newLockState = !tenant.isLocked;
    updateTenant.mutate(
      { tenantId: tenant.id, updates: { isLocked: newLockState } },
      {
        onSuccess: () => {
          toast({
            title: newLockState ? 'Tenant locked' : 'Tenant unlocked',
            description: newLockState 
              ? `${tenant.name}'s rent excluded from totals` 
              : `${tenant.name}'s rent included in totals`,
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Lock className="h-4 w-4 text-muted-foreground" />
          Lock Tenants
          {lockedCount > 0 && (
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
              {lockedCount} locked
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenant to lock..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Search Results */}
        {filteredTenants.length > 0 && (
          <div className="mt-3 space-y-2">
            {filteredTenants.map(tenant => (
              <div 
                key={tenant.id} 
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  tenant.isLocked ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {tenant.isLocked && '🔒 '}{tenant.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Room {tenant.roomNo} • ₹{tenant.monthlyRent.toLocaleString()}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={tenant.isLocked || false}
                  onCheckedChange={() => handleToggleLock(tenant)}
                  className="flex-shrink-0"
                />
              </div>
            ))}
          </div>
        )}

        {/* Locked tenants list when no search */}
        {!searchQuery.trim() && lockedCount > 0 && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-muted-foreground">Locked tenants:</div>
            {allTenants.filter(t => t.isLocked).map(tenant => (
              <div 
                key={tenant.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Lock className="h-4 w-4 text-destructive flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{tenant.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Room {tenant.roomNo} • ₹{tenant.monthlyRent.toLocaleString()}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={true}
                  onCheckedChange={() => handleToggleLock(tenant)}
                  className="flex-shrink-0"
                />
              </div>
            ))}
          </div>
        )}

        {searchQuery.trim() && filteredTenants.length === 0 && (
          <div className="mt-3 text-sm text-muted-foreground text-center py-2">
            No tenants found
          </div>
        )}
      </CardContent>
    </Card>
  );
};
