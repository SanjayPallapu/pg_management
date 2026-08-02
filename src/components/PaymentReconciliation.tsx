import { useMemo, useState } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertTriangle, User, Download, ChevronDown, ChevronRight, Calendar, TrendingUp, X, Search, Check, FileText, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { useRentCalculations } from '@/hooks/useRentCalculations';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth, hasTenantLeftNow } from '@/utils/dateOnly';
import { format, getDaysInMonth, subMonths } from 'date-fns';
import { applyStyledExport, addStyledSheet, XLSX as styledXLSX, saveAndShareExcel } from '@/utils/excelStyles';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, ComposedChart, Line } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';
import { TenantsByDueDaySheet } from './TenantsByDueDaySheet';

interface PaymentReconciliationProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  standalone?: boolean;
}

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)'];
const TREND_COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(262, 83%, 58%)', 'hsl(25, 95%, 53%)'];

type DateRangeOption = 'current' | 'last3' | 'last6' | 'custom';

export const PaymentReconciliation = ({
  open = false,
  onOpenChange,
  standalone = false
}: PaymentReconciliationProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const isMobile = useIsMobile();
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRangeOption>('current');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Expected collection date filter: from day X to day Y
  const [collectionFromDay, setCollectionFromDay] = useState<number>(1);
  const [collectionToDay, setCollectionToDay] = useState<number>(31);
  // Day detail sheet state
  const [selectedDueDay, setSelectedDueDay] = useState<number | null>(null);
  const [dueDaySheetOpen, setDueDaySheetOpen] = useState(false);

  // Handle OS back gesture to close sheet
  useBackGesture(!standalone && open, () => onOpenChange?.(false));

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

  // Filtered payment details based on filter selection and search query
  const filteredPaymentDetails = useMemo(() => {
    let baseDetails = dateRange === 'current' ? reconciliationData.paymentDetails : allPaymentDetails;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      baseDetails = baseDetails.filter(detail => 
        detail.tenantName.toLowerCase().includes(query)
      );
    }
    
    // Apply payment mode filter
    if (paymentFilter === 'all') return baseDetails;
    return baseDetails.map(detail => ({
      ...detail,
      entries: detail.entries.filter(e => e.mode === paymentFilter),
      entriesTotal: detail.entries.filter(e => e.mode === paymentFilter).reduce((sum, e) => sum + e.amount, 0)
    })).filter(detail => detail.entries.length > 0);
  }, [reconciliationData.paymentDetails, allPaymentDetails, paymentFilter, dateRange, searchQuery]);

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

  // Collection schedule by joining date - shows expected collection by day
  const collectionScheduleData = useMemo(() => {
    const scheduleByDay: Record<number, { day: number; expected: number; tenants: number }> = {};
    
    // Get all active (non-left) pending tenants for current month
    const allTenants = rooms.flatMap(room => 
      room.tenants
        .filter(tenant => 
          isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth) &&
          !hasTenantLeftNow(tenant.endDate) // Exclude tenants who have already left
        )
        .map(tenant => ({ ...tenant, roomNo: room.roomNo }))
    );

    allTenants.forEach(tenant => {
      const payment = payments.find(p => 
        p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
      );
      
      // Only count unpaid tenants
      if (!payment || payment.paymentStatus === 'Pending') {
        const joinDay = new Date(tenant.startDate).getDate();
        if (!scheduleByDay[joinDay]) {
          scheduleByDay[joinDay] = { day: joinDay, expected: 0, tenants: 0 };
        }
        scheduleByDay[joinDay].expected += tenant.monthlyRent;
        scheduleByDay[joinDay].tenants++;
      }
    });

    return Object.values(scheduleByDay).sort((a, b) => a.day - b.day);
  }, [rooms, payments, selectedMonth, selectedYear]);

  // Filtered collection schedule based on date range
  const filteredCollectionScheduleData = useMemo(() => {
    return collectionScheduleData.filter(
      item => item.day >= collectionFromDay && item.day <= collectionToDay
    );
  }, [collectionScheduleData, collectionFromDay, collectionToDay]);

  // Total expected in filtered range
  const filteredExpectedTotal = useMemo(() => {
    return filteredCollectionScheduleData.reduce((sum, item) => sum + item.expected, 0);
  }, [filteredCollectionScheduleData]);

  const filteredTenantCount = useMemo(() => {
    return filteredCollectionScheduleData.reduce((sum, item) => sum + item.tenants, 0);
  }, [filteredCollectionScheduleData]);
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
  const handleExportExcel = async () => {
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

    // Create styled workbook
    const wb = applyStyledExport(summaryData, 'Summary', [{ wch: 25 }, { wch: 20 }], {
      currencyColumns: [1],
      fileName: `Reconciliation_${months[selectedMonth - 1]}_${selectedYear}.xlsx`,
    });
    addStyledSheet(wb, detailsData, 'Payment Details', [
      { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 8 }, { wch: 12 },
    ], { statusColumns: [3], currencyColumns: [2, 4, 9] });

    try {
      await saveAndShareExcel(wb, `Reconciliation_${months[selectedMonth - 1]}_${selectedYear}.xlsx`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export Excel file');
    }
  };
  const renderContent = () => (
    <>
      {!standalone && (
        <SheetHeader className="pb-2 px-4 pt-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">
              Payment Reconciliation
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange?.(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>
      )}

      <div className={standalone ? "" : "px-4 pb-4 mt-2"}>
        <div>
          <div className="space-y-4">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2 bg-background p-1 w-full justify-between sm:justify-start">
              <Select value={dateRange} onValueChange={(v: DateRangeOption) => setDateRange(v)}>
                <SelectTrigger className="w-[130px] h-9 rounded-xl bg-background border border-input text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="last3">Last 3 Months</SelectItem>
                  <SelectItem value="last6">Last 6 Months</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="h-9 rounded-xl border border-input bg-muted/30 dark:bg-muted/15 text-foreground hover:bg-muted/50 font-semibold text-xs sm:text-sm px-3.5">
                <span>
                  {dateRange === 'current' 
                    ? `${months[selectedMonth - 1]} ${selectedYear}`
                    : `${monthsShort[monthsToShow[0].month - 1]} ${monthsToShow[0].year} - ${monthsShort[monthsToShow[monthsToShow.length - 1].month - 1]} ${monthsToShow[monthsToShow.length - 1].year}`
                  }
                </span>
              </Button>

              <Button onClick={handleExportExcel} className="h-9 rounded-xl bg-[#6b5ce7] hover:bg-[#5849d4] text-white font-medium flex items-center gap-1.5 px-3 ml-auto text-xs sm:text-sm">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
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

            {/* Payment Distribution */}
            {reconciliationData.paymentModeTotal > 0 && (
              <div className="bg-background border border-border/80 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-foreground">Payment Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500 mt-1" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">UPI Payments</span>
                          <span className="text-sm font-bold text-blue-600">
                            {reconciliationData.paymentModeTotal > 0 
                              ? `${Math.round((reconciliationData.upiTotal / reconciliationData.paymentModeTotal) * 100)}%` 
                              : '0%'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">₹{reconciliationData.upiTotal.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#10b981] mt-1" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">Cash Payments</span>
                          <span className="text-sm font-bold text-[#10b981]">
                            {reconciliationData.paymentModeTotal > 0 
                              ? `${Math.round((reconciliationData.cashTotal / reconciliationData.paymentModeTotal) * 100)}%` 
                              : '0%'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">₹{reconciliationData.cashTotal.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative h-36 w-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={pieChartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={38} 
                        outerRadius={54} 
                        paddingAngle={3} 
                        dataKey="value"
                      >
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#10b981'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-extrabold text-foreground">₹{reconciliationData.paymentModeTotal.toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total</span>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Payment Timeline */}
            {reconciliationData.paymentModeTotal > 0 && (
              <div className="bg-background border border-border/80 rounded-2xl p-3 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">Daily Payment Timeline</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">UPI</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-[#10b981]" />
                      <span className="text-muted-foreground">Cash</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-44 bg-transparent p-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={v => v > 0 ? `₹${(v / 1000).toFixed(0)}k` : '0'} width={28} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) return null;
                          const totalVal = payload.reduce((sum, entry) => sum + (entry.value as number), 0);
                          return (
                            <div className="bg-background border border-border px-2.5 py-1.5 rounded-xl shadow-md text-xs">
                              <p className="font-bold text-muted-foreground mb-1">{label} Jul</p>
                              {payload.map((entry: any) => (
                                <p key={entry.name} className="font-semibold" style={{ color: entry.name === 'upi' ? '#3b82f6' : '#10b981' }}>
                                  {entry.name === 'upi' ? 'UPI' : 'Cash'}: ₹{entry.value.toLocaleString()}
                                </p>
                              ))}
                              <div className="border-t border-border mt-1 pt-1 font-bold text-foreground">
                                Total: ₹{totalVal.toLocaleString()}
                              </div>
                            </div>
                          );
                        }} 
                      />
                      <Bar dataKey="upi" stackId="a" fill="#3b82f6" name="upi" />
                      <Bar dataKey="cash" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} name="cash" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}



            {/* Individual Payment Details */}
            <div className="space-y-2.5">
              <div className="flex flex-col gap-3">
                {/* Top row: Title and Search */}
                <div className="flex items-center justify-between w-full gap-3">
                  <h3 className="font-semibold text-sm">Payment Details ({filteredPaymentDetails.length})</h3>
                  <div className="relative shrink-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search tenant"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7 w-32 pl-6 text-xs"
                    />
                  </div>
                </div>
                {/* Bottom row: Filter and Expand/Collapse */}
                <div className="flex items-center justify-between w-full gap-3">
                  <ToggleGroup type="single" value={paymentFilter} onValueChange={v => v && setPaymentFilter(v)} size="sm">
                    <ToggleGroupItem value="all" className="text-xs px-2 h-7">All</ToggleGroupItem>
                    <ToggleGroupItem value="upi" className="text-xs px-2 h-7">UPI</ToggleGroupItem>
                    <ToggleGroupItem value="cash" className="text-xs px-2 h-7">Cash</ToggleGroupItem>
                  </ToggleGroup>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={expandAll}>
                      Expand All
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={collapseAll}>
                      Collapse All
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {filteredPaymentDetails.map((detail, detailIdx) => {
                  const detailKey = `${detail.tenantId}-${'month' in detail ? detail.month : selectedMonth}-${'year' in detail ? detail.year : selectedYear}`;
                  return (
                    <Collapsible key={detailKey} open={expandedTenants.has(detailKey)} onOpenChange={() => toggleTenantExpanded(detailKey)}>
                      <div className={`border border-border/60 bg-card rounded-xl overflow-hidden shadow-sm transition-all hover:shadow border-l-4 ${
                        detail.status === 'Paid' 
                          ? 'border-l-emerald-500 dark:border-l-emerald-600' 
                          : 'border-l-amber-500 dark:border-l-amber-600'
                      }`}>
                        <CollapsibleTrigger asChild>
                          <div className="flex min-h-12 cursor-pointer items-center justify-between border-b border-border/20 bg-muted/35 p-2 transition-colors hover:bg-muted/45 dark:bg-muted/15 dark:hover:bg-muted/20">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                                R{detail.roomNo}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-[13px] font-bold text-foreground">{detail.tenantName}</span>
                                  {dateRange !== 'current' && 'month' in detail && (
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                                      {monthsShort[(detail as any).month - 1]}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                                  {expandedTenants.has(detailKey) ? (
                                    <ChevronDown className="h-3 w-3 shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 shrink-0" />
                                  )}
                                  <span>Room {detail.roomNo}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <div className="text-right">
                                <div className="text-[13px] font-extrabold text-foreground">₹{detail.amountPaid.toLocaleString()}</div>
                              </div>
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                detail.status === 'Paid' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>
                                {detail.status}
                              </span>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="px-3 pb-3 pt-2.5 space-y-3 bg-background dark:bg-background/40">
                            {/* Summary breakdown row */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-1 text-xs border-b border-border/20">
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground text-[10px] uppercase font-medium tracking-wider">Monthly Rent:</span>
                                <span className="font-bold text-foreground">₹{detail.monthlyRent.toLocaleString()}</span>
                              </div>
                              
                              {detail.monthlyRent > detail.amountPaid && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-muted-foreground text-[10px] uppercase font-medium tracking-wider">Balance Due:</span>
                                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                    ₹{(detail.monthlyRent - detail.amountPaid).toLocaleString()}
                                  </span>
                                </div>
                              )}

                              {detail.entriesTotal !== detail.amountPaid && (
                                <div className="flex items-center gap-1.5 bg-destructive/10 text-destructive px-2 py-0.5 rounded text-[10px] font-bold">
                                  <span>Ledger Mismatch (₹{detail.entriesTotal.toLocaleString()} vs ₹{detail.amountPaid.toLocaleString()})</span>
                                </div>
                              )}
                            </div>

                            {/* Ledger transaction entries list */}
                            {detail.entries.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Log</span>
                                {detail.entries.map((entry, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-background dark:bg-card p-2 rounded-lg border border-border/20 text-xs shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase ${
                                        entry.mode === 'upi' 
                                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      }`}>
                                        {entry.mode}
                                      </span>
                                      <span className="text-muted-foreground text-[11px]">
                                        {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Full'} payment
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-foreground text-xs">₹{entry.amount.toLocaleString()}</span>
                                      <span className="text-[10px] text-muted-foreground block text-[9px]">{format(new Date(entry.date), 'dd MMM yyyy')}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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
        </div>
        </div>

        {/* Tenant Details Sheet for Day Click */}
        <TenantsByDueDaySheet
          open={dueDaySheetOpen}
          onOpenChange={setDueDaySheetOpen}
          day={selectedDueDay}
          rooms={rooms}
          payments={payments}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
    </>
  );

  if (standalone) {
    return <div className="flex flex-col h-full bg-background overflow-y-auto px-1.5 pb-12">{renderContent()}</div>;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden animate-in duration-300 bg-background" : "w-full sm:max-w-lg p-0 bg-background"}
      >
        <div className="flex flex-col h-full overflow-y-auto pb-4">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};
