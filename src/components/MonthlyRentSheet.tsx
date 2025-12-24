import { useState, useMemo } from 'react';
import { useMonthContext } from '@/contexts/MonthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Download } from 'lucide-react';
import { Room } from '@/types';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';

interface MonthlyRentSheetProps {
  rooms: Room[];
}

export const MonthlyRentSheet = ({ rooms }: MonthlyRentSheetProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const [confirmAction, setConfirmAction] = useState<{
    type: 'paid' | 'unpaid';
    tenantId: string;
    tenantName: string;
  } | null>(null);
  const [paymentAmountTenant, setPaymentAmountTenant] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [payRemainingTenant, setPayRemainingTenant] = useState<string | null>(null);
  const [payRemainingAmount, setPayRemainingAmount] = useState<number>(0);
  const [payRemainingDate, setPayRemainingDate] = useState<Date>(new Date());
  const { payments, upsertPayment } = useTenantPayments();

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const eligibleTenants = useMemo(() => {
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));
    
    return allTenants.filter(tenant => {
      const joinDate = new Date(tenant.startDate);
      const joinMonth = joinDate.getMonth() + 1;
      const joinYear = joinDate.getFullYear();
      
      if (joinYear < selectedYear) return true;
      if (joinYear === selectedYear && joinMonth <= selectedMonth) return true;
      return false;
    });
  }, [rooms, selectedMonth, selectedYear]);

  const tenantsWithPayments = useMemo(() => {
    return eligibleTenants.map(tenant => {
      const payment = payments.find(
        p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
      );
      
      const joinDate = new Date(tenant.startDate);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const today = new Date();
      const todayDate = today.getDate();
      
      const isPastMonth =
        selectedYear < currentYear ||
        (selectedYear === currentYear && selectedMonth < currentMonth);
      
      const isFutureMonth =
        selectedYear > currentYear ||
        (selectedYear === currentYear && selectedMonth > currentMonth);
      
      const tenantDueDay = joinDate.getDate();
      
      let paymentCategory: 'paid' | 'partial' | 'overdue' | 'not-due' | 'advance-not-paid';
      
      if (payment?.paymentStatus === 'Paid') {
        paymentCategory = 'paid';
      }
      else if (payment?.paymentStatus === 'Partial') {
        paymentCategory = 'partial';
      }
      else if (isPastMonth) {
        paymentCategory = 'overdue';
      }
      else if (isFutureMonth) {
        paymentCategory = 'not-due';
      }
      else {
        if (todayDate < tenantDueDay) {
          paymentCategory = 'not-due';
        } else {
          paymentCategory = 'advance-not-paid';
        }
      }

      return {
        ...tenant,
        payment: payment || {
          paymentStatus: 'Pending' as const,
          amount: tenant.monthlyRent,
          paymentDate: undefined,
          amountPaid: 0,
          paymentEntries: [],
        },
        paymentCategory
      };
    });
  }, [eligibleTenants, selectedMonth, selectedYear, payments]);

  const previousMonthOverdue = useMemo(() => {
    let prevMonth = selectedMonth - 1;
    let prevYear = selectedYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = selectedYear - 1;
    }

    const overduePayments = payments.filter(
      p => p.month === prevMonth && p.year === prevYear && p.paymentStatus !== 'Paid'
    );

    return {
      total: overduePayments.reduce((sum, p) => sum + (p.amount - (p.amountPaid || 0)), 0),
      count: overduePayments.length,
    };
  }, [selectedMonth, selectedYear, payments]);

  const stats = useMemo(() => {
    const paid = tenantsWithPayments.filter(t => t.payment.paymentStatus === 'Paid');
    const partial = tenantsWithPayments.filter(t => t.payment.paymentStatus === 'Partial');
    const pending = tenantsWithPayments.filter(t => t.payment.paymentStatus === 'Pending');
    
    const partialCollected = partial.reduce((sum, t) => sum + (t.payment.amountPaid || 0), 0);
    const partialRemaining = partial.reduce((sum, t) => sum + (t.monthlyRent - (t.payment.amountPaid || 0)), 0);
    
    return {
      totalCollected: paid.reduce((sum, t) => sum + t.monthlyRent, 0) + partialCollected,
      totalPending: pending.reduce((sum, t) => sum + t.monthlyRent, 0) + partialRemaining,
      paidCount: paid.length,
      pendingCount: pending.length + partial.length
    };
  }, [tenantsWithPayments]);

  const handlePaymentToggle = (tenantId: string, tenantName: string, currentStatus: 'Paid' | 'Pending' | 'Partial') => {
    if (currentStatus === 'Pending') {
      const tenant = tenantsWithPayments.find(t => t.id === tenantId);
      if (tenant) {
        setPaymentAmountTenant(tenantId);
        setPaymentAmount(tenant.monthlyRent);
        setPaymentDate(new Date());
      }
    } else {
      setConfirmAction({ type: 'unpaid', tenantId, tenantName });
    }
  };

  const handlePayRemaining = (tenantId: string) => {
    const tenant = tenantsWithPayments.find(t => t.id === tenantId);
    if (tenant) {
      const remaining = tenant.monthlyRent - (tenant.payment.amountPaid || 0);
      setPayRemainingTenant(tenantId);
      setPayRemainingAmount(remaining);
      setPayRemainingDate(new Date());
    }
  };

  const confirmPaymentAmount = () => {
    if (!paymentAmountTenant) return;
    
    const tenant = tenantsWithPayments.find(t => t.id === paymentAmountTenant);
    if (!tenant) return;

    const formattedDate = format(paymentDate, 'yyyy-MM-dd');
    const existingPaid = tenant.payment.amountPaid || 0;
    const totalPaid = existingPaid + paymentAmount;
    const isFullPayment = totalPaid >= tenant.monthlyRent;
    const status = isFullPayment ? 'Paid' : 'Partial';

    // Build new payment entry
    const newEntry = {
      amount: paymentAmount,
      date: formattedDate,
      type: isFullPayment ? 'full' as const : 'partial' as const,
    };

    const existingEntries = tenant.payment.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];

    upsertPayment.mutate({
      tenantId: tenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: Math.min(totalPaid, tenant.monthlyRent),
      paymentEntries: updatedEntries,
    });

    toast({
      title: isFullPayment ? 'Payment marked as Paid' : 'Partial payment recorded',
      description: `₹${totalPaid.toLocaleString()} paid${!isFullPayment ? ` • ₹${(tenant.monthlyRent - totalPaid).toLocaleString()} remaining` : ''}`
    });

    setPaymentAmountTenant(null);
    setPaymentAmount(0);
  };

  const confirmPayRemaining = () => {
    if (!payRemainingTenant) return;
    
    const tenant = tenantsWithPayments.find(t => t.id === payRemainingTenant);
    if (!tenant) return;

    const formattedDate = format(payRemainingDate, 'yyyy-MM-dd');
    const previousPaid = tenant.payment.amountPaid || 0;
    const totalPaid = previousPaid + payRemainingAmount;
    const isFullPayment = totalPaid >= tenant.monthlyRent;

    // Add remaining payment entry
    const newEntry = {
      amount: payRemainingAmount,
      date: formattedDate,
      type: isFullPayment ? 'remaining' as const : 'partial' as const,
    };

    const existingEntries = tenant.payment.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];

    const status = isFullPayment ? 'Paid' : 'Partial';

    upsertPayment.mutate({
      tenantId: tenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: Math.min(totalPaid, tenant.monthlyRent),
      paymentEntries: updatedEntries,
    });

    toast({
      title: isFullPayment ? 'Payment completed' : 'Partial payment recorded',
      description: isFullPayment 
        ? `Full payment of ₹${tenant.monthlyRent.toLocaleString()} recorded`
        : `₹${totalPaid.toLocaleString()} paid • ₹${(tenant.monthlyRent - totalPaid).toLocaleString()} remaining`
    });

    setPayRemainingTenant(null);
    setPayRemainingAmount(0);
  };

  const confirmPaymentUnpaid = () => {
    if (confirmAction?.type === 'unpaid') {
      const tenant = tenantsWithPayments.find(t => t.id === confirmAction.tenantId);
      if (tenant) {
        upsertPayment.mutate({
          tenantId: tenant.id,
          month: selectedMonth,
          year: selectedYear,
          paymentStatus: 'Pending',
          paymentDate: undefined,
          amount: tenant.monthlyRent,
          amountPaid: 0,
          paymentEntries: [],
        });
        toast({ title: 'Payment status updated to Pending' });
      }
    }
    setConfirmAction(null);
  };

  const exportToExcel = () => {
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));

    const excelData = allTenants.map(tenant => {
      const row: any = {
        'Name': tenant.name,
        'Room No': tenant.roomNo,
        'Join Date': format(new Date(tenant.startDate), 'dd-MMM-yyyy'),
        'Phone': tenant.phone,
        'Monthly Rent': tenant.monthlyRent
      };

      months.forEach(month => {
        const payment = payments.find(
          p => p.tenantId === tenant.id && p.month === month.value && p.year === selectedYear
        );
        if (payment) {
          if (payment.paymentStatus === 'Partial') {
            row[month.label] = `Partial ₹${payment.amountPaid}`;
          } else if (payment.paymentDate) {
            row[month.label] = format(new Date(payment.paymentDate), 'dd-MMM');
          } else {
            row[month.label] = payment.paymentStatus;
          }
        } else {
          row[month.label] = '-';
        }
      });
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const colWidths = [{ wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    months.forEach(() => colWidths.push({ wch: 12 }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, `Rent ${selectedYear}`);

    XLSX.writeFile(wb, `Rent_Sheet_${selectedYear}.xlsx`);
    toast({ title: 'Excel file exported with full year data' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rent Sheet</CardTitle>
            <Button onClick={exportToExcel} variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="p-4 bg-paid-muted rounded-lg">
              <div className="text-2xl font-bold text-paid">₹{stats.totalCollected.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Collected ({stats.paidCount} tenants)</div>
            </div>
            <div className="p-4 bg-pending-muted rounded-lg">
              <div className="text-2xl font-bold text-pending">₹{stats.totalPending.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Pending ({stats.pendingCount} tenants)</div>
            </div>
          </div>

          {previousMonthOverdue.count > 0 && (
            <div className="mb-6 p-4 bg-destructive/10 rounded-lg border border-destructive">
              <div className="font-semibold text-destructive">
                Previous Month Overdue: ₹{previousMonthOverdue.total.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {previousMonthOverdue.count} tenant(s) from {months[(selectedMonth === 1 ? 12 : selectedMonth - 1) - 1]?.label}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {tenantsWithPayments.map(tenant => {
              const isPartial = tenant.paymentCategory === 'partial';
              const remaining = isPartial ? tenant.monthlyRent - (tenant.payment.amountPaid || 0) : 0;

              const bgClass = tenant.paymentCategory === 'paid' 
                ? 'bg-paid-muted border-l-4 border-paid' 
                : tenant.paymentCategory === 'partial'
                ? 'bg-partial-muted border-l-4 border-partial'
                : tenant.paymentCategory === 'overdue'
                ? 'bg-overdue-muted border-l-4 border-overdue'
                : tenant.paymentCategory === 'advance-not-paid'
                ? 'bg-advance-not-paid-muted border-l-4 border-advance-not-paid'
                : 'bg-not-due-muted border-l-4 border-not-due';
              
              const statusLabel = tenant.paymentCategory === 'paid' 
                ? 'Paid' 
                : tenant.paymentCategory === 'partial'
                ? 'Due'
                : tenant.paymentCategory === 'overdue'
                ? 'Overdue'
                : tenant.paymentCategory === 'advance-not-paid'
                ? 'Advance Due'
                : 'Pending';

              return (
                <div 
                  key={tenant.id} 
                  className={cn("p-3 rounded-xl transition-all duration-200", bgClass)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-sm">{tenant.name}</div>
                    {isPartial ? (
                      <Badge className="bg-overdue text-overdue-foreground">
                        ₹{remaining.toLocaleString()}
                      </Badge>
                    ) : (
                      <div className="font-semibold text-sm">₹{tenant.monthlyRent.toLocaleString()}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Room {tenant.roomNo}</div>
                  
                  {isPartial && (
                    <div className="text-sm font-medium mb-2">
                      <span className="text-paid">Paid: ₹{(tenant.payment.amountPaid || 0).toLocaleString()}</span>
                      <span className="mx-2">•</span>
                      <span className="text-partial">Due: ₹{remaining.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">
                        Joined: {format(new Date(tenant.startDate), 'dd MMM yyyy')}
                      </div>
                      {/* Display payment entries */}
                      {tenant.payment.paymentEntries && tenant.payment.paymentEntries.length > 0 ? (
                        tenant.payment.paymentEntries.map((entry, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Paid'}: ₹{entry.amount.toLocaleString()} on {format(new Date(entry.date), 'dd MMM yyyy')}
                          </div>
                        ))
                      ) : tenant.payment.paymentDate && (
                        <div className="text-xs text-muted-foreground">
                          Paid on: {format(new Date(tenant.payment.paymentDate), 'dd MMM yyyy')}
                        </div>
                      )}
                    </div>
                    {isPartial ? (
                      <Button
                        onClick={() => handlePayRemaining(tenant.id)}
                        size="sm"
                        className="text-xs h-7 px-3 bg-foreground text-background hover:bg-foreground/90"
                      >
                        Pay Remaining
                      </Button>
                    ) : (
                      <Button 
                        variant={tenant.payment.paymentStatus === 'Paid' ? 'default' : 'outline'} 
                        size="sm"
                        className="text-xs h-7 px-3"
                        onClick={() => handlePaymentToggle(tenant.id, tenant.name, tenant.payment.paymentStatus)}
                      >
                        {tenant.payment.paymentStatus === 'Paid' ? 'Paid' : 'Mark Paid'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Amount Dialog */}
      <AlertDialog open={!!paymentAmountTenant} onOpenChange={() => setPaymentAmountTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter Payment Amount</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the amount received and select date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                className="mt-2"
              />
              {paymentAmountTenant && (() => {
                const tenant = tenantsWithPayments.find(t => t.id === paymentAmountTenant);
                if (tenant && paymentAmount < tenant.monthlyRent) {
                  return (
                    <p className="text-sm text-partial mt-2">
                      This will be recorded as a partial payment. Remaining: ₹{(tenant.monthlyRent - paymentAmount).toLocaleString()}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div>
              <Label>Payment Date</Label>
              <Calendar
                mode="single"
                selected={paymentDate}
                onSelect={(date) => date && setPaymentDate(date)}
                className={cn("rounded-md border mt-2 pointer-events-auto")}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentAmountTenant(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPaymentAmount} disabled={paymentAmount <= 0}>
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pay Remaining Dialog */}
      <AlertDialog open={!!payRemainingTenant} onOpenChange={() => setPayRemainingTenant(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pay Remaining Amount</AlertDialogTitle>
            <AlertDialogDescription>
              Enter amount and select payment date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={payRemainingAmount}
                onChange={(e) => setPayRemainingAmount(parseInt(e.target.value) || 0)}
                className="mt-2"
              />
              {payRemainingTenant && (() => {
                const tenant = tenantsWithPayments.find(t => t.id === payRemainingTenant);
                if (tenant) {
                  const remaining = tenant.monthlyRent - (tenant.payment.amountPaid || 0);
                  const newTotal = (tenant.payment.amountPaid || 0) + payRemainingAmount;
                  if (payRemainingAmount < remaining) {
                    return (
                      <p className="text-sm text-partial mt-2">
                        Partial payment. Total paid: ₹{newTotal.toLocaleString()} • Still due: ₹{(tenant.monthlyRent - newTotal).toLocaleString()}
                      </p>
                    );
                  }
                }
                return null;
              })()}
            </div>
            <div>
              <Label>Payment Date</Label>
              <Calendar
                mode="single"
                selected={payRemainingDate}
                onSelect={(date) => date && setPayRemainingDate(date)}
                className={cn("rounded-md border mt-2 pointer-events-auto")}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPayRemainingTenant(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPayRemaining} disabled={payRemainingAmount <= 0}>
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for Undoing Paid */}
      <AlertDialog open={confirmAction?.type === 'unpaid'} onOpenChange={open => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Paid Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to remove the paid status for this rent for {confirmAction?.tenantName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPaymentUnpaid}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
