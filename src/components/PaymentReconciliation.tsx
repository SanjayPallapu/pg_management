import { useMemo, useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertTriangle, User, Download, ChevronDown, ChevronRight, Calendar, TrendingUp, X } from 'lucide-react';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { useRentCalculations } from '@/hooks/useRentCalculations';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { format, getDaysInMonth, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ComposedChart, Line } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

interface PaymentReconciliationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)'];
const TREND_COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(262, 83%, 58%)', 'hsl(25, 95%, 53%)'];

type DateRangeOption = 'current' | 'last3' | 'last6' | 'custom';

export const PaymentReconciliation = ({
  open,
  onOpenChange
}: PaymentReconciliationProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const isMobile = useIsMobile();
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRangeOption>('current');

  // Handle OS back gesture by using browser history
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      // Push a state to history when sheet opens
      window.history.pushState({ sheetOpen: true }, '');
      
      const handlePopState = (event: PopStateEvent) => {
        // When back is pressed, close the sheet
        handleClose();
      };
      
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [open, handleClose]);
  const { rentCollected, paidTenants, partialTenants } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Get months to display based on date range
  const monthsToShow = useMemo(() => {
    const currentDate = new Date(selectedYear, selectedMonth - 1);
    const result: Array<{ month: number; year: number }> = [];
    
    const numMonths = dateRange === 'current' ? 1 : dateRange === 'last3' ? 3 : 6;
    
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      result.push({ month: date.getMonth() + 1, year: date.getFullYear() });
    }
    
    return result;
  }, [selectedMonth, selectedYear, dateRange]);

  // Calculate data for a specific month
  const getMonthData = (targetMonth: number, targetYear: number) => {
    const eligibleTenantIds = new Set(rooms.flatMap(room => 
      room.tenants.filter(tenant => 
        isTenantActiveInMonth(tenant.startDate, tenant.endDate, targetYear, targetMonth)
      ).map(tenant => tenant.id)
    ));

    const eligiblePayments = payments.filter(p => 
      p.month === targetMonth && p.year === targetYear && eligibleTenantIds.has(p.tenantId)
    );

    let upiTotal = 0;
    let cashTotal = 0;
    let upiCount = 0;
    let cashCount = 0;
    let totalCollected = 0;
    
    const paymentDetails: Array<{
      tenantId: string;
      tenantName: string;
      roomNo: string;
      monthlyRent: number;
      status: string;
      amountPaid: number;
      entries: PaymentEntry[];
      entriesTotal: number;
      earliestEntryDate: Date | null;
      month: number;
      year: number;
    }> = [];

    eligiblePayments.forEach(payment => {
      const room = rooms.find(r => r.tenants.some(t => t.id === payment.tenantId));
      const tenant = room?.tenants.find(t => t.id === payment.tenantId);
      if (!tenant || !room) return;
      
      let entriesTotal = 0;
      const entries = payment.paymentEntries || [];
      
      entries.forEach((entry: PaymentEntry) => {
        entriesTotal += entry.amount;
        if (entry.mode === 'upi') {
          upiTotal += entry.amount;
          upiCount++;
        } else if (entry.mode === 'cash') {
          cashTotal += entry.amount;
          cashCount++;
        }
      });

      if (payment.paymentStatus === 'Paid') {
        totalCollected += tenant.monthlyRent;
      } else if (payment.paymentStatus === 'Partial') {
        totalCollected += payment.amountPaid || 0;
      }

      const earliestEntryDate = entries.length > 0 
        ? entries.reduce((earliest, entry) => {
            const entryDate = new Date(entry.date);
            return !earliest || entryDate < earliest ? entryDate : earliest;
          }, null as Date | null) 
        : null;

      if (payment.paymentStatus === 'Paid' || payment.paymentStatus === 'Partial') {
        paymentDetails.push({
          tenantId: payment.tenantId,
          tenantName: tenant.name,
          roomNo: room.roomNo,
          monthlyRent: tenant.monthlyRent,
          status: payment.paymentStatus,
          amountPaid: payment.amountPaid || 0,
          entries: entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          entriesTotal,
          earliestEntryDate,
          month: targetMonth,
          year: targetYear
        });
      }
    });

    paymentDetails.sort((a, b) => {
      if (!a.earliestEntryDate && !b.earliestEntryDate) return 0;
      if (!a.earliestEntryDate) return 1;
      if (!b.earliestEntryDate) return -1;
      return a.earliestEntryDate.getTime() - b.earliestEntryDate.getTime();
    });

    return {
      month: targetMonth,
      year: targetYear,
      rentCollected: totalCollected,
      upiTotal,
      cashTotal,
      upiCount,
      cashCount,
      paymentModeTotal: upiTotal + cashTotal,
      paymentDetails
    };
  };

  const reconciliationData = useMemo(() => {
    const eligibleTenantIds = new Set(rooms.flatMap(room => 
      room.tenants.filter(tenant => 
        isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth)
      ).map(tenant => tenant.id)
    ));

    const eligiblePayments = payments.filter(p => 
      p.month === selectedMonth && p.year === selectedYear && eligibleTenantIds.has(p.tenantId)
    );

    let upiTotal = 0;
    let cashTotal = 0;
    let upiCount = 0;
    let cashCount = 0;
    const paymentDetails: Array<{
      tenantId: string;
      tenantName: string;
      roomNo: string;
      monthlyRent: number;
      status: string;
      amountPaid: number;
      entries: PaymentEntry[];
      entriesTotal: number;
      earliestEntryDate: Date | null;
    }> = [];

    eligiblePayments.forEach(payment => {
      const room = rooms.find(r => r.tenants.some(t => t.id === payment.tenantId));
      const tenant = room?.tenants.find(t => t.id === payment.tenantId);
      if (!tenant || !room) return;
      
      let entriesTotal = 0;
      const entries = payment.paymentEntries || [];
      entries.forEach((entry: PaymentEntry) => {
        entriesTotal += entry.amount;
        if (entry.mode === 'upi') {
          upiTotal += entry.amount;
          upiCount++;
        } else if (entry.mode === 'cash') {
          cashTotal += entry.amount;
          cashCount++;
        }
      });

      const earliestEntryDate = entries.length > 0 
        ? entries.reduce((earliest, entry) => {
            const entryDate = new Date(entry.date);
            return !earliest || entryDate < earliest ? entryDate : earliest;
          }, null as Date | null) 
        : null;

      if (payment.paymentStatus === 'Paid' || payment.paymentStatus === 'Partial') {
        paymentDetails.push({
          tenantId: payment.tenantId,
          tenantName: tenant.name,
          roomNo: room.roomNo,
          monthlyRent: tenant.monthlyRent,
          status: payment.paymentStatus,
          amountPaid: payment.amountPaid || 0,
          entries: entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
          entriesTotal,
          earliestEntryDate
        });
      }
    });

    paymentDetails.sort((a, b) => {
      if (!a.earliestEntryDate && !b.earliestEntryDate) return 0;
      if (!a.earliestEntryDate) return 1;
      if (!b.earliestEntryDate) return -1;
      return a.earliestEntryDate.getTime() - b.earliestEntryDate.getTime();
    });

    const paymentModeTotal = upiTotal + cashTotal;
    const isMatching = rentCollected === paymentModeTotal;
    
    return {
      rentCollected,
      paymentModeTotal,
      upiTotal,
      cashTotal,
      upiCount,
      cashCount,
      isMatching,
      difference: rentCollected - paymentModeTotal,
      paymentDetails,
      paidCount: paidTenants.length,
      partialCount: partialTenants.length
    };
  }, [payments, selectedMonth, selectedYear, rooms, rentCollected, paidTenants, partialTenants]);

  // Multi-month data for trend comparison
  const multiMonthData = useMemo(() => {
    return monthsToShow.map(({ month, year }) => getMonthData(month, year));
  }, [monthsToShow, rooms, payments]);

  // Trend chart data
  const trendChartData = useMemo(() => {
    return multiMonthData.map(data => ({
      name: `${monthsShort[data.month - 1]} ${data.year}`,
      total: data.rentCollected,
      upi: data.upiTotal,
      cash: data.cashTotal,
      transactions: data.upiCount + data.cashCount
    }));
  }, [multiMonthData]);

  // All payment details across selected months
  const allPaymentDetails = useMemo(() => {
    if (dateRange === 'current') {
      return reconciliationData.paymentDetails.map(d => ({ ...d, month: selectedMonth, year: selectedYear }));
    }
    return multiMonthData.flatMap(data => data.paymentDetails);
  }, [dateRange, reconciliationData.paymentDetails, multiMonthData, selectedMonth, selectedYear]);

  // Filtered payment details based on filter selection
  const filteredPaymentDetails = useMemo(() => {
    const baseDetails = dateRange === 'current' ? reconciliationData.paymentDetails : allPaymentDetails;
    if (paymentFilter === 'all') return baseDetails;
    return baseDetails.map(detail => ({
      ...detail,
      entries: detail.entries.filter(e => e.mode === paymentFilter),
      entriesTotal: detail.entries.filter(e => e.mode === paymentFilter).reduce((sum, e) => sum + e.amount, 0)
    })).filter(detail => detail.entries.length > 0);
  }, [reconciliationData.paymentDetails, allPaymentDetails, paymentFilter, dateRange]);

  // Chart data
  const pieChartData = useMemo(() => [{
    name: 'UPI',
    value: reconciliationData.upiTotal,
    count: reconciliationData.upiCount
  }, {
    name: 'Cash',
    value: reconciliationData.cashTotal,
    count: reconciliationData.cashCount
  }], [reconciliationData]);
  const barChartData = useMemo(() => [{
    name: 'UPI',
    amount: reconciliationData.upiTotal
  }, {
    name: 'Cash',
    amount: reconciliationData.cashTotal
  }], [reconciliationData]);

  // Daily timeline chart data
  const dailyTimelineData = useMemo(() => {
    const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1));
    const dailyData: Array<{
      day: number;
      upi: number;
      cash: number;
      total: number;
    }> = [];

    // Initialize all days
    for (let day = 1; day <= daysInMonth; day++) {
      dailyData.push({
        day,
        upi: 0,
        cash: 0,
        total: 0
      });
    }

    // Aggregate payments by day
    reconciliationData.paymentDetails.forEach(detail => {
      detail.entries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const day = entryDate.getDate();
        const dayIndex = day - 1;
        if (dayIndex >= 0 && dayIndex < dailyData.length) {
          if (entry.mode === 'upi') {
            dailyData[dayIndex].upi += entry.amount;
          } else if (entry.mode === 'cash') {
            dailyData[dayIndex].cash += entry.amount;
          }
          dailyData[dayIndex].total += entry.amount;
        }
      });
    });
    return dailyData;
  }, [reconciliationData.paymentDetails, selectedMonth, selectedYear]);
  const toggleTenantExpanded = (tenantId: string) => {
    setExpandedTenants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  };
  const expandAll = () => {
    setExpandedTenants(new Set(filteredPaymentDetails.map(d => {
      const month = 'month' in d ? (d as any).month : selectedMonth;
      const year = 'year' in d ? (d as any).year : selectedYear;
      return `${d.tenantId}-${month}-${year}`;
    })));
  };
  const collapseAll = () => {
    setExpandedTenants(new Set());
  };
  const handleExportExcel = () => {
    // Summary sheet data
    const summaryData = [{
      Metric: 'Month',
      Value: `${months[selectedMonth - 1]} ${selectedYear}`
    }, {
      Metric: 'Rent Collected',
      Value: reconciliationData.rentCollected
    }, {
      Metric: 'Payment Entries Total',
      Value: reconciliationData.paymentModeTotal
    }, {
      Metric: 'UPI Total',
      Value: reconciliationData.upiTotal
    }, {
      Metric: 'UPI Transactions',
      Value: reconciliationData.upiCount
    }, {
      Metric: 'Cash Total',
      Value: reconciliationData.cashTotal
    }, {
      Metric: 'Cash Transactions',
      Value: reconciliationData.cashCount
    }, {
      Metric: 'Match Status',
      Value: reconciliationData.isMatching ? 'Matched' : 'Mismatch'
    }, {
      Metric: 'Difference',
      Value: reconciliationData.difference
    }];

    // Payment details sheet data
    const detailsData = reconciliationData.paymentDetails.flatMap(detail => detail.entries.length > 0 ? detail.entries.map((entry, idx) => ({
      'Tenant Name': detail.tenantName,
      'Room No': detail.roomNo,
      'Monthly Rent': detail.monthlyRent,
      'Status': detail.status,
      'Amount Paid': detail.amountPaid,
      'Entry #': idx + 1 as string | number,
      'Entry Type': entry.type as string,
      'Entry Date': format(new Date(entry.date), 'dd MMM yyyy'),
      'Entry Mode': entry.mode.toUpperCase(),
      'Entry Amount': entry.amount as string | number
    })) : [{
      'Tenant Name': detail.tenantName,
      'Room No': detail.roomNo,
      'Monthly Rent': detail.monthlyRent,
      'Status': detail.status,
      'Amount Paid': detail.amountPaid,
      'Entry #': '-' as string | number,
      'Entry Type': '-' as string,
      'Entry Date': '-',
      'Entry Mode': '-',
      'Entry Amount': '-' as string | number
    }]);

    // Create workbook
    const wb = XLSX.utils.book_new();
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    const detailsWs = XLSX.utils.json_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, detailsWs, 'Payment Details');

    // Download
    XLSX.writeFile(wb, `Reconciliation_${months[selectedMonth - 1]}_${selectedYear}.xlsx`);
  };
  return <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={isMobile ? "w-full max-w-full sm:max-w-full p-4 [&>button]:hidden" : "w-full sm:max-w-lg"}
      >
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              Payment Reconciliation
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className={`${isMobile ? 'h-[calc(100vh-100px)] overflow-y-auto scrollbar-none' : ''}`}>
          <ScrollArea className={isMobile ? "h-full [&>div>div]:!block" : "h-[calc(100vh-80px)] mt-4 pr-4"} scrollHideDelay={0}>
          <div className="space-y-6">
            {/* Date Range Filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date Range:</span>
              </div>
              <Select value={dateRange} onValueChange={(v: DateRangeOption) => setDateRange(v)}>
                <SelectTrigger className="w-[160px] h-8">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="last3">Last 3 Months</SelectItem>
                  <SelectItem value="last6">Last 6 Months</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 text-sm">
                  {dateRange === 'current' 
                    ? `${months[selectedMonth - 1]} ${selectedYear}`
                    : `${monthsShort[monthsToShow[0].month - 1]} ${monthsToShow[0].year} - ${monthsShort[monthsToShow[monthsToShow.length - 1].month - 1]} ${monthsToShow[monthsToShow.length - 1].year}`
                  }
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>

            {/* Month Trend Comparison - Only show for multi-month view */}
            {dateRange !== 'current' && trendChartData.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Payment Trend Comparison</h3>
                </div>
                
                {/* Trend Bar Chart */}
                <div className="h-48 bg-muted/30 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={40} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `₹${value.toLocaleString()}`, 
                          name === 'total' ? 'Total' : name === 'upi' ? 'UPI' : 'Cash'
                        ]} 
                      />
                      <Legend formatter={value => value === 'total' ? 'Total' : value === 'upi' ? 'UPI' : 'Cash'} wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="upi" stackId="a" fill={TREND_COLORS[0]} name="upi" />
                      <Bar dataKey="cash" stackId="a" fill={TREND_COLORS[1]} name="cash" />
                      <Line type="monotone" dataKey="total" stroke={TREND_COLORS[2]} strokeWidth={2} dot={{ r: 4 }} name="total" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly Summary Cards */}
                <div className={`grid gap-2 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {multiMonthData.map((data, idx) => (
                    <div key={idx} className="p-2 bg-muted/50 rounded-lg text-center">
                      <div className="text-xs text-muted-foreground">{monthsShort[data.month - 1]} {data.year}</div>
                      <div className="text-sm font-bold">₹{data.rentCollected.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{data.upiCount + data.cashCount} txns</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Comparison */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Summary Comparison</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Rent Collected</div>
                  <div className="text-lg font-bold text-paid">₹{reconciliationData.rentCollected.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {reconciliationData.paidCount} paid + {reconciliationData.partialCount} partial
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Payment Entries Total</div>
                  <div className="text-lg font-bold">₹{reconciliationData.paymentModeTotal.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {reconciliationData.upiCount} UPI + {reconciliationData.cashCount} Cash
                  </div>
                </div>
              </div>

              {/* Match Status */}
              <div className={`p-3 rounded-lg flex items-center gap-2 ${reconciliationData.isMatching ? 'bg-paid/10 text-paid' : 'bg-destructive/10 text-destructive'}`}>
                {reconciliationData.isMatching ? <>
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">All payments match!</span>
                  </> : <>
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      Difference: ₹{Math.abs(reconciliationData.difference).toLocaleString()}
                      {reconciliationData.difference > 0 ? ' (Rent > Entries)' : ' (Entries > Rent)'}
                    </span>
                  </>}
              </div>

              {/* Explanation */}
              {!reconciliationData.isMatching && <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  <strong>Why mismatch?</strong> Rent Collected uses <code>monthlyRent</code> for fully paid tenants, 
                  while Payment Entries sums actual amounts. Overpayments or corrections can cause differences.
                </div>}
            </div>

            {/* Payment Distribution Charts */}
            {reconciliationData.paymentModeTotal > 0 && <div className="space-y-3">
                <h3 className="font-semibold text-sm">Payment Distribution</h3>
                
                {/* Pie Chart */}
                <div className="h-48 bg-muted/30 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" label={({
                    name,
                    percent
                  }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieChartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string, props: any) => {
                        const color = name === 'UPI' ? 'hsl(217, 91%, 60%)' : 'hsl(142, 71%, 45%)';
                        return [<span style={{ color }}>{`₹${value.toLocaleString()} (${props.payload.count} txns)`}</span>, <span style={{ color }}>{name}</span>];
                      }} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} labelStyle={{ color: '#374151' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="h-32 bg-muted/30 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={40} />
                      <Tooltip formatter={(value: number, name: string, props: any) => {
                        const color = props.payload.name === 'UPI' ? 'hsl(217, 91%, 60%)' : 'hsl(142, 71%, 45%)';
                        return [<span style={{ color }}>{`₹${value.toLocaleString()}`}</span>, <span style={{ color }}>{props.payload.name}</span>];
                      }} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} labelStyle={{ color: '#374151' }} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {barChartData.map((_, index) => <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>}

            {/* Daily Payment Timeline */}
            {reconciliationData.paymentModeTotal > 0 && <div className="space-y-3">
                <h3 className="font-semibold text-sm">Daily Payment Timeline</h3>
                <div className="h-40 bg-muted/30 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{
                    fontSize: 10
                  }} tickFormatter={day => day} interval="preserveStartEnd" />
                      <YAxis tick={{
                    fontSize: 10
                  }} tickFormatter={v => v > 0 ? `₹${(v / 1000).toFixed(0)}k` : '0'} width={35} />
                      <Tooltip content={({ active, payload, label }) => {
                        if (!active || !payload) return null;
                        return (
                          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: '6px' }}>
                            <p style={{ color: '#374151', fontWeight: 600, marginBottom: '4px' }}>Day {label}</p>
                            {payload.map((entry: any) => (
                              <p key={entry.name} style={{ color: entry.name === 'upi' ? 'hsl(217, 91%, 60%)' : 'hsl(142, 71%, 45%)', margin: '2px 0' }}>
                                {entry.name === 'upi' ? 'UPI' : 'Cash'} : ₹{entry.value.toLocaleString()}
                              </p>
                            ))}
                          </div>
                        );
                      }} />
                      <Area type="monotone" dataKey="upi" stackId="1" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.6} name="upi" />
                      <Area type="monotone" dataKey="cash" stackId="1" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.6} name="cash" />
                      <Legend formatter={value => value === 'upi' ? 'UPI' : 'Cash'} wrapperStyle={{
                    fontSize: 10
                  }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>}

            {/* Payment Mode Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Payment Mode Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">UPI Payments</div>
                  <div className="text-lg font-bold">₹{reconciliationData.upiTotal.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{reconciliationData.upiCount} transactions</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-muted-foreground">Cash Payments</div>
                  <div className="text-lg font-bold">₹{reconciliationData.cashTotal.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{reconciliationData.cashCount} transactions</div>
                </div>
              </div>
            </div>

            {/* Individual Payment Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Payment Details ({filteredPaymentDetails.length})</h3>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={expandAll}>
                      Expand All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={collapseAll}>
                      Collapse All
                    </Button>
                  </div>
                </div>
                <ToggleGroup type="single" value={paymentFilter} onValueChange={v => v && setPaymentFilter(v)} size="sm">
                  <ToggleGroupItem value="all" className="text-xs px-2 h-7">All</ToggleGroupItem>
                  <ToggleGroupItem value="upi" className="text-xs px-2 h-7">UPI</ToggleGroupItem>
                  <ToggleGroupItem value="cash" className="text-xs px-2 h-7">Cash</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                {filteredPaymentDetails.map((detail, detailIdx) => {
                  const detailKey = `${detail.tenantId}-${'month' in detail ? detail.month : selectedMonth}-${'year' in detail ? detail.year : selectedYear}`;
                  return (
                    <Collapsible key={detailKey} open={expandedTenants.has(detailKey)} onOpenChange={() => toggleTenantExpanded(detailKey)}>
                      <div className="border rounded-lg overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {expandedTenants.has(detailKey) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{detail.tenantName}</span>
                                <span className="text-xs text-muted-foreground">Room {detail.roomNo}</span>
                                {dateRange !== 'current' && 'month' in detail && (
                                  <Badge variant="secondary" className="text-xs">
                                    {monthsShort[(detail as any).month - 1]} {(detail as any).year}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">₹{detail.amountPaid.toLocaleString()}</span>
                                <Badge className={detail.status === 'Paid' ? 'bg-paid text-paid-foreground' : 'bg-partial text-partial-foreground'}>
                                  {detail.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="px-3 pb-3 space-y-2 border-t bg-muted/20">
                            <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                              <div>
                                <span className="text-muted-foreground">Monthly Rent:</span>
                                <div className="font-medium">₹{detail.monthlyRent.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Amount Paid:</span>
                                <div className="font-medium">₹{detail.amountPaid.toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Entries Total:</span>
                                <div className={`font-medium ${detail.entriesTotal !== detail.amountPaid ? 'text-destructive' : ''}`}>
                                  ₹{detail.entriesTotal.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {detail.entries.length > 0 && <div className="pt-2 border-t space-y-1">
                                {detail.entries.map((entry, idx) => <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                      {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Full'} on {format(new Date(entry.date), 'dd MMM')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-1.5 py-0.5 rounded ${entry.mode === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                        {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                                      </span>
                                      <span className="font-medium">₹{entry.amount.toLocaleString()}</span>
                                    </div>
                                  </div>)}
                              </div>}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}

                {filteredPaymentDetails.length === 0 && <div className="text-center py-8 text-muted-foreground">
                    No payments recorded for the selected period
                  </div>}
              </div>
            </div>
          </div>
        </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>;
};