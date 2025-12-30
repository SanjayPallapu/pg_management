import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, AlertTriangle, User, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useMonthContext } from '@/contexts/MonthContext';
import { useRooms } from '@/hooks/useRooms';
import { useRentCalculations } from '@/hooks/useRentCalculations';
import { PaymentEntry } from '@/types';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { format, getDaysInMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';

interface PaymentReconciliationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)'];

export const PaymentReconciliation = ({ open, onOpenChange }: PaymentReconciliationProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  const { rentCollected, paidTenants, partialTenants } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const reconciliationData = useMemo(() => {
    // Get eligible tenant IDs
    const eligibleTenantIds = new Set(
      rooms.flatMap(room =>
        room.tenants
          .filter(tenant => isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth))
          .map(tenant => tenant.id)
      )
    );

    // Get payments from eligible tenants
    const eligiblePayments = payments.filter(
      p => p.month === selectedMonth && 
           p.year === selectedYear && 
           eligibleTenantIds.has(p.tenantId)
    );

    // Calculate payment mode totals from entries
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

      // Find earliest entry date for sorting
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
        });
      }
    });

    // Sort payment details by earliest entry date
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
      partialCount: partialTenants.length,
    };
  }, [payments, selectedMonth, selectedYear, rooms, rentCollected, paidTenants, partialTenants]);

  // Filtered payment details based on filter selection
  const filteredPaymentDetails = useMemo(() => {
    if (paymentFilter === 'all') return reconciliationData.paymentDetails;
    
    return reconciliationData.paymentDetails
      .map(detail => ({
        ...detail,
        entries: detail.entries.filter(e => e.mode === paymentFilter),
        entriesTotal: detail.entries.filter(e => e.mode === paymentFilter).reduce((sum, e) => sum + e.amount, 0),
      }))
      .filter(detail => detail.entries.length > 0);
  }, [reconciliationData.paymentDetails, paymentFilter]);

  // Chart data
  const pieChartData = useMemo(() => [
    { name: 'UPI', value: reconciliationData.upiTotal, count: reconciliationData.upiCount },
    { name: 'Cash', value: reconciliationData.cashTotal, count: reconciliationData.cashCount },
  ], [reconciliationData]);

  const barChartData = useMemo(() => [
    { name: 'UPI', amount: reconciliationData.upiTotal },
    { name: 'Cash', amount: reconciliationData.cashTotal },
  ], [reconciliationData]);

  // Daily timeline chart data
  const dailyTimelineData = useMemo(() => {
    const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1));
    const dailyData: Array<{ day: number; upi: number; cash: number; total: number }> = [];
    
    // Initialize all days
    for (let day = 1; day <= daysInMonth; day++) {
      dailyData.push({ day, upi: 0, cash: 0, total: 0 });
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
    setExpandedTenants(new Set(filteredPaymentDetails.map(d => d.tenantId)));
  };

  const collapseAll = () => {
    setExpandedTenants(new Set());
  };

  const handleExportExcel = () => {
    // Summary sheet data
    const summaryData = [
      { Metric: 'Month', Value: `${months[selectedMonth - 1]} ${selectedYear}` },
      { Metric: 'Rent Collected', Value: reconciliationData.rentCollected },
      { Metric: 'Payment Entries Total', Value: reconciliationData.paymentModeTotal },
      { Metric: 'UPI Total', Value: reconciliationData.upiTotal },
      { Metric: 'UPI Transactions', Value: reconciliationData.upiCount },
      { Metric: 'Cash Total', Value: reconciliationData.cashTotal },
      { Metric: 'Cash Transactions', Value: reconciliationData.cashCount },
      { Metric: 'Match Status', Value: reconciliationData.isMatching ? 'Matched' : 'Mismatch' },
      { Metric: 'Difference', Value: reconciliationData.difference },
    ];

    // Payment details sheet data
    const detailsData = reconciliationData.paymentDetails.flatMap(detail => 
      detail.entries.length > 0 
        ? detail.entries.map((entry, idx) => ({
            'Tenant Name': detail.tenantName,
            'Room No': detail.roomNo,
            'Monthly Rent': detail.monthlyRent,
            'Status': detail.status,
            'Amount Paid': detail.amountPaid,
            'Entry #': idx + 1 as string | number,
            'Entry Type': entry.type as string,
            'Entry Date': format(new Date(entry.date), 'dd MMM yyyy'),
            'Entry Mode': entry.mode.toUpperCase(),
            'Entry Amount': entry.amount as string | number,
          }))
        : [{
            'Tenant Name': detail.tenantName,
            'Room No': detail.roomNo,
            'Monthly Rent': detail.monthlyRent,
            'Status': detail.status,
            'Amount Paid': detail.amountPaid,
            'Entry #': '-' as string | number,
            'Entry Type': '-' as string,
            'Entry Date': '-',
            'Entry Mode': '-',
            'Entry Amount': '-' as string | number,
          }]
    );

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    const detailsWs = XLSX.utils.json_to_sheet(detailsData);
    XLSX.utils.book_append_sheet(wb, detailsWs, 'Payment Details');

    // Download
    XLSX.writeFile(wb, `Reconciliation_${months[selectedMonth - 1]}_${selectedYear}.xlsx`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="flex items-center gap-2">
              Payment Reconciliation
              <Badge variant="outline">{months[selectedMonth - 1]} {selectedYear}</Badge>
            </SheetTitle>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
          <div className="space-y-6">
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
                {reconciliationData.isMatching ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">All payments match!</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">
                      Difference: ₹{Math.abs(reconciliationData.difference).toLocaleString()}
                      {reconciliationData.difference > 0 ? ' (Rent > Entries)' : ' (Entries > Rent)'}
                    </span>
                  </>
                )}
              </div>

              {/* Explanation */}
              {!reconciliationData.isMatching && (
                <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                  <strong>Why mismatch?</strong> Rent Collected uses <code>monthlyRent</code> for fully paid tenants, 
                  while Payment Entries sums actual amounts. Overpayments or corrections can cause differences.
                </div>
              )}
            </div>

            {/* Payment Distribution Charts */}
            {reconciliationData.paymentModeTotal > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Payment Distribution</h3>
                
                {/* Pie Chart */}
                <div className="h-48 bg-muted/30 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                          `₹${value.toLocaleString()} (${props.payload.count} txns)`,
                          name
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div className="h-32 bg-muted/30 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={40} />
                      <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {barChartData.map((_, index) => (
                          <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Daily Payment Timeline */}
            {reconciliationData.paymentModeTotal > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Daily Payment Timeline</h3>
                <div className="h-40 bg-muted/30 rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 10 }} 
                        tickFormatter={(day) => day}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        tickFormatter={(v) => v > 0 ? `₹${(v/1000).toFixed(0)}k` : '0'}
                        width={35}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `₹${value.toLocaleString()}`,
                          name === 'upi' ? 'UPI' : name === 'cash' ? 'Cash' : 'Total'
                        ]}
                        labelFormatter={(day) => `Day ${day}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="upi" 
                        stackId="1"
                        stroke="hsl(217, 91%, 60%)" 
                        fill="hsl(217, 91%, 60%)" 
                        fillOpacity={0.6}
                        name="upi"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cash" 
                        stackId="1"
                        stroke="hsl(142, 71%, 45%)" 
                        fill="hsl(142, 71%, 45%)" 
                        fillOpacity={0.6}
                        name="cash"
                      />
                      <Legend 
                        formatter={(value) => value === 'upi' ? 'UPI' : 'Cash'}
                        wrapperStyle={{ fontSize: 10 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

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
                <ToggleGroup type="single" value={paymentFilter} onValueChange={(v) => v && setPaymentFilter(v)} size="sm">
                  <ToggleGroupItem value="all" className="text-xs px-2 h-7">All</ToggleGroupItem>
                  <ToggleGroupItem value="upi" className="text-xs px-2 h-7">UPI</ToggleGroupItem>
                  <ToggleGroupItem value="cash" className="text-xs px-2 h-7">Cash</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                {filteredPaymentDetails.map((detail) => (
                  <Collapsible 
                    key={detail.tenantId} 
                    open={expandedTenants.has(detail.tenantId)}
                    onOpenChange={() => toggleTenantExpanded(detail.tenantId)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {expandedTenants.has(detail.tenantId) ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{detail.tenantName}</span>
                              <span className="text-xs text-muted-foreground">Room {detail.roomNo}</span>
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

                          {detail.entries.length > 0 && (
                            <div className="pt-2 border-t space-y-1">
                              {detail.entries.map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {entry.type === 'partial' ? 'Partial' : entry.type === 'remaining' ? 'Remaining' : 'Full'} on {format(new Date(entry.date), 'dd MMM')}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded ${entry.mode === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                      {entry.mode === 'upi' ? 'UPI' : 'Cash'}
                                    </span>
                                    <span className="font-medium">₹{entry.amount.toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}

                {reconciliationData.paymentDetails.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments recorded for this month
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
