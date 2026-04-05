import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Clock, Plus, Phone, MessageCircle, Bell, ArrowLeft } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRentCalculations, TenantWithPayment } from '@/hooks/useRentCalculations';
import { PaymentReminderDialog } from '@/components/PaymentReminderDialog';

interface PendingTenantsCardProps {
  rooms: Room[];
}

export const PendingTenantsCard = ({ rooms }: PendingTenantsCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overdue' | 'not-yet-due'>('overdue');
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderTenant, setReminderTenant] = useState<TenantWithPayment | null>(null);

  const handleOpenReminder = (tenant: TenantWithPayment) => {
    setReminderTenant(tenant);
    setReminderOpen(true);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const { overdueTenants, advanceNotPaidTenants, notDueTenants, partialTenants } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  // Helper to check if tenant has left
  const isLeftTenant = (tenant: { endDate?: string }) => {
    if (!tenant.endDate) return false;
    const endDate = new Date(tenant.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return endDate <= today;
  };

  // Sort by day-of-month from startDate (due date order for reminders)
  const sortByJoiningDate = (a: TenantWithPayment, b: TenantWithPayment) => {
    const dayA = a.startDate ? new Date(a.startDate).getDate() : 0;
    const dayB = b.startDate ? new Date(b.startDate).getDate() : 0;
    return dayA - dayB;
  };

  // Combine overdue + advance-not-paid for "Overdue" tab (excluding left tenants), sorted by joining date
  const overdueCombined = useMemo(() => {
    return [...overdueTenants, ...advanceNotPaidTenants].filter(t => !t.isLocked && !isLeftTenant(t)).sort(sortByJoiningDate);
  }, [overdueTenants, advanceNotPaidTenants]);

  // Not yet due (excluding locked and left), sorted by joining date
  const notYetDue = useMemo(() => {
    return notDueTenants.filter(t => !t.isLocked && !isLeftTenant(t)).sort(sortByJoiningDate);
  }, [notDueTenants]);

  const overdueTotal = overdueCombined.reduce((sum, t) => sum + t.monthlyRent, 0);
  const notYetDueTotal = notYetDue.reduce((sum, t) => sum + t.monthlyRent, 0);

  const currentTenants = activeTab === 'overdue' ? overdueCombined : notYetDue;

  const handleToggleTenant = (tenantId: string) => {
    const newSet = new Set(selectedTenants);
    if (newSet.has(tenantId)) {
      newSet.delete(tenantId);
    } else {
      newSet.add(tenantId);
    }
    setSelectedTenants(newSet);
  };

  const selectedTotal = useMemo(() => {
    return currentTenants
      .filter(t => selectedTenants.has(t.id))
      .reduce((sum, t) => sum + t.monthlyRent, 0);
  }, [currentTenants, selectedTenants]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'overdue' | 'not-yet-due');
    setSelectedTenants(new Set()); // Clear selection when switching tabs
  };

  return (
    <>
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium">Pending Tenants</CardTitle>
          <AlertTriangle className="h-4 w-4 text-pending" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 rounded-lg bg-pending-muted">
              <div className="text-xs text-muted-foreground">Overdue</div>
              <div className="font-bold text-pending">{overdueCombined.length}</div>
              <div className="text-xs text-muted-foreground">₹{overdueTotal.toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <div className="text-xs text-muted-foreground">Not Yet Due</div>
              <div className="font-bold text-blue-600 dark:text-blue-400">{notYetDue.length}</div>
              <div className="text-xs text-muted-foreground">₹{notYetDueTotal.toLocaleString()}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Tap to select tenants</p>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] [&>button]:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-4 rounded-full"
            onClick={() => setSheetOpen(false)}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <SheetHeader>
            <SheetTitle className="pl-8">Select Pending Tenants</SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overdue" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Overdue ({overdueCombined.length})
              </TabsTrigger>
              <TabsTrigger value="not-yet-due" className="gap-1">
                <Clock className="h-3 w-3" />
                Not Yet Due ({notYetDue.length})
              </TabsTrigger>
            </TabsList>

            {/* Select All Toggle */}
            {currentTenants.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  checked={currentTenants.length > 0 && currentTenants.every(t => selectedTenants.has(t.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTenants(new Set(currentTenants.map(t => t.id)));
                    } else {
                      setSelectedTenants(new Set());
                    }
                  }}
                />
                <span className="text-sm font-medium">Select All ({currentTenants.length})</span>
              </div>
            )}

            {/* Selected Summary */}
            {selectedTenants.size > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold">{selectedTenants.size} tenant(s) selected</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">₹{selectedTotal.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total amount</div>
                  </div>
                </div>
              </div>
            )}

            <TabsContent value="overdue" className="mt-4">
              <ScrollArea className="h-[calc(85vh-220px)]">
                <div className="space-y-2 pr-4">
                  {overdueCombined.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No overdue tenants</p>
                  ) : (
                    overdueCombined.map(tenant => (
                      <TenantSelectItem 
                        key={tenant.id}
                        tenant={tenant}
                        isSelected={selectedTenants.has(tenant.id)}
                        onToggle={handleToggleTenant}
                        categoryColor="pending"
                        onReminder={handleOpenReminder}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="not-yet-due" className="mt-4">
              <ScrollArea className="h-[calc(85vh-220px)]">
                <div className="space-y-2 pr-4">
                  {notYetDue.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No upcoming dues</p>
                  ) : (
                    notYetDue.map(tenant => (
                      <TenantSelectItem 
                        key={tenant.id}
                        tenant={tenant}
                        isSelected={selectedTenants.has(tenant.id)}
                        onToggle={handleToggleTenant}
                        categoryColor="blue"
                        onReminder={handleOpenReminder}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <PaymentReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        reminderData={reminderTenant ? {
          tenantName: reminderTenant.name,
          tenantPhone: reminderTenant.phone || '',
          joiningDate: reminderTenant.startDate || '',
          forMonth: `${monthNames[selectedMonth]} ${selectedYear}`,
          roomNo: reminderTenant.roomNo || '',
          sharingType: '',
          amount: reminderTenant.monthlyRent,
          amountPaid: reminderTenant.amountPaid || 0,
          balance: reminderTenant.monthlyRent - (reminderTenant.amountPaid || 0),
        } : null}
      />
    </>
  );
};

interface TenantSelectItemProps {
  tenant: TenantWithPayment;
  isSelected: boolean;
  onToggle: (id: string) => void;
  categoryColor: 'pending' | 'blue';
}

const TenantSelectItem = ({ tenant, isSelected, onToggle, categoryColor, onReminder }: TenantSelectItemProps & { onReminder?: (tenant: TenantWithPayment) => void }) => {
  const bgClass = categoryColor === 'pending' 
    ? 'bg-pending-muted border-pending/30' 
    : 'bg-blue-500/10 border-blue-500/30';

  return (
    <div 
      className={`p-3 rounded-lg border ${bgClass} ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onToggle(tenant.id)}
    >
      <div className="flex items-center gap-3">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onToggle(tenant.id)}
          className="pointer-events-none"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">{tenant.name}</span>
            {tenant.phone && tenant.phone !== '••••••••••' && (
              <>
                <a
                  href={`tel:${tenant.phone}`}
                  className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3 w-3" />
                </a>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
                      <MessageCircle className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onReminder?.(tenant); }}
                      className="flex items-center gap-2"
                    >
                      <Bell className="h-4 w-4" />
                      Payment Reminder
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Chat with Tenant
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Room {tenant.roomNo}
            {tenant.startDate && (
              <span className="ml-2 text-xs">
                Joined: {new Date(tenant.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <Badge className={categoryColor === 'pending' ? 'bg-pending text-pending-foreground' : 'bg-blue-500 text-white'}>
          ₹{tenant.monthlyRent.toLocaleString()}
        </Badge>
      </div>
    </div>
  );
};
