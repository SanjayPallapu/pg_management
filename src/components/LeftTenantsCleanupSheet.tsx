import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock, AlertTriangle, IndianRupee, Calendar } from 'lucide-react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { useTenantPayments } from '@/hooks/useTenantPayments';
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
  const { payments } = useTenantPayments();
  const { logAudit } = useAuditLog();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLocking, setIsLocking] = useState(false);
  const [filterRoom, setFilterRoom] = useState<string | null>(null);

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
      paymentStatus: 'Paid' | 'Partial' | 'Pending';
      amountPaid: number;
      balance: number;
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

        // Get payment status for this tenant
        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );

        const amountPaid = payment?.amountPaid || 0;
        const balance = Math.max(0, tenant.monthlyRent - amountPaid);
        const paymentStatus = payment?.paymentStatus || 'Pending';

        tenants.push({
          id: tenant.id,
          name: tenant.name,
          roomNo: room.roomNo,
          monthlyRent: tenant.monthlyRent,
          endDate: tenant.endDate!,
          isLocked: tenant.isLocked || false,
          paymentStatus: paymentStatus as 'Paid' | 'Partial' | 'Pending',
          amountPaid,
          balance,
        });
      });
    });

    return tenants;
  }, [rooms, selectedMonth, selectedYear, payments]);

  // Get unique room numbers for filtering
  const uniqueRooms = useMemo(() => {
    const roomSet = new Set(leftTenantsInSheet.map(t => t.roomNo));
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [leftTenantsInSheet]);

  // Filtered tenants based on room filter
  const filteredTenants = useMemo(() => {
    if (!filterRoom) return leftTenantsInSheet;
    return leftTenantsInSheet.filter(t => t.roomNo === filterRoom);
  }, [leftTenantsInSheet, filterRoom]);

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
    if (selectedIds.size === filteredTenants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTenants.map(t => t.id)));
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

  // Calculate totals for selected tenants
  const selectedStats = useMemo(() => {
    const selected = leftTenantsInSheet.filter(t => selectedIds.has(t.id));
    return {
      count: selected.length,
      totalBalance: selected.reduce((sum, t) => sum + t.balance, 0),
      totalPaid: selected.reduce((sum, t) => sum + t.amountPaid, 0),
    };
  }, [leftTenantsInSheet, selectedIds]);

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-paid text-paid-foreground';
      case 'Partial': return 'bg-partial text-partial-foreground';
      default: return 'bg-pending text-pending-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh]">
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
            {/* Room Filter */}
            {uniqueRooms.length > 1 && (
              <div className="flex gap-2 py-3 overflow-x-auto border-b">
                <Button 
                  variant={filterRoom === null ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setFilterRoom(null)}
                  className="shrink-0"
                >
                  All
                </Button>
                {uniqueRooms.map(roomNo => (
                  <Button
                    key={roomNo}
                    variant={filterRoom === roomNo ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterRoom(roomNo)}
                    className="shrink-0"
                  >
                    Room {roomNo}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between py-3 border-b">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === filteredTenants.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Badge variant="secondary">
                {selectedIds.size} selected
              </Badge>
            </div>

            {/* Stats for selected tenants */}
            {selectedIds.size > 0 && (
              <div className="grid grid-cols-2 gap-2 py-3 border-b text-sm">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-paid" />
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-medium text-paid">₹{selectedStats.totalPaid.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-pending" />
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-medium text-pending">₹{selectedStats.totalBalance.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Action buttons at top for visibility */}
            <div className="flex justify-between gap-2 py-3 border-b sticky top-0 bg-background z-10">
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

            <ScrollArea className="h-[calc(85vh-320px)]">
              <div className="space-y-2 py-4">
                {filteredTenants.map(tenant => (
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{tenant.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {tenant.roomNo}
                        </Badge>
                        <Badge className={`text-xs shrink-0 ${getPaymentBadgeClass(tenant.paymentStatus)}`}>
                          {tenant.paymentStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Left: {format(parseDateOnly(tenant.endDate), 'dd MMM')}
                        </span>
                        <span className="text-paid">₹{tenant.amountPaid.toLocaleString()} paid</span>
                        {tenant.balance > 0 && (
                          <span className="text-pending">₹{tenant.balance.toLocaleString()} due</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};