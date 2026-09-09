import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useRooms } from '@/hooks/useRooms';
import { useSettlementCalculations, SettlementTenant } from '@/hooks/useSettlementCalculations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { 
  Users, 
  IndianRupee, 
  Calendar, 
  Phone, 
  Search, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Calculator, 
  Share2, 
  RotateCcw,
  ArrowRight,
  Receipt,
  HelpCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { parseDateOnly } from '@/utils/dateOnly';
import { toast } from '@/hooks/use-toast';
import { applyStyledExport, saveAndShareExcel } from '@/utils/excelStyles';
import { useAuth } from '@/hooks/useAuth';

export default function SettlementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'refunds' ? 'refunds' : searchParams.get('tab') === 'calculator' ? 'calculator' : 'settlements';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'pending' | 'partial'>('all');

  const { rooms, isLoading } = useRooms();
  const { 
    leftTenants, 
    summary, 
    selectedMonth, 
    selectedYear, 
    monthName, 
    markRefundPaid, 
    markRefundUnpaid 
  } = useSettlementCalculations(rooms);

  // Refund dialog state
  const [refundDialogTenant, setRefundDialogTenant] = useState<SettlementTenant | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [refundPaymentMode, setRefundPaymentMode] = useState<'upi' | 'cash'>('upi');

  // Calculator state
  const [calcMonthlyRent, setCalcMonthlyRent] = useState<number>(8000);
  const [calcDaysStayed, setCalcDaysStayed] = useState<number>(10);
  const [calcAmountPaid, setCalcAmountPaid] = useState<number>(8000);
  const [calcDeductions, setCalcDeductions] = useState<number>(0);
  const [calcDeductionNote, setCalcDeductionNote] = useState<string>('Electricity / Maintenance');
  const [calcTenantName, setCalcTenantName] = useState<string>('');

  const filteredTenants = useMemo(() => {
    return leftTenants.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.phone && t.phone.includes(searchQuery));

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'settled') return t.status === 'Settled' || t.status === 'Refunded';
      if (statusFilter === 'pending') return t.status === 'Pending' || t.status === 'Refund Pending';
      if (statusFilter === 'partial') return t.status === 'Partial';
      return true;
    });
  }, [leftTenants, searchQuery, statusFilter]);

  const refundEligibleTenants = useMemo(() => {
    return leftTenants.filter(t => t.refundDue > 0);
  }, [leftTenants]);

  // Calculator computed output
  const calcDailyRate = Math.round(calcMonthlyRent / 30);
  const calcProRataRent = calcDailyRate * calcDaysStayed;
  const calcNetRefund = Math.max(0, calcAmountPaid - calcProRataRent - calcDeductions);
  const calcNetPendingDue = Math.max(0, (calcProRataRent + calcDeductions) - calcAmountPaid);

  const handleExportExcel = useCallback(async () => {
    if (leftTenants.length === 0) {
      toast({ title: 'No data to export', description: `No left tenants for ${monthName} ${selectedYear}` });
      return;
    }

    const data = leftTenants.map(t => ({
      'Room No': t.roomNo,
      'Tenant Name': t.name,
      'Phone': t.phone || '',
      'Monthly Rent': t.monthlyRent,
      'Join Date': t.startDate ? format(parseDateOnly(t.startDate), 'dd MMM yyyy') : '',
      'Leave Date': t.endDate ? format(parseDateOnly(t.endDate), 'dd MMM yyyy') : '',
      'Days Stayed': t.daysStayed,
      'Daily Rate': t.dailyRate,
      'Pro-Rata Due': t.effectiveRent,
      'Discount': t.discount,
      'Extra': t.extra,
      'Final Due': t.finalDue,
      'Amount Paid': t.amountPaid,
      'Pending Balance': t.balance,
      'Refund Due': t.refundDue,
      'Status': t.status,
    }));

    const colWidths = [
      { wch: 10 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 15 },
      { wch: 14 },
      { wch: 16 },
    ];

    const fileName = `Settlement_Summary_${monthName}_${selectedYear}.xlsx`;
    const wb = applyStyledExport(data, 'Settlements', colWidths, { fileName });
    try {
      await saveAndShareExcel(wb, fileName);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }, [leftTenants, monthName, selectedYear]);

  const handleOpenRefundModal = (tenant: SettlementTenant) => {
    setRefundDialogTenant(tenant);
    setRefundAmountInput(String(tenant.refundDue));
    setRefundPaymentMode('upi');
  };

  const handleConfirmRefund = () => {
    if (!refundDialogTenant) return;
    const amount = Number(refundAmountInput) || refundDialogTenant.refundDue;
    markRefundPaid(refundDialogTenant, amount);
    toast({
      title: 'Refund Recorded',
      description: `₹${amount.toLocaleString()} refund recorded for ${refundDialogTenant.name} (${refundPaymentMode.toUpperCase()})`,
    });
    setRefundDialogTenant(null);
  };

  const shareRefundWhatsApp = (tenant: SettlementTenant) => {
    const text = `*PG Hub Move-out Refund Breakdown*\n\n` +
      `Hello ${tenant.name},\n` +
      `Here is your move-out pro-rata calculation for Room ${tenant.roomNo} (${monthName} ${selectedYear}):\n\n` +
      `• Monthly Rent: ₹${tenant.monthlyRent.toLocaleString()}\n` +
      `• Days Stayed: ${tenant.daysStayed} days (₹${tenant.dailyRate}/day)\n` +
      `• Pro-rata Rent: ₹${tenant.effectiveRent.toLocaleString()}\n` +
      (tenant.discount > 0 ? `• Discount: -₹${tenant.discount.toLocaleString()}\n` : '') +
      (tenant.extra > 0 ? `• Deductions / Extra: +₹${tenant.extra.toLocaleString()}\n` : '') +
      `• Total Due: ₹${tenant.finalDue.toLocaleString()}\n` +
      `• Amount Paid: ₹${tenant.amountPaid.toLocaleString()}\n\n` +
      `*Net Refund Amount: ₹${tenant.refundDue.toLocaleString()}*\n` +
      `Status: ${tenant.isRefunded ? '✅ Refund Processed' : '⏳ Refund Due'}\n\n` +
      `Thank you for staying with us!`;

    const url = `https://wa.me/${tenant.phone ? tenant.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareCalculatorWhatsApp = () => {
    const text = `*PG Early Departure & Refund Calculation*\n\n` +
      (calcTenantName ? `Tenant: ${calcTenantName}\n` : '') +
      `• Monthly Rent: ₹${calcMonthlyRent.toLocaleString()}\n` +
      `• Days Stayed: ${calcDaysStayed} days (Daily rate: ₹${calcDailyRate})\n` +
      `• Pro-rata Rent: ₹${calcProRataRent.toLocaleString()}\n` +
      (calcDeductions > 0 ? `• Deductions (${calcDeductionNote || 'Utilities'}): ₹${calcDeductions.toLocaleString()}\n` : '') +
      `• Rent Paid Upfront: ₹${calcAmountPaid.toLocaleString()}\n\n` +
      (calcNetRefund > 0 
        ? `*👉 Net Refund to Tenant: ₹${calcNetRefund.toLocaleString()}*`
        : `*👉 Net Pending Due from Tenant: ₹${calcNetPendingDue.toLocaleString()}*`
      );

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <MonthYearPicker />
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        className="h-8 gap-1.5 px-2.5 text-xs font-medium"
        title="Export to Excel"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Export</span>
      </Button>
    </div>
  );

  return (
    <AppLayout title={`Settlements (${monthName} ${selectedYear})`} headerActions={headerActions}>
      <div className="mx-auto max-w-5xl px-3 sm:px-6 py-4 space-y-4">
        {/* KPI Top Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Left Tenants</span>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold">{summary.leftCount}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{summary.settledCount} settled</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Pro-Rata Due</span>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-xl sm:text-2xl font-bold">₹{summary.totalDue.toLocaleString()}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Calculated stay</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Collected</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">₹{summary.totalPaid.toLocaleString()}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">₹{summary.totalBalance.toLocaleString()} pending</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-amber-500/5 shadow-xs">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Refunds Due</span>
                <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">
                ₹{summary.totalRefundDue.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.refundPendingCount > 0 
                  ? `₹${summary.pendingRefundAmount.toLocaleString()} to refund` 
                  : 'All refunds clear'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchParams({ tab: val }, { replace: true }); }} className="w-full">
          <TabsList className="grid grid-cols-3 w-full sm:w-[420px] bg-muted/60 p-1">
            <TabsTrigger value="settlements" className="text-xs sm:text-sm font-medium">
              Settlements ({summary.leftCount})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="text-xs sm:text-sm font-medium relative">
              Refundable ({summary.refundEligibleCount})
              {summary.refundPendingCount > 0 && (
                <span className="ml-1.5 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="calculator" className="text-xs sm:text-sm font-medium">
              Calculator
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════
              TAB 1: SETTLEMENTS
             ═══════════════════════════════════════════════ */}
          <TabsContent value="settlements" className="space-y-3 mt-3">
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by tenant name, room number, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'settled', 'pending', 'partial'] as const).map((st) => (
                  <Button
                    key={st}
                    variant={statusFilter === st ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 px-3 capitalize text-xs shrink-0"
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </Button>
                ))}
              </div>
            </div>

            {/* List of Left Tenants */}
            {filteredTenants.length === 0 ? (
              <Card className="border-dashed py-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <h3 className="font-semibold text-base text-foreground">No settlements found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery ? 'No tenant matched your search query.' : `No tenants left in ${monthName} ${selectedYear}.`}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTenants.map((tenant) => (
                  <Card key={tenant.id} className="border-border/70 shadow-xs hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      {/* Top Header: Name, Room, Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground leading-snug">{tenant.name}</span>
                            <Badge variant="outline" className="text-[11px] font-semibold">
                              Room {tenant.roomNo} ({tenant.capacity}S)
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Left: {tenant.endDate ? format(parseDateOnly(tenant.endDate), 'dd MMM yyyy') : 'N/A'}
                            </span>
                            {tenant.startDate && (
                              <span>Joined: {format(parseDateOnly(tenant.startDate), 'dd MMM yyyy')}</span>
                            )}
                          </div>
                        </div>

                        <Badge
                          className={
                            tenant.status === 'Settled' || tenant.status === 'Refunded'
                              ? 'bg-emerald-600 text-white'
                              : tenant.status === 'Refund Pending'
                              ? 'bg-amber-500 text-white'
                              : tenant.status === 'Partial'
                              ? 'bg-blue-600 text-white'
                              : 'bg-rose-600 text-white'
                          }
                        >
                          {tenant.status}
                        </Badge>
                      </div>

                      {/* Pro-rata stay box */}
                      <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs space-y-1.5">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Stay calculation:</span>
                          <span className="font-medium text-foreground">
                            {tenant.daysStayed} days × ₹{tenant.dailyRate}/day
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Pro-rata Rent:</span>
                          <span className="font-medium text-foreground">₹{tenant.effectiveRent.toLocaleString()}</span>
                        </div>
                        {tenant.discount > 0 && (
                          <div className="flex justify-between items-center text-emerald-600">
                            <span>Discount Given:</span>
                            <span>-₹{tenant.discount.toLocaleString()}</span>
                          </div>
                        )}
                        {tenant.extra > 0 && (
                          <div className="flex justify-between items-center text-amber-600">
                            <span>Extra Charges:</span>
                            <span>+₹{tenant.extra.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t font-semibold">
                          <span>Final Due Amount:</span>
                          <span>₹{tenant.finalDue.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Payment & Balance Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-3 text-xs sm:text-sm">
                          <span className="text-muted-foreground">Paid: <strong className="text-foreground">₹{tenant.amountPaid.toLocaleString()}</strong></span>
                          {tenant.balance > 0 && (
                            <span className="text-rose-600 font-semibold">Pending: ₹{tenant.balance.toLocaleString()}</span>
                          )}
                          {tenant.refundDue > 0 && (
                            <span className="text-amber-600 font-semibold">Refund Due: ₹{tenant.refundDue.toLocaleString()}</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {tenant.phone && (
                            <a
                              href={`tel:${tenant.phone}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                              title={`Call ${tenant.name}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {tenant.refundDue > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                              onClick={() => handleOpenRefundModal(tenant)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              {tenant.isRefunded ? 'Refunded' : 'Refund'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => shareRefundWhatsApp(tenant)}
                            title="Share on WhatsApp"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════
              TAB 2: REFUNDABLE (LEFT EARLY)
             ═══════════════════════════════════════════════ */}
          <TabsContent value="refunds" className="space-y-4 mt-3">
            {/* Explanatory Banner */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Early Move-out Refund Protection</strong>
                <p className="mt-0.5 opacity-90 leading-relaxed">
                  When a tenant pays the full month's rent upfront and suddenly leaves early (e.g. stayed only 10 days), their pro-rata stay is calculated and the remaining excess amount is tracked here for return.
                </p>
              </div>
            </div>

            {/* List of Refund Eligible Tenants */}
            {refundEligibleTenants.length === 0 ? (
              <Card className="border-dashed py-12 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
                <h3 className="font-semibold text-base text-foreground">No Pending Refunds</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  No tenants in {monthName} {selectedYear} paid excess rent over their stay.
                </p>
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('calculator')}>
                    <Calculator className="h-3.5 w-3.5 mr-1.5" />
                    Open Refund Calculator
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {refundEligibleTenants.map((tenant) => (
                  <Card key={tenant.id} className="border-amber-500/20 shadow-xs bg-card">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-foreground">{tenant.name}</span>
                            <Badge variant="outline" className="text-xs">Room {tenant.roomNo}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Stayed {tenant.daysStayed} days (Leave date: {tenant.endDate ? format(parseDateOnly(tenant.endDate), 'dd MMM yyyy') : 'N/A'})
                          </p>
                        </div>

                        <Badge className={tenant.isRefunded ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}>
                          {tenant.isRefunded ? 'Refunded' : 'Refund Due'}
                        </Badge>
                      </div>

                      {/* Refund Calculation breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-muted/40 p-3 text-center text-xs">
                        <div>
                          <span className="text-muted-foreground block">Rent Paid</span>
                          <strong className="text-sm text-foreground">₹{tenant.amountPaid.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Pro-Rata Stay ({tenant.daysStayed}d)</span>
                          <strong className="text-sm text-foreground">₹{tenant.effectiveRent.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Daily Rate</span>
                          <strong className="text-sm text-foreground">₹{tenant.dailyRate}/day</strong>
                        </div>
                        <div className="bg-amber-500/10 rounded-lg p-1">
                          <span className="text-amber-800 dark:text-amber-300 font-semibold block">Refund Amount</span>
                          <strong className="text-sm text-amber-700 dark:text-amber-300">₹{tenant.refundDue.toLocaleString()}</strong>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">
                          {tenant.isRefunded && tenant.refundPaidAt && (
                            <span>Paid on {format(new Date(tenant.refundPaidAt), 'dd MMM yyyy, h:mm a')}</span>
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                            onClick={() => shareRefundWhatsApp(tenant)}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                            Send Receipt
                          </Button>

                          {tenant.isRefunded ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground hover:text-rose-600"
                              onClick={() => markRefundUnpaid(tenant.id)}
                            >
                              Undo
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-amber-600 text-white hover:bg-amber-700"
                              onClick={() => handleOpenRefundModal(tenant)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark Refunded
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════
              TAB 3: REFUND CALCULATOR TOOL
             ═══════════════════════════════════════════════ */}
          <TabsContent value="calculator" className="space-y-4 mt-3">
            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Interactive Refund Calculator</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Calculate exact pro-rata refunds when a tenant paid in full and vacates early.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column: Inputs */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium">Tenant Name (Optional)</Label>
                      <Input
                        placeholder="e.g. Ramesh Kumar"
                        value={calcTenantName}
                        onChange={(e) => setCalcTenantName(e.target.value)}
                        className="h-9 mt-1 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium">Monthly Rent (₹)</Label>
                        <Input
                          type="number"
                          value={calcMonthlyRent}
                          onChange={(e) => setCalcMonthlyRent(Number(e.target.value) || 0)}
                          className="h-9 mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Amount Paid Upfront (₹)</Label>
                        <Input
                          type="number"
                          value={calcAmountPaid}
                          onChange={(e) => setCalcAmountPaid(Number(e.target.value) || 0)}
                          className="h-9 mt-1 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-medium">Days Stayed in Month</Label>
                        <span className="text-xs font-bold text-primary">{calcDaysStayed} Days</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="31"
                        value={calcDaysStayed}
                        onChange={(e) => setCalcDaysStayed(Number(e.target.value))}
                        className="w-full mt-2 accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>1 Day</span>
                        <span>10 Days (Early Exit)</span>
                        <span>20 Days</span>
                        <span>30 Days</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-medium">Deductions (₹)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={calcDeductions || ''}
                          onChange={(e) => setCalcDeductions(Number(e.target.value) || 0)}
                          className="h-9 mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Deduction Reason</Label>
                        <Input
                          placeholder="e.g. Electricity, Damage"
                          value={calcDeductionNote}
                          onChange={(e) => setCalcDeductionNote(e.target.value)}
                          className="h-9 mt-1 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Instant Calculation Output */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Standard Daily Rate:</span>
                        <span className="font-semibold">₹{calcDailyRate}/day</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Pro-Rata Rent ({calcDaysStayed} days):</span>
                        <span className="font-semibold text-foreground">₹{calcProRataRent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rent Paid Upfront:</span>
                        <span className="font-semibold text-emerald-600">₹{calcAmountPaid.toLocaleString()}</span>
                      </div>
                      {calcDeductions > 0 && (
                        <div className="flex justify-between items-center text-rose-600">
                          <span>Deductions ({calcDeductionNote}):</span>
                          <span>-₹{calcDeductions.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-primary/20">
                        {calcNetRefund > 0 ? (
                          <div>
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block">
                              Total Refund to Return:
                            </span>
                            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
                              ₹{calcNetRefund.toLocaleString()}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              Tenant vacated {30 - calcDaysStayed} days early.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs text-rose-600 font-semibold block">
                              Balance Due from Tenant:
                            </span>
                            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-0.5">
                              ₹{calcNetPendingDue.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={shareCalculatorWhatsApp}
                      className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Breakdown via WhatsApp
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Record Refund Modal */}
      {refundDialogTenant && (
        <Dialog open={!!refundDialogTenant} onOpenChange={(open) => !open && setRefundDialogTenant(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Record Refund Payment</DialogTitle>
              <DialogDescription className="text-xs">
                Record refund for <strong>{refundDialogTenant.name}</strong> (Room {refundDialogTenant.roomNo}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Refund Amount (₹)</Label>
                <Input
                  type="number"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    type="button"
                    variant={refundPaymentMode === 'upi' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setRefundPaymentMode('upi')}
                  >
                    UPI / Online
                  </Button>
                  <Button
                    type="button"
                    variant={refundPaymentMode === 'cash' ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs"
                    onClick={() => setRefundPaymentMode('cash')}
                  >
                    Cash
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => setRefundDialogTenant(null)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleConfirmRefund}>
                Confirm Refund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
