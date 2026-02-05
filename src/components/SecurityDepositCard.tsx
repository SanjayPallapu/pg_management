import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, MessageCircle, Receipt, Phone } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Wallet, CheckCircle, XCircle, IndianRupee, CalendarIcon, X, SquarePen } from 'lucide-react';
import { Room, Tenant } from '@/types';
import { useRooms } from '@/hooks/useRooms';
import { useAuth } from '@/hooks/useAuth';
import { useMonthContext } from '@/contexts/MonthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SecurityDepositReceiptDialog } from './SecurityDepositReceiptDialog';
import { SecurityDepositReceiptData } from './SecurityDepositReceiptTemplate';

interface SecurityDepositCardProps {
  rooms: Room[];
}

interface TenantWithRoom extends Tenant {
  roomNo: string;
  roomCapacity?: number;
}

export const SecurityDepositCard = ({ rooms }: SecurityDepositCardProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle OS back gesture to close sheet
  useBackGesture(sheetOpen, () => setSheetOpen(false));
  const [depositDialog, setDepositDialog] = useState<TenantWithRoom | null>(null);
  const [removeDialog, setRemoveDialog] = useState<TenantWithRoom | null>(null);
  const [editDialog, setEditDialog] = useState<TenantWithRoom | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(5000);
  const [depositDate, setDepositDate] = useState<Date>(new Date());
  const [depositMode, setDepositMode] = useState<'upi' | 'cash'>('upi');
  const [showEditActions, setShowEditActions] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{ data: SecurityDepositReceiptData; phone: string } | null>(null);
  // Handle OS back gesture to close sub-dialogs
  useBackGesture(!!depositDialog, () => setDepositDialog(null));
  useBackGesture(!!removeDialog, () => setRemoveDialog(null));
  useBackGesture(!!editDialog, () => setEditDialog(null));
  const [selectedTenantForAction, setSelectedTenantForAction] = useState<TenantWithRoom | null>(null);
  const { updateTenant } = useRooms();
  const { isAdmin } = useAuth();

  // Flatten all tenants with their room info
  const allTenants: TenantWithRoom[] = rooms.flatMap(room => 
    room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo,
      roomCapacity: room.capacity,
    }))
  );

  // Handle navigation state for opening security deposit
  useEffect(() => {
    const state = location.state as { 
      openSecurityDeposit?: boolean; 
      tenantId?: string;
      tenantName?: string;
      tenantPhone?: string;
      roomNo?: string;
      roomCapacity?: number;
    } | null;
    
    if (state?.openSecurityDeposit && state?.tenantId) {
      // First open the sheet
      setSheetOpen(true);
      
      // Try to find the tenant
      const tenant = allTenants.find(t => t.id === state.tenantId);
      
      if (tenant) {
        // Small delay to ensure sheet is open before opening dialog
        setTimeout(() => {
          setDepositDialog(tenant);
        }, 150);
      } else if (state.tenantName && state.roomNo) {
        // If tenant not found in current data, create a temporary tenant object from state
        const tempTenant: TenantWithRoom = {
          id: state.tenantId,
          name: state.tenantName,
          phone: state.tenantPhone || '',
          roomNo: state.roomNo,
          roomCapacity: state.roomCapacity,
          startDate: '',
          monthlyRent: 0,
          paymentStatus: 'Pending',
        };
        setTimeout(() => {
          setDepositDialog(tempTenant);
        }, 150);
      }
      
      // Clear the state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, allTenants, navigate, location.pathname]);

  // Listen for custom event from RoomCard/MonthlyRentSheet
  useEffect(() => {
    const handleOpenSecurityDeposit = (event: CustomEvent<{ 
      tenantId: string;
      tenantName?: string;
      tenantPhone?: string;
      roomNo?: string;
      roomCapacity?: number;
    }>) => {
       const detail = event.detail;
       if (!detail?.tenantId) return;
       
       // Always open sheet first
       setSheetOpen(true);
       
       // Try to find the tenant in allTenants, otherwise use event data
       setTimeout(() => {
         const tenant = allTenants.find(t => t.id === detail.tenantId);
         if (tenant) {
           setDepositDialog(tenant);
         } else if (detail.tenantName && detail.roomNo) {
        // Create temporary tenant object from event data
        const tempTenant: TenantWithRoom = {
             id: detail.tenantId,
             name: detail.tenantName,
             phone: detail.tenantPhone || '',
             roomNo: detail.roomNo,
             roomCapacity: detail.roomCapacity,
          startDate: '',
          monthlyRent: 0,
          paymentStatus: 'Pending',
        };
          setDepositDialog(tempTenant);
         }
       }, 150);
    };

    window.addEventListener('openSecurityDeposit', handleOpenSecurityDeposit as EventListener);
    return () => {
      window.removeEventListener('openSecurityDeposit', handleOpenSecurityDeposit as EventListener);
    };
   }, []); // Empty dependency - we'll lookup allTenants inside the callback

  const depositedTenants = allTenants.filter(t => t.securityDepositAmount && t.securityDepositAmount > 0);
  const notDepositedTenants = allTenants.filter(t => !t.securityDepositAmount || t.securityDepositAmount === 0);
  
  // Filter not deposited tenants by search
  const filteredNotDepositedTenants = useMemo(() => {
    if (!searchQuery.trim()) return notDepositedTenants;
    const query = searchQuery.toLowerCase();
    return notDepositedTenants.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.roomNo.toLowerCase().includes(query)
    );
  }, [notDepositedTenants, searchQuery]);
  
  const totalDeposited = depositedTenants.reduce((sum, t) => sum + (t.securityDepositAmount || 0), 0);
  const depositedCount = depositedTenants.length;
  const totalTenants = allTenants.length;

  // Calculate UPI and Cash totals for selected month deposits (not just current month)
  const { selectedMonth: ctxMonth, selectedYear: ctxYear } = useMonthContext();
  
  const selectedMonthDeposits = depositedTenants.filter(t => {
    if (!t.securityDepositDate) return false;
    const depositDate = new Date(t.securityDepositDate);
    return depositDate.getMonth() + 1 === ctxMonth && depositDate.getFullYear() === ctxYear;
  });
  
  const selectedMonthTotal = selectedMonthDeposits.reduce((sum, t) => sum + (t.securityDepositAmount || 0), 0);
  
  const selectedMonthUpi = selectedMonthDeposits
    .filter(t => t.securityDepositMode === 'upi')
    .reduce((sum, t) => sum + (t.securityDepositAmount || 0), 0);
  
  const selectedMonthCash = selectedMonthDeposits
    .filter(t => t.securityDepositMode === 'cash')
    .reduce((sum, t) => sum + (t.securityDepositAmount || 0), 0);

  const handleAddDeposit = async () => {
    if (!depositDialog || depositAmount <= 0) return;

    try {
      await updateTenant.mutateAsync({
        tenantId: depositDialog.id,
        updates: {
          securityDepositAmount: depositAmount,
          securityDepositDate: format(depositDate, 'yyyy-MM-dd'),
          securityDepositMode: depositMode,
        },
      });
      toast.success(`Deposit of ₹${depositAmount.toLocaleString()} recorded for ${depositDialog.name}`);
      setDepositDialog(null);
      setDepositAmount(5000);
      setDepositDate(new Date());
      setDepositMode('upi');
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
          securityDepositMode: depositMode,
        },
      });
      toast.success(`Deposit updated to ₹${depositAmount.toLocaleString()} for ${editDialog.name}`);
      setEditDialog(null);
      setDepositAmount(5000);
      setDepositDate(new Date());
      setDepositMode('upi');
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
          <CardTitle className="text-sm font-medium">Security Deposits</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0">
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
          {/* Selected month UPI/Cash breakdown */}
          {(selectedMonthUpi > 0 || selectedMonthCash > 0) && (
            <div className="flex justify-center gap-4 text-xs border-t pt-2 mt-2">
              <div className="text-blue-600 dark:text-blue-400">
                UPI: ₹{selectedMonthUpi.toLocaleString()}
              </div>
              <div className="text-green-600 dark:text-green-400">
                Cash: ₹{selectedMonthCash.toLocaleString()}
              </div>
            </div>
          )}
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
                  {depositedTenants.map(tenant => {
                    const openReceiptDialog = () => {
                      // Find room capacity for sharing type
                      const room = rooms.find(r => r.roomNo === tenant.roomNo);
                      setReceiptData({
                        data: {
                          tenant: {
                            name: tenant.name,
                            joiningDate: tenant.startDate,
                          },
                          room: {
                            roomNo: tenant.roomNo,
                            sharingType: room ? `${room.capacity} Sharing` : 'N/A',
                          },
                          deposit: {
                            amount: tenant.securityDepositAmount || 0,
                            date: tenant.securityDepositDate || new Date().toISOString(),
                            mode: (tenant.securityDepositMode as 'upi' | 'cash') || 'cash',
                          },
                        },
                        phone: tenant.phone,
                      });
                      setReceiptDialogOpen(true);
                    };

                    const openWhatsAppChat = () => {
                      const phone = tenant.phone.replace(/\D/g, '');
                      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
                      window.open(`https://wa.me/${formattedPhone}`, '_blank');
                    };

                    return (
                    <div 
                      key={tenant.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-paid-muted border"
                    >
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          Room {tenant.roomNo} • {tenant.securityDepositDate && format(new Date(tenant.securityDepositDate), 'dd MMM yyyy')}
                          {(tenant as any).securityDepositMode && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              (tenant as any).securityDepositMode === 'upi' 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {(tenant as any).securityDepositMode === 'upi' ? 'UPI' : 'Cash'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Call badge */}
                        {tenant.phone && tenant.phone !== '••••••••••' && (
                          <a 
                            href={`tel:${tenant.phone}`}
                            className="p-1.5 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            title={`Call ${tenant.name}`}
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {/* WhatsApp dropdown menu */}
                        {tenant.phone && tenant.phone !== '••••••••••' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button 
                                className="p-1.5 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                title="WhatsApp options"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={openReceiptDialog} className="gap-2">
                                <Receipt className="h-4 w-4" />
                                Generate Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={openWhatsAppChat} className="gap-2">
                                <MessageCircle className="h-4 w-4" />
                                Chat with Tenant
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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
                                setDepositMode((tenant.securityDepositMode as 'upi' | 'cash') || 'upi');
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
                  );})}
                </div>
              </div>
            )}

            {/* Not Deposited Tenants */}
            {notDepositedTenants.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    Not Deposited ({notDepositedTenants.length})
                  </h3>
                  <div className="relative flex-1 max-w-[200px]">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search tenant..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-7 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {filteredNotDepositedTenants.map(tenant => (
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
                  {searchQuery && filteredNotDepositedTenants.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No tenants found for "{searchQuery}"
                    </div>
                  )}
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
              <Label>Payment Mode</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={depositMode === 'upi' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setDepositMode('upi')}
                >
                  UPI/Online
                </Button>
                <Button
                  type="button"
                  variant={depositMode === 'cash' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setDepositMode('cash')}
                >
                  Cash
                </Button>
              </div>
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
              <Label>Payment Mode</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={depositMode === 'upi' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setDepositMode('upi')}
                >
                  UPI/Online
                </Button>
                <Button
                  type="button"
                  variant={depositMode === 'cash' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setDepositMode('cash')}
                >
                  Cash
                </Button>
              </div>
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

      {/* Security Deposit Receipt Dialog */}
      <SecurityDepositReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        data={receiptData?.data || null}
        tenantPhone={receiptData?.phone}
      />
    </>
  );
};
