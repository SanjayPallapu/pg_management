import { useState, useMemo, useCallback } from 'react';
import { differenceInDays, getDaysInMonth } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Lock, AlertTriangle, IndianRupee, Calendar, Check } from 'lucide-react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useAuditLog } from '@/hooks/useAuditLog';
import { hasTenantLeftNow, isTenantActiveInMonth, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

type RateMode = 'day-wise' | 'monthly-30' | 'custom';

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
  
  // Rate calculation mode per tenant
  const [rateModes, setRateModes] = useState<Record<string, RateMode>>({});
  const [customRates, setCustomRates] = useState<Record<string, number>>({});
  // Refund paid toggle per tenant
  const [refundPaid, setRefundPaid] = useState<Record<string, boolean>>({});

  const getRateMode = (id: string): RateMode => rateModes[id] || 'monthly-30';
  const setRateMode = (id: string, mode: RateMode) => setRateModes(prev => ({ ...prev, [id]: mode }));

  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1));

  const leftTenantsInSheet = useMemo(() => {
    const tenants: Array<{
      id: string;
      name: string;
      roomNo: string;
      monthlyRent: number;
      endDate: string;
      startDate: string;
      isLocked: boolean;
      paymentStatus: 'Paid' | 'Partial' | 'Pending';
      amountPaid: number;
      daysStayed: number;
    }> = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        if (!isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)) return;
        if (!hasTenantLeftNow(tenant.endDate)) return;
        if (tenant.isLocked) return;

        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
        );

        const amountPaid = payment?.amountPaid || 0;
        const paymentStatus = payment?.paymentStatus || 'Pending';

        const joinDate = parseDateOnly(tenant.startDate);
        const joinDay = joinDate.getDate();
        const cycleStart = new Date(selectedYear, selectedMonth - 1, joinDay === 1 ? 1 : joinDay);
        const leaveDate = parseDateOnly(tenant.endDate!);
        const daysStayed = Math.max(differenceInDays(leaveDate, cycleStart), 1);

        tenants.push({
          id: tenant.id,
          name: tenant.name,
          roomNo: room.roomNo,
          monthlyRent: tenant.monthlyRent,
          endDate: tenant.endDate!,
          startDate: tenant.startDate,
          isLocked: tenant.isLocked || false,
          paymentStatus: paymentStatus as 'Paid' | 'Partial' | 'Pending',
          amountPaid,
          daysStayed,
        });
      });
    });

    return tenants;
  }, [rooms, selectedMonth, selectedYear, payments]);

  // Compute per-day rate and refund based on selected mode
  const getCalc = useCallback((tenant: typeof leftTenantsInSheet[0]) => {
    const mode = getRateMode(tenant.id);
    let perDayRate: number;
    if (mode === 'day-wise') {
      perDayRate = Math.round(tenant.monthlyRent / daysInMonth);
    } else if (mode === 'custom') {
      perDayRate = customRates[tenant.id] || Math.round(tenant.monthlyRent / 30);
    } else {
      perDayRate = Math.round(tenant.monthlyRent / 30);
    }
    const proRataRent = perDayRate * tenant.daysStayed;
    const refundDue = tenant.amountPaid > proRataRent ? tenant.amountPaid - proRataRent : 0;
    const balance = Math.max(0, tenant.monthlyRent - tenant.amountPaid);
    return { perDayRate, proRataRent, refundDue, balance };
  }, [rateModes, customRates, daysInMonth]);

  const uniqueRooms = useMemo(() => {
    const roomSet = new Set(leftTenantsInSheet.map(t => t.roomNo));
    return Array.from(roomSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [leftTenantsInSheet]);

  const filteredTenants = useMemo(() => {
    if (!filterRoom) return leftTenantsInSheet;
    return leftTenantsInSheet.filter(t => t.roomNo === filterRoom);
  }, [leftTenantsInSheet, filterRoom]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
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
          changes: { isLocked: { old: false, new: true } },
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
      toast({ title: 'Error', description: 'Failed to lock some tenants', variant: 'destructive' });
    } finally {
      setIsLocking(false);
    }
  };

  // Summary stats considering refund paid toggles
  const summaryStats = useMemo(() => {
    let totalPaid = 0;
    let totalPending = 0;
    let totalRefundDue = 0;
    let totalRefunded = 0;

    leftTenantsInSheet.forEach(t => {
      const { proRataRent, refundDue } = getCalc(t);
      const effectiveCollected = refundPaid[t.id] ? proRataRent : t.amountPaid;
      const effectivePending = Math.max(0, proRataRent - t.amountPaid);
      totalPaid += effectiveCollected;
      totalPending += effectivePending;
      totalRefundDue += refundDue;
      if (refundPaid[t.id]) totalRefunded += refundDue;
    });

    return { totalPaid, totalPending, totalRefundDue, totalRefunded };
  }, [leftTenantsInSheet, getCalc, refundPaid]);

  const getPaymentBadgeClass = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-paid text-paid-foreground';
      case 'Partial': return 'bg-partial text-partial-foreground';
      default: return 'bg-pending text-pending-foreground';
    }
  };

  const rateModeLabel = (mode: RateMode) => {
    switch (mode) {
      case 'day-wise': return `Actual (÷${daysInMonth})`;
      case 'monthly-30': return 'Monthly ÷ 30';
      case 'custom': return 'Custom';
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
                <Button variant={filterRoom === null ? 'default' : 'outline'} size="sm" onClick={() => setFilterRoom(null)} className="shrink-0">All</Button>
                {uniqueRooms.map(roomNo => (
                  <Button key={roomNo} variant={filterRoom === roomNo ? 'default' : 'outline'} size="sm" onClick={() => setFilterRoom(roomNo)} className="shrink-0">Room {roomNo}</Button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between py-3 border-b">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedIds.size === filteredTenants.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-2 py-3 border-b text-sm">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-paid" />
                <span className="text-muted-foreground">Effective Collected:</span>
                <span className="font-medium text-paid">₹{summaryStats.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-pending" />
                <span className="text-muted-foreground">Pending:</span>
                <span className="font-medium text-pending">₹{summaryStats.totalPending.toLocaleString()}</span>
              </div>
              {summaryStats.totalRefundDue > 0 && (
                <div className="flex items-center gap-2 col-span-2">
                  <IndianRupee className="h-4 w-4 text-emerald-500" />
                  <span className="text-muted-foreground">Total Refund:</span>
                  <span className="font-medium text-emerald-500">₹{summaryStats.totalRefundDue.toLocaleString()}</span>
                  {summaryStats.totalRefunded > 0 && (
                    <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">
                      <Check className="h-3 w-3 mr-1" />₹{summaryStats.totalRefunded.toLocaleString()} refunded
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-between gap-2 py-3 border-b sticky top-0 bg-background z-10">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleBulkLock} disabled={selectedIds.size === 0 || isLocking} className="gap-2">
                <Lock className="h-4 w-4" />
                Lock {selectedIds.size} Tenant{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            </div>

            <ScrollArea className="h-[calc(85vh-360px)]">
              <div className="space-y-3 py-4">
                {filteredTenants.map(tenant => {
                  const mode = getRateMode(tenant.id);
                  const { perDayRate, proRataRent, refundDue, balance } = getCalc(tenant);
                  const isRefundPaid = refundPaid[tenant.id] || false;

                  return (
                    <div
                      key={tenant.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedIds.has(tenant.id) ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                      }`}
                    >
                      {/* Top row: checkbox + name + badges */}
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSelection(tenant.id)}>
                        <Checkbox
                          checked={selectedIds.has(tenant.id)}
                          onCheckedChange={() => toggleSelection(tenant.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{tenant.name}</span>
                            <Badge variant="outline" className="text-xs shrink-0">{tenant.roomNo}</Badge>
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
                            {balance > 0 && <span className="text-pending">₹{balance.toLocaleString()} due</span>}
                          </div>
                        </div>
                      </div>

                      {/* Per day rate mode selector */}
                      <div className="mt-2 ml-7">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <span className="text-xs text-muted-foreground mr-1">Per day:</span>
                          {(['monthly-30', 'day-wise', 'custom'] as RateMode[]).map(m => (
                            <Button
                              key={m}
                              variant={mode === m ? 'default' : 'outline'}
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={(e) => { e.stopPropagation(); setRateMode(tenant.id, m); }}
                            >
                              {rateModeLabel(m)}
                            </Button>
                          ))}
                        </div>
                        {mode === 'custom' && (
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              className="h-7 w-24 text-xs"
                              placeholder="Per day rate"
                              value={customRates[tenant.id] || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setCustomRates(prev => ({ ...prev, [tenant.id]: Number(e.target.value) }))}
                            />
                            <span className="text-xs text-muted-foreground">/day</span>
                          </div>
                        )}

                        {/* Calculation breakdown */}
                        <div className="p-2 rounded bg-muted/50 border border-border">
                          <div className="text-xs space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                {tenant.daysStayed} days × ₹{perDayRate}/day
                              </span>
                              <span>= ₹{proRataRent.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Amount Paid</span>
                              <span className="text-paid">₹{tenant.amountPaid.toLocaleString()}</span>
                            </div>
                            {refundDue > 0 && (
                              <>
                                <div className="flex justify-between font-medium text-emerald-500 border-t border-border pt-1 mt-1">
                                  <span>Refund Due</span>
                                  <span>₹{refundDue.toLocaleString()}</span>
                                </div>
                                {/* Refund paid toggle */}
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-muted-foreground">Refund Paid?</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs ${isRefundPaid ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                                      {isRefundPaid ? 'Yes' : 'No'}
                                    </span>
                                    <Switch
                                      checked={isRefundPaid}
                                      onCheckedChange={(val) => {
                                        setRefundPaid(prev => ({ ...prev, [tenant.id]: val }));
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                            {tenant.amountPaid < proRataRent && (
                              <div className="flex justify-between font-medium text-pending border-t border-border pt-1 mt-1">
                                <span>Still Due</span>
                                <span>₹{(proRataRent - tenant.amountPaid).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
