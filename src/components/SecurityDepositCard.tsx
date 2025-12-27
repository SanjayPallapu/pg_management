import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Wallet, CheckCircle, XCircle, IndianRupee, CalendarIcon, X, SquarePen } from 'lucide-react';
import { Room, Tenant } from '@/types';
import { useRooms } from '@/hooks/useRooms';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SecurityDepositCardProps {
  rooms: Room[];
}

interface TenantWithRoom extends Tenant {
  roomNo: string;
}

export const SecurityDepositCard = ({ rooms }: SecurityDepositCardProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [depositDialog, setDepositDialog] = useState<TenantWithRoom | null>(null);
  const [removeDialog, setRemoveDialog] = useState<TenantWithRoom | null>(null);
  const [editDialog, setEditDialog] = useState<TenantWithRoom | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [depositDate, setDepositDate] = useState<Date>(new Date());
  const [showEditActions, setShowEditActions] = useState(false);
  const [selectedTenantForAction, setSelectedTenantForAction] = useState<TenantWithRoom | null>(null);
  const { updateTenant } = useRooms();
  const { isAdmin } = useAuth();

  // Flatten all tenants with their room info
  const allTenants: TenantWithRoom[] = rooms.flatMap(room => 
    room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo,
    }))
  );

  const depositedTenants = allTenants.filter(t => t.securityDepositAmount && t.securityDepositAmount > 0);
  const notDepositedTenants = allTenants.filter(t => !t.securityDepositAmount || t.securityDepositAmount === 0);
  
  const totalDeposited = depositedTenants.reduce((sum, t) => sum + (t.securityDepositAmount || 0), 0);
  const depositedCount = depositedTenants.length;
  const totalTenants = allTenants.length;

  const handleAddDeposit = async () => {
    if (!depositDialog || depositAmount <= 0) return;

    try {
      await updateTenant.mutateAsync({
        tenantId: depositDialog.id,
        updates: {
          securityDepositAmount: depositAmount,
          securityDepositDate: format(depositDate, 'yyyy-MM-dd'),
        },
      });
      toast.success(`Deposit of ₹${depositAmount.toLocaleString()} recorded for ${depositDialog.name}`);
      setDepositDialog(null);
      setDepositAmount(5000);
      setDepositDate(new Date());
    } catch (error) {
      toast.error('Failed to record deposit');
    }
  };

  const handleEditDeposit = async () => {
    if (!editDialog || depositAmount <= 0) return;

    try {
      await updateTenant.mutateAsync({
        tenantId: editDialog.id,
        updates: {
          securityDepositAmount: depositAmount,
          securityDepositDate: format(depositDate, 'yyyy-MM-dd'),
        },
      });
      toast.success(`Deposit updated to ₹${depositAmount.toLocaleString()} for ${editDialog.name}`);
      setEditDialog(null);
      setDepositAmount(5000);
      setDepositDate(new Date());
    } catch (error) {
      toast.error('Failed to update deposit');
    }
  };

  const handleRemoveDeposit = async () => {
    if (!removeDialog) return;
    try {
      await updateTenant.mutateAsync({
        tenantId: removeDialog.id,
        updates: {
          securityDepositAmount: null,
          securityDepositDate: null,
        },
      });
      toast.success(`Deposit removed for ${removeDialog.name}`);
      setRemoveDialog(null);
    } catch (error) {
      toast.error('Failed to remove deposit');
    }
  };

  return (
    <>
      <Card 
        className="cursor-pointer transition-colors hover:bg-accent/50"
        onClick={() => setSheetOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Security Deposits</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">₹{totalDeposited.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total collected</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{depositedCount}/{totalTenants}</div>
              <p className="text-xs text-muted-foreground">Tenants deposited</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Tap to view details</p>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Security Deposits
            </SheetTitle>
            <SheetDescription>
              Track security deposits from tenants (optional formality)
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-paid-muted">
                <div className="flex items-center gap-2 text-paid">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Deposited</span>
                </div>
                <div className="text-2xl font-bold mt-1">{depositedCount}</div>
                <div className="text-sm text-muted-foreground">₹{totalDeposited.toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-lg bg-pending-muted">
                <div className="flex items-center gap-2 text-pending">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">Not Deposited</span>
                </div>
                <div className="text-2xl font-bold mt-1">{notDepositedTenants.length}</div>
                <div className="text-sm text-muted-foreground">Optional</div>
              </div>
            </div>

            {/* Deposited Tenants */}
            {depositedTenants.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Deposited ({depositedTenants.length})
                  </h3>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setShowEditActions(prev => !prev)}
                    >
                      <SquarePen className="h-4 w-4 mr-1" />
                      {showEditActions ? 'Done' : 'Edit'}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {depositedTenants.map(tenant => (
                    <div 
                      key={tenant.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-paid-muted border"
                    >
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Room {tenant.roomNo} • {tenant.securityDepositDate && format(new Date(tenant.securityDepositDate), 'dd MMM yyyy')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-paid text-paid-foreground">
                          <IndianRupee className="h-3 w-3 mr-1" />
                          {tenant.securityDepositAmount?.toLocaleString()}
                        </Badge>
                        {isAdmin && showEditActions && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDepositAmount(tenant.securityDepositAmount || 5000);
                                setDepositDate(tenant.securityDepositDate ? new Date(tenant.securityDepositDate) : new Date());
                                setEditDialog(tenant);
                              }}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-7 px-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemoveDialog(tenant);
                              }}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Not Deposited Tenants */}
            {notDepositedTenants.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Not Deposited ({notDepositedTenants.length})
                </h3>
                <div className="space-y-2">
                  {notDepositedTenants.map(tenant => (
                    <div 
                      key={tenant.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                    >
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">Room {tenant.roomNo}</div>
                      </div>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setDepositDialog(tenant);
                            setDepositAmount(5000);
                          }}
                        >
                          Add Deposit
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {allTenants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No tenants yet
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Deposit Dialog */}
      <AlertDialog open={!!depositDialog} onOpenChange={() => setDepositDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Record Security Deposit</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the deposit details for {depositDialog?.name} (Room {depositDialog?.roomNo})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Deposit Amount (₹)</Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                className="mt-2"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label>Deposit Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !depositDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {depositDate ? format(depositDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={depositDate}
                    onSelect={(date) => date && setDepositDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddDeposit} disabled={depositAmount <= 0}>
              Record Deposit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Deposit Confirmation Dialog */}
      <AlertDialog open={!!removeDialog} onOpenChange={() => setRemoveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Security Deposit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the deposit record for {removeDialog?.name} (Room {removeDialog?.roomNo})?
              This will clear the ₹{removeDialog?.securityDepositAmount?.toLocaleString()} deposit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveDeposit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Deposit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Deposit Dialog */}
      <AlertDialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Security Deposit</AlertDialogTitle>
            <AlertDialogDescription>
              Update the deposit details for {editDialog?.name} (Room {editDialog?.roomNo})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Deposit Amount (₹)</Label>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                className="mt-2"
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label>Deposit Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !depositDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {depositDate ? format(depositDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={depositDate}
                    onSelect={(date) => date && setDepositDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditDeposit} disabled={depositAmount <= 0}>
              Update Deposit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
