import { useState, useMemo } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { useMonthContext } from '@/contexts/MonthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Download, MessageCircle, Phone, Receipt, MessageSquare, Bell } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Room } from '@/types';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from '@/hooks/use-toast';
import { WhatsAppReceiptDialog } from './WhatsAppReceiptDialog';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
interface MonthlyRentSheetProps {
  rooms: Room[];
}
export const MonthlyRentSheet = ({
  rooms
}: MonthlyRentSheetProps) => {
  const {
    selectedMonth,
    selectedYear
  } = useMonthContext();
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
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [remainingPaymentMode, setRemainingPaymentMode] = useState<'upi' | 'cash'>('upi');
  const [overpaymentReason, setOverpaymentReason] = useState<string>('');
  const [overpaymentError, setOverpaymentError] = useState<boolean>(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    tenantName: string;
    tenantPhone: string;
    paymentMode: string;
    paymentDate: string;
    joiningDate: string;
    forMonth: string;
    roomNo: string;
    sharingType: string;
    amount: number;
    amountPaid: number;
    isFullPayment: boolean;
    remainingBalance?: number;
    tenantId?: string;
  } | null>(null);

  // Handle OS back gesture to close dialogs
  useBackGesture(!!paymentAmountTenant, () => setPaymentAmountTenant(null));
  useBackGesture(!!payRemainingTenant, () => setPayRemainingTenant(null));
  useBackGesture(confirmAction?.type === 'unpaid', () => setConfirmAction(null));
  const {
    payments,
    upsertPayment,
    markWhatsappSent
  } = useTenantPayments();
  const months = [{
    value: 1,
    label: 'January'
  }, {
    value: 2,
    label: 'February'
  }, {
    value: 3,
    label: 'March'
  }, {
    value: 4,
    label: 'April'
  }, {
    value: 5,
    label: 'May'
  }, {
    value: 6,
    label: 'June'
  }, {
    value: 7,
    label: 'July'
  }, {
    value: 8,
    label: 'August'
  }, {
    value: 9,
    label: 'September'
  }, {
    value: 10,
    label: 'October'
  }, {
    value: 11,
    label: 'November'
  }, {
    value: 12,
    label: 'December'
  }];
  const years = Array.from({
    length: 5
  }, (_, i) => new Date().getFullYear() - 2 + i);
  const eligibleTenants = useMemo(() => {
    const allTenants = rooms.flatMap(room => room.tenants.map(tenant => ({
      ...tenant,
      roomNo: room.roomNo
    })));
    // Filter tenants who are active in the selected month (joined before end of month AND not left before month started)
    return allTenants.filter(tenant => isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth));
  }, [rooms, selectedMonth, selectedYear]);
  const tenantsWithPayments = useMemo(() => {
    return eligibleTenants.map(tenant => {
      const payment = payments.find(p => p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear);
      const joinDate = new Date(tenant.startDate);
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const today = new Date();
      const todayDate = today.getDate();
      const isPastMonth = selectedYear < currentYear || selectedYear === currentYear && selectedMonth < currentMonth;
      const isFutureMonth = selectedYear > currentYear || selectedYear === currentYear && selectedMonth > currentMonth;
      const tenantDueDay = joinDate.getDate();
      let paymentCategory: 'paid' | 'partial' | 'overdue' | 'not-due' | 'advance-not-paid';
      if (payment?.paymentStatus === 'Paid') {
        paymentCategory = 'paid';
      } else if (payment?.paymentStatus === 'Partial') {
        paymentCategory = 'partial';
      } else if (isPastMonth) {
        paymentCategory = 'overdue';
      } else if (isFutureMonth) {
        paymentCategory = 'not-due';
      } else {
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
          paymentEntries: []
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
    const overduePayments = payments.filter(p => p.month === prevMonth && p.year === prevYear && p.paymentStatus !== 'Paid');
    return {
      total: overduePayments.reduce((sum, p) => sum + (p.amount - (p.amountPaid || 0)), 0),
      count: overduePayments.length
    };
  }, [selectedMonth, selectedYear, payments]);
  const stats = useMemo(() => {
    // Exclude locked tenants from stats
    const unlockedTenants = tenantsWithPayments.filter(t => !t.isLocked);
    const paid = unlockedTenants.filter(t => t.payment.paymentStatus === 'Paid');
    const partial = unlockedTenants.filter(t => t.payment.paymentStatus === 'Partial');
    const pending = unlockedTenants.filter(t => t.payment.paymentStatus === 'Pending');
    const partialCollected = partial.reduce((sum, t) => sum + (t.payment.amountPaid || 0), 0);
    const partialRemaining = partial.reduce((sum, t) => sum + (t.monthlyRent - (t.payment.amountPaid || 0)), 0);
    // Use actual amount paid (includes extras/overpayments) for paid tenants
    const paidCollected = paid.reduce((sum, t) => sum + (t.payment.amountPaid || t.monthlyRent), 0);
    return {
      totalCollected: paidCollected + partialCollected,
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
      setConfirmAction({
        type: 'unpaid',
        tenantId,
        tenantName
      });
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

    // Check for overpayment without reason
    const isOverpayment = paymentAmount > tenant.monthlyRent;
    if (isOverpayment && !overpaymentReason.trim()) {
      setOverpaymentError(true);
      return;
    }
    setOverpaymentError(false);
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
      mode: paymentMode
    };
    const existingEntries = tenant.payment.paymentEntries || [];
    const updatedEntries = [...existingEntries, newEntry];

    // Build notes for overpayment
    const notes = isOverpayment ? `Extra ₹${(paymentAmount - tenant.monthlyRent).toLocaleString()}: ${overpaymentReason.trim()}` : undefined;
    upsertPayment.mutate({
      tenantId: tenant.id,
      month: selectedMonth,
      year: selectedYear,
      paymentStatus: status,
      paymentDate: formattedDate,
      amount: tenant.monthlyRent,
      amountPaid: paymentAmount,
      // Store actual paid amount for overpayment tracking
      paymentEntries: updatedEntries,
      notes
    });
    toast({
      title: isFullPayment ? 'Payment marked as Paid' : 'Partial payment recorded',
      description: `₹${paymentAmount.toLocaleString()} paid${isOverpayment ? ` (includes extra ₹${(paymentAmount - tenant.monthlyRent).toLocaleString()})` : !isFullPayment ? ` • ₹${(tenant.monthlyRent - totalPaid).toLocaleString()} remaining` : ''}`
    });

    // Prepare receipt data for WhatsApp
    const room = rooms.find(r => r.tenants.some(t => t.id === tenant.id));
    const sharingType = room ? `${room.capacity} Sharing` : 'N/A';
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: paymentMode,
      paymentDate: format(paymentDate, 'dd-MMM-yyyy'),
      joiningDate: format(new Date(tenant.startDate), 'dd-MMM-yyyy'),
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: tenant.roomNo,
      sharingType: sharingType,
      amount: tenant.monthlyRent,
      amountPaid: paymentAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
      tenantId: tenant.id
    });
    setWhatsappDialogOpen(true);
    setPaymentAmountTenant(null);
    setPaymentAmount(0);
    setOverpaymentReason('');
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
      mode: remainingPaymentMode
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
      paymentEntries: updatedEntries
    });
    toast({
      title: isFullPayment ? 'Payment completed' : 'Partial payment recorded',
      description: isFullPayment ? `Full payment of ₹${tenant.monthlyRent.toLocaleString()} recorded` : `₹${totalPaid.toLocaleString()} paid • ₹${(tenant.monthlyRent - totalPaid).toLocaleString()} remaining`
    });

    // Prepare receipt data for WhatsApp
    const room = rooms.find(r => r.tenants.some(t => t.id === tenant.id));
    const sharingType = room ? `${room.capacity} Sharing` : 'N/A';
    setReceiptData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      paymentMode: remainingPaymentMode,
      paymentDate: format(payRemainingDate, 'dd-MMM-yyyy'),
      joiningDate: format(new Date(tenant.startDate), 'dd-MMM-yyyy'),
      forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
      roomNo: tenant.roomNo,
      sharingType: sharingType,
      amount: tenant.monthlyRent,
      amountPaid: payRemainingAmount,
      isFullPayment: isFullPayment,
      remainingBalance: isFullPayment ? 0 : tenant.monthlyRent - totalPaid,
      tenantId: tenant.id
    });
    setWhatsappDialogOpen(true);
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
          paymentEntries: []
        });
        toast({
          title: 'Payment status updated to Pending'
        });
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
        const payment = payments.find(p => p.tenantId === tenant.id && p.month === month.value && p.year === selectedYear);
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
    const colWidths = [{
      wch: 20
    }, {
      wch: 10
    }, {
      wch: 15
    }, {
      wch: 15
    }, {
      wch: 12
    }];
    months.forEach(() => colWidths.push({
      wch: 12
    }));
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, `Rent ${selectedYear}`);
    XLSX.writeFile(wb, `Rent_Sheet_${selectedYear}.xlsx`);
    toast({
      title: 'Excel file exported with full year data'
    });
  };
  return <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 px-3 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Rent Sheet</CardTitle>
            <Button onClick={exportToExcel} variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <div className="grid gap-3 md:grid-cols-2 mb-4">
            <div className="p-3 bg-paid-muted rounded-lg">
              <div className="text-2xl font-bold text-paid">₹{stats.totalCollected.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Collected ({stats.paidCount} tenants)</div>
            </div>
            <div className="p-3 bg-pending-muted rounded-lg">
              <div className="text-2xl font-bold text-pending">₹{stats.totalPending.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Pending ({stats.pendingCount} tenants)</div>
            </div>
          </div>

          {previousMonthOverdue.count > 0 && <div className="mb-4 p-3 bg-destructive/10 rounded-lg border border-destructive">
              <div className="font-semibold text-destructive">
                Previous Month Overdue: ₹{previousMonthOverdue.total.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                {previousMonthOverdue.count} tenant(s) from {months[(selectedMonth === 1 ? 12 : selectedMonth - 1) - 1]?.label}
              </div>
            </div>}

          <div className="space-y-2">
            {tenantsWithPayments.map(tenant => {
            const isPartial = tenant.paymentCategory === 'partial';
            const remaining = isPartial ? tenant.monthlyRent - (tenant.payment.amountPaid || 0) : 0;
            const bgClass = tenant.paymentCategory === 'paid' ? 'bg-paid-muted border-l-4 border-paid' : tenant.paymentCategory === 'partial' ? 'bg-partial-muted border-l-4 border-partial' : tenant.paymentCategory === 'overdue' ? 'bg-overdue-muted border-l-4 border-overdue' : tenant.paymentCategory === 'advance-not-paid' ? 'bg-advance-not-paid-muted border-l-4 border-advance-not-paid' : 'bg-not-due-muted border-l-4 border-not-due';
            const statusLabel = tenant.paymentCategory === 'paid' ? 'Paid' : tenant.paymentCategory === 'partial' ? 'Due' : tenant.paymentCategory === 'overdue' ? 'Overdue' : tenant.paymentCategory === 'advance-not-paid' ? 'Advance Due' : 'Pending';
            const whatsappSent = (tenant.payment as any).whatsappSent;
            const handleResendReceipt = () => {
              const lastEntry = tenant.payment.paymentEntries?.[tenant.payment.paymentEntries.length - 1];
              const room = rooms.find(r => r.tenants.some(t => t.id === tenant.id));
              const sharingType = room ? `${room.capacity} Sharing` : 'N/A';
              setReceiptData({
                tenantName: tenant.name,
                tenantPhone: tenant.phone,
                paymentMode: lastEntry?.mode || 'cash',
                paymentDate: lastEntry?.date ? format(new Date(lastEntry.date), 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy'),
                joiningDate: format(new Date(tenant.startDate), 'dd-MMM-yyyy'),
                forMonth: `${months[selectedMonth - 1].label} ${selectedYear}`,
                roomNo: tenant.roomNo,
                sharingType: sharingType,
                amount: tenant.monthlyRent,
                amountPaid: tenant.payment.amountPaid || tenant.monthlyRent,
                isFullPayment: tenant.payment.paymentStatus === 'Paid',
                remainingBalance: isPartial ? remaining : 0,
                tenantId: tenant.id
              });
              setWhatsappDialogOpen(true);
            };
            const sendPaymentReminder = () => {
              const phone = tenant.phone.replace(/\D/g, '');
              const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
              const monthName = months[selectedMonth - 1].label;
              const message = `Hi ${tenant.name}, this is a gentle reminder for your rent payment of ₹${tenant.monthlyRent.toLocaleString()} for ${monthName} ${selectedYear}. Please make the payment at your earliest convenience. Thank you!`;
              window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
            };
            return <div key={tenant.id} className={cn("p-3 rounded-xl transition-all duration-200", bgClass)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-sm">{tenant.isLocked && '🔒 '}{tenant.name}</div>
                      {/* Call badge */}
                      {tenant.phone && tenant.phone !== '••••••••••' && <a href={`tel:${tenant.phone}`} className="h-6 w-6 flex items-center justify-center rounded-full transition-colors text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30" title={`Call ${tenant.name}`}>
                          <Phone className="h-4 w-4" />
                        </a>}
                      {/* WhatsApp dropdown menu - shows for paid/partial, or dropdown for others */}
                      {tenant.phone && tenant.phone !== '••••••••••' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={`h-6 w-6 flex items-center justify-center rounded-full transition-colors ${whatsappSent ? 'text-green-600 bg-green-100 dark:bg-green-900/30' : 'text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'}`} title={whatsappSent ? 'Receipt sent - Click for options' : 'WhatsApp options'}>
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(tenant.payment.paymentStatus === 'Paid' || tenant.payment.paymentStatus === 'Partial') && (
                              <DropdownMenuItem onClick={handleResendReceipt} className="gap-2">
                                <Receipt className="h-4 w-4" />
                                Generate Receipt
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => window.open(`https://wa.me/${tenant.phone.replace(/\D/g, '')}`, '_blank')} className="gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Chat with Tenant
                            </DropdownMenuItem>
                            {tenant.payment.paymentStatus !== 'Paid' && (
                              <DropdownMenuItem onClick={sendPaymentReminder} className="gap-2">
                                <Bell className="h-4 w-4" />
                                Payment Reminder
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {isPartial ? <Badge className="bg-overdue text-overdue-foreground">
                        ₹{remaining.toLocaleString()}
                      </Badge> : <div className="font-semibold text-sm">₹{tenant.monthlyRent.toLocaleString()}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Room {tenant.roomNo}{tenant.isLocked && <span className="text-destructive ml-1">(Excluded from totals)</span>}</div>
                  
                  {isPartial && <div className="text-sm font-medium mb-2">
                      <span className="text-paid">Paid: ₹{(tenant.payment.amountPaid || 0).toLocaleString()}</span>
                      <span className="mx-2">•</span>
                      <span className="text-partial">Due: ₹{remaining.toLocaleString()}</span>
                    </div>}

                  <div className="flex justify-between items-end">
                    <div className="space-y-0.5">
                      <div className="text-xs text-muted-foreground">
                        Joined: {format(new Date(tenant.startDate), 'dd MMM yyyy')}
                      </div>
                      {/* Display payment entries */}
                      {tenant.payment.paymentEntries && tenant.payment.paymentEntries.length > 0 ? tenant.payment.paymentEntries.map((entry, idx) => <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>{entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Paid'}: ₹{entry.amount.toLocaleString()} on {format(new Date(entry.date), 'dd MMM yyyy')}</span>
                            {entry.mode && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.mode === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                              </span>}
                          </div>) : tenant.payment.paymentDate && <div className="text-xs text-muted-foreground">
                          Paid on: {format(new Date(tenant.payment.paymentDate), 'dd MMM yyyy')}
                        </div>}
                      {/* Display overpayment notes */}
                      {(tenant.payment as any).notes && <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                          📝 {(tenant.payment as any).notes}
                        </div>}
                    </div>
                    {isPartial ? <Button onClick={() => handlePayRemaining(tenant.id)} size="sm" className="text-xs h-7 px-3 bg-foreground text-background hover:bg-foreground/90">
                        Pay 
                      </Button> : <Button variant={tenant.payment.paymentStatus === 'Paid' ? 'default' : 'outline'} size="sm" className="text-xs h-7 px-3" onClick={() => handlePaymentToggle(tenant.id, tenant.name, tenant.payment.paymentStatus)}>
                        {tenant.payment.paymentStatus === 'Paid' ? 'Paid' : 'Mark Paid'}
                      </Button>}
                  </div>
                </div>;
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
              <Input type="number" value={paymentAmount} onChange={e => {
              setPaymentAmount(parseInt(e.target.value) || 0);
              // Reset overpayment reason when amount changes
              setOverpaymentReason('');
            }} className="mt-2" />
              {paymentAmountTenant && (() => {
              const tenant = tenantsWithPayments.find(t => t.id === paymentAmountTenant);
              if (tenant) {
                if (paymentAmount < tenant.monthlyRent) {
                  return <p className="text-sm text-partial mt-2">
                        This will be recorded as a partial payment. Remaining: ₹{(tenant.monthlyRent - paymentAmount).toLocaleString()}
                      </p>;
                } else if (paymentAmount > tenant.monthlyRent) {
                  const extra = paymentAmount - tenant.monthlyRent;
                  return <div className="mt-2 space-y-2">
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        Extra payment: ₹{extra.toLocaleString()} above rent of ₹{tenant.monthlyRent.toLocaleString()}
                      </p>
                      <div>
                        <Label className="text-sm">Reason for extra amount *</Label>
                        <Input type="text" value={overpaymentReason} onChange={e => {
                        setOverpaymentReason(e.target.value);
                        setOverpaymentError(false);
                      }} placeholder="e.g., Advance, Electricity, Next month" className={cn("mt-1", overpaymentError && "border-destructive")} />
                        {overpaymentError && <p className="text-sm text-destructive mt-1">Reason is required for extra payment</p>}
                      </div>
                    </div>;
                }
              }
              return null;
            })()}
            </div>
            <div>
              <Label>Payment Mode</Label>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant={paymentMode === 'upi' ? 'default' : 'outline'} className="flex-1" onClick={() => setPaymentMode('upi')}>
                  UPI/Online
                </Button>
                <Button type="button" variant={paymentMode === 'cash' ? 'default' : 'outline'} className="flex-1" onClick={() => setPaymentMode('cash')}>
                  Cash
                </Button>
              </div>
            </div>
            <div>
              <Label>Payment Date</Label>
              <Calendar mode="single" selected={paymentDate} onSelect={date => date && setPaymentDate(date)} className={cn("rounded-md border mt-2 pointer-events-auto")} />
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
              <Input type="number" value={payRemainingAmount} onChange={e => setPayRemainingAmount(parseInt(e.target.value) || 0)} className="mt-2" />
              {payRemainingTenant && (() => {
              const tenant = tenantsWithPayments.find(t => t.id === payRemainingTenant);
              if (tenant) {
                const remaining = tenant.monthlyRent - (tenant.payment.amountPaid || 0);
                const newTotal = (tenant.payment.amountPaid || 0) + payRemainingAmount;
                if (payRemainingAmount < remaining) {
                  return <p className="text-sm text-partial mt-2">
                        Partial payment. Total paid: ₹{newTotal.toLocaleString()} • Still due: ₹{(tenant.monthlyRent - newTotal).toLocaleString()}
                      </p>;
                }
              }
              return null;
            })()}
            </div>
            <div>
              <Label>Payment Mode</Label>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant={remainingPaymentMode === 'upi' ? 'default' : 'outline'} className="flex-1" onClick={() => setRemainingPaymentMode('upi')}>
                  UPI/Online
                </Button>
                <Button type="button" variant={remainingPaymentMode === 'cash' ? 'default' : 'outline'} className="flex-1" onClick={() => setRemainingPaymentMode('cash')}>
                  Cash
                </Button>
              </div>
            </div>
            <div>
              <Label>Payment Date</Label>
              <Calendar mode="single" selected={payRemainingDate} onSelect={date => date && setPayRemainingDate(date)} className={cn("rounded-md border mt-2 pointer-events-auto")} />
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

      {/* WhatsApp Receipt Dialog */}
      <WhatsAppReceiptDialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen} receiptData={receiptData} onWhatsappSent={() => {
      if (receiptData?.tenantId) {
        markWhatsappSent.mutate({
          tenantId: receiptData.tenantId,
          month: selectedMonth,
          year: selectedYear
        });
      }
    }} />

    </div>;
};