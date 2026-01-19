import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, AlertTriangle } from 'lucide-react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { useAuditLog } from '@/hooks/useAuditLog';
import { hasTenantLeftNow, isTenantActiveInMonth, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface LeftTenantsCleanupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
}

export const LeftTenantsCleanupSheet = ({ open, onOpenChange, rooms }: LeftTenantsCleanupSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { updateTenant } = useRooms();
  const { logAudit } = useAuditLog();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLocking, setIsLocking] = useState(false);

  // Find left tenants that are still active in the rent sheet for this month
  // (active in month BUT already left - endDate is today or in the past)
  const leftTenantsInSheet = useMemo(() => {
    const tenants: Array<{
      id: string;
      name: string;
      roomNo: string;
      monthlyRent: number;
      endDate: string;
      isLocked: boolean;
    }> = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        // Must be active in the selected month (was part of rent sheet)
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) {
          return;
        }
        
        // Must have left (endDate is today or in the past)
        if (!hasTenantLeftNow(tenant.endDate)) {
          return;
        }
        
        // Skip already locked tenants
        if (tenant.isLocked) {
          return;
        }

        tenants.push({
          id: tenant.id,
          name: tenant.name,
          roomNo: room.roomNo,
          monthlyRent: tenant.monthlyRent,
          endDate: tenant.endDate!,
          isLocked: tenant.isLocked || false,
        });
      });
    });

    return tenants;
  }, [rooms, selectedMonth, selectedYear]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === leftTenantsInSheet.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leftTenantsInSheet.map(t => t.id)));
    }
  };

  const handleBulkLock = async () => {
    if (selectedIds.size === 0) return;
    
    setIsLocking(true);
    try {
      const tenantsToLock = leftTenantsInSheet.filter(t => selectedIds.has(t.id));
      
      for (const tenant of tenantsToLock) {
        await updateTenant.mutateAsync({
          tenantId: tenant.id,
          updates: { isLocked: true },
          tenantName: tenant.name,
        });
        
        await logAudit.mutateAsync({
          action: 'update',
          tableName: 'tenants',
          recordId: tenant.id,
          recordName: tenant.name,
          changes: {
            isLocked: { old: false, new: true },
          },
          newData: { isLocked: true },
          oldData: { isLocked: false },
        });
      }
      
      toast({
        title: `${tenantsToLock.length} tenant(s) locked`,
        description: 'They have been removed from rent sheet and reports',
      });
      
      setSelectedIds(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error('Error locking tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to lock some tenants',
        variant: 'destructive',
      });
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-pending" />
            Left Tenants Cleanup
          </SheetTitle>
          <SheetDescription>
            These tenants have left but are still included in the rent sheet. Lock them to exclude from totals and reports.
          </SheetDescription>
        </SheetHeader>

        {leftTenantsInSheet.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Lock className="h-12 w-12 mb-4 opacity-50" />
            <p>No left tenants found in the current rent sheet</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-4 border-b">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === leftTenantsInSheet.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Badge variant="secondary">
                {selectedIds.size} selected
              </Badge>
            </div>

            <ScrollArea className="h-[calc(80vh-220px)]">
              <div className="space-y-2 py-4">
                {leftTenantsInSheet.map(tenant => (
                  <div
                    key={tenant.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedIds.has(tenant.id) ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleSelection(tenant.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(tenant.id)}
                      onCheckedChange={() => toggleSelection(tenant.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{tenant.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tenant.roomNo}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Left on {format(parseDateOnly(tenant.endDate), 'dd MMM yyyy')} • ₹{tenant.monthlyRent.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkLock}
                disabled={selectedIds.size === 0 || isLocking}
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                Lock {selectedIds.size} Tenant{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};