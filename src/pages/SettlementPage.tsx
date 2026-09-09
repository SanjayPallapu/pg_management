import { useState, useMemo, useCallback, useEffect } from 'react';
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
  Receipt,
  Clock,
  Sparkles
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { parseDateOnly } from '@/utils/dateOnly';
import { toast } from '@/hooks/use-toast';
import { applyStyledExport, saveAndShareExcel } from '@/utils/excelStyles';
import { SettlementRefundDialog, SettlementRefundDialogInput } from '@/components/SettlementRefundDialog';

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

  // Voucher / Image Template Dialog state
  const [voucherDialogData, setVoucherDialogData] = useState<SettlementRefundDialogInput | null>(null);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);

  // Refund dialog state
  const [refundDialogTenant, setRefundDialogTenant] = useState<SettlementTenant | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [refundPaymentMode, setRefundPaymentMode] = useState<'upi' | 'cash'>('upi');

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Calculator state
  const defaultFrom = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const defaultTo = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-10`;
  const [calcFromDate, setCalcFromDate] = useState<string>(defaultFrom);
  const [calcToDate, setCalcToDate] = useState<string>(defaultTo);
  const [calcDaysStayed, setCalcDaysStayed] = useState<number>(10);
  const [calcRateMode, setCalcRateMode] = useState<'standard-30' | 'calendar' | 'custom'>('standard-30');
  const [calcCustomRate, setCalcCustomRate] = useState<number>(350);
  const [calcMonthlyRent, setCalcMonthlyRent] = useState<number>(8000);
  const [calcAmountPaid, setCalcAmountPaid] = useState<number>(8000);
  const [calcDeductions, setCalcDeductions] = useState<number>(0);
  const [calcDeductionNote, setCalcDeductionNote] = useState<string>('Electricity / Maintenance');
  const [calcTenantName, setCalcTenantName] = useState<string>('');

  // Update calculator default dates if month changes
  useEffect(() => {
    const f = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const t = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-10`;
    setCalcFromDate(f);
    setCalcToDate(t);
    setCalcDaysStayed(10);
  }, [selectedMonth, selectedYear]);

  // Handle Date range change in calculator
  const handleCalcFromChange = (newFrom: string) => {
    setCalcFromDate(newFrom);
    try {
      const f = parseDateOnly(newFrom);
      const t = parseDateOnly(calcToDate);
      if (!isNaN(f.getTime()) && !isNaN(t.getTime())) {
        const diff = differenceInDays(t, f) + 1;
        if (diff > 0) setCalcDaysStayed(diff);
      }
    } catch {}
  };

  const handleCalcToChange = (newTo: string) => {
    setCalcToDate(newTo);
    try {
      const f = parseDateOnly(calcFromDate);
      const t = parseDateOnly(newTo);
      if (!isNaN(f.getTime()) && !isNaN(t.getTime())) {
        const diff = differenceInDays(t, f) + 1;
        if (diff > 0) setCalcDaysStayed(diff);
      }
    } catch {}
  };

  const handleCalcDaysStayedChange = (days: number) => {
    setCalcDaysStayed(days);
    try {
      const f = parseDateOnly(calcFromDate);
      if (!isNaN(f.getTime())) {
        const nextDate = new Date(f);
        nextDate.setDate(f.getDate() + days - 1);
        setCalcToDate(format(nextDate, 'yyyy-MM-dd'));
      }
    } catch {}
  };

  // Calculator daily rate
  const calcDailyRate = useMemo(() => {
    if (calcRateMode === 'custom') return calcCustomRate || 0;
    if (calcRateMode === 'calendar') return Math.round(calcMonthlyRent / daysInMonth);
    return Math.round(calcMonthlyRent / 30);
  }, [calcRateMode, calcCustomRate, calcMonthlyRent, daysInMonth]);

  // Calculator outputs
  const calcProRataRent = calcDailyRate * calcDaysStayed;
  const calcTotalDue = Math.max(0, calcProRataRent + calcDeductions);
  const calcNetRefund = Math.max(0, calcAmountPaid - calcTotalDue);
  const calcNetPendingDue = Math.max(0, calcTotalDue - calcAmountPaid);

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

  const openTenantVoucherDialog = (tenant: SettlementTenant) => {
    setVoucherDialogData({
      tenantName: tenant.name,
      tenantPhone: tenant.phone,
      roomNo: tenant.roomNo,
      sharingType: `${tenant.capacity} Sharing`,
      monthlyRent: tenant.monthlyRent,
      startDate: tenant.startDate,
      endDate: tenant.endDate,
      amountPaid: tenant.amountPaid,
      discount: tenant.discount,
      extra: tenant.extra,
    });
    setVoucherDialogOpen(true);
  };

  const openCalculatorVoucherDialog = () => {
    setVoucherDialogData({
      tenantName: calcTenantName || 'Tenant',
      roomNo: '101',
      sharingType: 'Standard Sharing',
      monthlyRent: calcMonthlyRent,
      startDate: calcFromDate,
      endDate: calcToDate,
      amountPaid: calcAmountPaid,
      extra: calcDeductions,
      customDailyRate: calcRateMode === 'custom' ? calcCustomRate : undefined,
    });
    setVoucherDialogOpen(true);
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
                      {/* Top Header */}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {tenant.phone && (
                            <a
                              href={`tel:${tenant.phone}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                              title={`Call ${tenant.name}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {/* WhatsApp Template Voucher Image Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                            onClick={() => openTenantVoucherDialog(tenant)}
                            title="Generate & Send WhatsApp Template Image"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Voucher Image</span>
                          </Button>

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
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">
                          {tenant.isRefunded && tenant.refundPaidAt && (
                            <span>Paid on {format(new Date(tenant.refundPaidAt), 'dd MMM yyyy, h:mm a')}</span>
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                            onClick={() => openTenantVoucherDialog(tenant)}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Voucher Image
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
              TAB 3: REFUND CALCULATOR TOOL WITH DATES & CUSTOM RATE
             ═══════════════════════════════════════════════ */}
          <TabsContent value="calculator" className="space-y-4 mt-3">
            <Card className="border-border/70 shadow-xs">
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Interactive Refund Calculator</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Custom day-wise rent, date range selection (From Date to To Date), and instant WhatsApp voucher image.
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

                    {/* Date Range Selection */}
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          Stay Dates (From Date to To Date)
                        </Label>
                        <Badge variant="secondary" className="text-xs font-bold text-primary">
                          {calcDaysStayed} Days
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">From Date</Label>
                          <Input
                            type="date"
                            value={calcFromDate}
                            onChange={(e) => handleCalcFromChange(e.target.value)}
                            className="h-8 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">To Date</Label>
                          <Input
                            type="date"
                            value={calcToDate}
                            onChange={(e) => handleCalcToChange(e.target.value)}
                            className="h-8 text-xs mt-0.5"
                          />
                        </div>
                      </div>

                      <div className="pt-1">
                        <input
                          type="range"
                          min="1"
                          max="31"
                          value={calcDaysStayed}
                          onChange={(e) => handleCalcDaysStayedChange(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>1 Day</span>
                          <span>10 Days</span>
                          <span>20 Days</span>
                          <span>30 Days</span>
                        </div>
                      </div>
                    </div>

                    {/* Day-Wise Rent Mode & Custom Daily Rate */}
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold flex items-center gap-1">
                          <IndianRupee className="h-3.5 w-3.5 text-primary" />
                          Day-Wise Rent Rate
                        </Label>
                        <span className="text-xs font-bold text-primary">
                          ₹{calcDailyRate} / day
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1">
                        <Button
                          type="button"
                          variant={calcRateMode === 'standard-30' ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-[11px] px-1"
                          onClick={() => setCalcRateMode('standard-30')}
                        >
                          Divide by 30
                        </Button>
                        <Button
                          type="button"
                          variant={calcRateMode === 'calendar' ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-[11px] px-1"
                          onClick={() => setCalcRateMode('calendar')}
                        >
                          {daysInMonth} Days
                        </Button>
                        <Button
                          type="button"
                          variant={calcRateMode === 'custom' ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-[11px] px-1"
                          onClick={() => setCalcRateMode('custom')}
                        >
                          Custom Rate
                        </Button>
                      </div>

                      {calcRateMode === 'custom' && (
                        <div className="flex items-center gap-2 pt-1">
                          <Label className="text-[11px] shrink-0">Custom Rate:</Label>
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                            <Input
                              type="number"
                              value={calcCustomRate || ''}
                              onChange={(e) => setCalcCustomRate(Number(e.target.value) || 0)}
                              placeholder="e.g. 350"
                              className="h-8 pl-6 text-xs"
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground">/ day</span>
                        </div>
                      )}
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

                  {/* Right Column: Instant Calculation Output & Voucher Button */}
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Stay Dates:</span>
                        <span className="font-semibold text-foreground">
                          {calcFromDate} to {calcToDate} ({calcDaysStayed} days)
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Day-Wise Rate:</span>
                        <span className="font-semibold">
                          ₹{calcDailyRate}/day ({calcRateMode === 'custom' ? 'Custom' : 'Standard'})
                        </span>
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
                              Calculated strictly for {calcDaysStayed} days of stay.
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

                    <div className="space-y-2">
                      <Button
                        onClick={openCalculatorVoucherDialog}
                        className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm h-11"
                      >
                        <Receipt className="h-4 w-4" />
                        Generate & Send WhatsApp Template Image
                      </Button>
                    </div>
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

      {/* WhatsApp Template Voucher Dialog */}
      <SettlementRefundDialog
        open={voucherDialogOpen}
        onOpenChange={setVoucherDialogOpen}
        data={voucherDialogData}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </AppLayout>
  );
}
