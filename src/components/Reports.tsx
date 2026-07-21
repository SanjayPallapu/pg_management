import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Room } from '@/types';
import { 
  AlertTriangle, 
  BedDouble, 
  CheckCircle, 
  IndianRupee, 
  MapPin, 
  Users, 
  MessageSquare, 
  Search, 
  Layers, 
  TrendingUp, 
  ArrowRight,
  Printer,
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
  Percent
} from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { usePG } from '@/contexts/PGContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRent } from '@/contexts/RentContext';
import { useRentCalculations, TenantWithPayment } from '@/hooks/useRentCalculations';
import { useExpenseEntries } from '@/hooks/useExpenseEntries';
import { isTenantActiveInMonth } from '@/utils/dateOnly';
import { toast } from 'sonner';
import { applyStyledExport, XLSX as styledXLSX, saveAndShareExcel } from "@/utils/excelStyles";

interface ReportsProps {
  rooms: Room[];
}

export const Reports = ({ rooms }: ReportsProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const { rentRecords } = useRent();
  const [activeTab, setActiveTab] = useState<'overview' | 'collections' | 'occupancy'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  
  const {
    rentCollected,
    pendingRent,
    eligibleTenants,
    paidTenants,
    partialTenants,
    overdueTenants,
    advanceNotPaidTenants,
    notDueTenants
  } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments: rentRecords
  });

  // Query expenses for the selected month/year
  const { entries: expenses = [], grandTotal: totalExpenses } = useExpenseEntries(selectedMonth, selectedYear);

  const getActiveTenantsInMonth = (room: Room) => 
    room.tenants.filter(t => isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth));

  const vacantRooms = rooms.filter(room => getActiveTenantsInMonth(room).length === 0);
  const partiallyOccupiedRooms = rooms.filter(room => {
    const activeCount = getActiveTenantsInMonth(room).length;
    return activeCount > 0 && activeCount < room.capacity;
  });

  // Available beds calculations
  const totalBeds = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const occupiedBeds = rooms.reduce((sum, room) => sum + getActiveTenantsInMonth(room).length, 0);
  const totalAvailableBeds = totalBeds - occupiedBeds;
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  // Collection percentages
  const totalExpectedRevenue = rentCollected + pendingRent;
  const collectionRate = totalExpectedRevenue > 0 ? (rentCollected / totalExpectedRevenue) * 100 : 0;

  // Financial P&L
  const actualNetIncome = rentCollected - totalExpenses;
  const projectedNetIncome = totalExpectedRevenue - totalExpenses;
  const expenseRatio = rentCollected > 0 ? (totalExpenses / rentCollected) * 100 : 0;

  // Sorting and filtering pending tenants
  const sortedPendingTenants = useMemo(() => {
    const pending = eligibleTenants.filter(t => t.paymentCategory !== 'paid' && !t.isLocked);
    const getDueDay = (t: TenantWithPayment) => new Date(t.startDate).getDate();
    
    return pending.sort((a, b) => getDueDay(a) - getDueDay(b));
  }, [eligibleTenants]);

  // Filter pending by search input
  const filteredPendingTenants = useMemo(() => {
    return sortedPendingTenants.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.roomNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedPendingTenants, searchTerm]);

  // Group rooms by floors
  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, Room[]> = {};
    rooms.forEach(room => {
      if (!grouped[room.floor]) {
        grouped[room.floor] = [];
      }
      grouped[room.floor].push(room);
    });
    return grouped;
  }, [rooms]);

  const handleSendReminder = (tenantName: string, phone: string, amount: number, roomNo: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Valid contact number not found for tenant");
      return;
    }
    const message = `Hello ${tenantName}, this is a gentle reminder that your rent of ₹${amount.toLocaleString()} for Room ${roomNo} is pending. Please make the payment as soon as possible. Thank you!`;
    const encodedText = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, "_blank");
    toast.success(`Opening WhatsApp reminder chat for ${tenantName}`);
  };

  const exportToExcel = async () => {
    // 1. Executive Summary Table
    const summaryRows = [
      { Metric: "Month & Year", Value: `${activeMonthName} ${selectedYear}` },
      { Metric: "Total Revenue Collected", Value: `₹${rentCollected.toLocaleString()}` },
      { Metric: "Projected Revenue", Value: `₹${totalExpectedRevenue.toLocaleString()}` },
      { Metric: "Pending Collections", Value: `₹${pendingRent.toLocaleString()}` },
      { Metric: "Collection Rate", Value: `${collectionRate.toFixed(1)}%` },
      { Metric: "Total Operating Expenses", Value: `₹${totalExpenses.toLocaleString()}` },
      { Metric: "Net Income (Actual)", Value: `₹${actualNetIncome.toLocaleString()}` },
      { Metric: "Projected Net Income", Value: `₹${projectedNetIncome.toLocaleString()}` },
      { Metric: "Expense-to-Revenue Ratio", Value: `${expenseRatio.toFixed(1)}%` },
      { Metric: "Total Beds Capacity", Value: totalBeds },
      { Metric: "Occupied Beds", Value: occupiedBeds },
      { Metric: "Vacant Beds Available", Value: totalAvailableBeds },
      { Metric: "Beds Occupancy Rate", Value: `${occupancyRate.toFixed(1)}%` },
      { Metric: "Completely Vacant Rooms", Value: vacantRooms.length },
    ];

    // 2. Outstanding Rents Table
    const outstandingRows = sortedPendingTenants.map((t) => {
      const isPartial = t.paymentCategory === 'partial';
      const remaining = isPartial ? t.monthlyRent - (t.amountPaid || 0) : t.monthlyRent;
      const dueDay = new Date(t.startDate).getDate();
      return {
        "Room No": `Room ${t.roomNo}`,
        "Tenant Name": t.name,
        "Phone": t.phone || "N/A",
        "Due Day": dueDay,
        "Total Rent (₹)": t.monthlyRent,
        "Paid (₹)": t.amountPaid || 0,
        "Pending (₹)": remaining,
        "Status": t.paymentCategory === 'overdue' ? 'Overdue' : t.paymentCategory === 'partial' ? 'Partial' : 'Upcoming'
      };
    });

    // 3. Room & Floor Occupancy Table
    const occupancyRows: any[] = [];
    Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b).forEach((floor) => {
      const floorRooms = roomsByFloor[floor];
      floorRooms.sort((a,b) => a.roomNo.localeCompare(b.roomNo)).forEach((room) => {
        const roomOccupied = getActiveTenantsInMonth(room).length;
        const isVacant = roomOccupied === 0;
        const isFull = roomOccupied >= room.capacity;
        occupancyRows.push({
          "Floor": `Floor ${floor}`,
          "Room No": `Room ${room.roomNo}`,
          "Sharing Type": `${room.capacity} Sharing`,
          "Occupants": roomOccupied,
          "Beds Available": room.capacity - roomOccupied,
          "Status": isVacant ? "Empty" : isFull ? "Full" : `${roomOccupied}/${room.capacity} Occupied`
        });
      });
    });

    // Generate Excel File with sheets!
    const wb = styledXLSX.utils.book_new();

    // Summary Sheet
    const wsSummary = styledXLSX.utils.json_to_sheet(summaryRows);
    styledXLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

    // Outstanding Sheet
    const wsOutstanding = styledXLSX.utils.json_to_sheet(outstandingRows.length > 0 ? outstandingRows : [{ "Status": "No outstanding rents" }]);
    styledXLSX.utils.book_append_sheet(wb, wsOutstanding, "Outstanding Rent");

    // Occupancy Sheet
    const wsOccupancy = styledXLSX.utils.json_to_sheet(occupancyRows);
    styledXLSX.utils.book_append_sheet(wb, wsOccupancy, "Occupancy & Rooms");

    // Columns styling widths
    const colWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    const finalWb = applyStyledExport(summaryRows, "Overview Report", colWidths, {
      fileName: `${activeMonthName} ${selectedYear} Executive Report`,
    });

    // Re-append the other sheets to finalWb
    styledXLSX.utils.book_append_sheet(finalWb, wsOutstanding, "Outstanding Rent");
    styledXLSX.utils.book_append_sheet(finalWb, wsOccupancy, "Occupancy & Rooms");

    const fileName = `PG_Manager_Report_${activeMonthName}_${selectedYear}.xlsx`;
    await saveAndShareExcel(finalWb, fileName);
    toast.success("Excel report downloaded successfully!");
  };

  const handlePrintReport = () => {
    window.print();
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const activeMonthName = monthNames[selectedMonth - 1];

  return (
    <div className="space-y-3.5 text-left">
      {/* Visual Header - More compact padding */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-primary/10 p-3.5 flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-[9px] px-1.5 py-0">
            <Sparkles className="h-2.5 w-2.5 mr-1" /> Analytics Dashboard
          </Badge>
          <h2 className="text-sm font-bold tracking-tight">{activeMonthName} {selectedYear} Health Check</h2>
          <p className="text-[10px] text-muted-foreground">
            Month-to-date collections and occupancy breakdown.
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToExcel}
            className="rounded-xl h-8 text-[11px] gap-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-950/40 border-emerald-500/20 font-bold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintReport}
            className="rounded-xl h-8 text-[11px] gap-1 px-2.5 font-bold"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Pill Navigation Tabs - Segmented Control (iOS style, compact) */}
      <div className="flex bg-muted/80 p-0.5 rounded-lg gap-0.5 max-w-full">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
            activeTab === 'overview' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
            activeTab === 'collections' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Collections ({sortedPendingTenants.length})
        </button>
        <button
          onClick={() => setActiveTab('occupancy')}
          className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
            activeTab === 'occupancy' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Rooms & Beds
        </button>
      </div>

      {/* Content Sheets */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          
          {/* Executive P&L Income Statement Card - Compact Padding */}
          <Card className="border border-primary/10 overflow-hidden relative bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between border-b bg-muted/20">
              <div className="text-left">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Financial Statement (P&L)</CardTitle>
              </div>
              <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-3 gap-1 divide-x">
                <div className="space-y-0.5 text-left">
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <ArrowUpCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                    Revenue
                  </span>
                  <p className="text-sm font-extrabold text-foreground">₹{rentCollected.toLocaleString()}</p>
                  <p className="text-[8px] text-muted-foreground">₹{totalExpectedRevenue.toLocaleString()} proj.</p>
                </div>
                <div className="space-y-0.5 text-left pl-2">
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <ArrowDownCircle className="h-3 w-3 text-rose-500 shrink-0" />
                    Expenses
                  </span>
                  <p className="text-sm font-extrabold text-foreground">₹{totalExpenses.toLocaleString()}</p>
                  <p className="text-[8px] text-muted-foreground">{expenses.length} bills</p>
                </div>
                <div className="space-y-0.5 text-left pl-2">
                  <span className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-indigo-500 shrink-0" />
                    Net Income
                  </span>
                  <p className={`text-sm font-black ${actualNetIncome >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    ₹{actualNetIncome.toLocaleString()}
                  </p>
                  <p className="text-[8px] text-muted-foreground">₹{projectedNetIncome.toLocaleString()} proj.</p>
                </div>
              </div>

              {/* Progress bars indicators */}
              <div className="space-y-1.5 pt-2 border-t text-[10px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-muted-foreground">Expense-to-Revenue Ratio</span>
                  <span className="font-semibold text-muted-foreground">{expenseRatio.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(100, expenseRatio)} className="h-1 bg-muted" />
              </div>
            </CardContent>
          </Card>

          {/* Gauges Grid - Compact design */}
          <div className="grid gap-3 grid-cols-2">
            <Card className="border border-border/80">
              <CardContent className="p-3.5 flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center h-20 w-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-muted/40 stroke-current" 
                      strokeWidth="5" fill="none"
                    />
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-emerald-500 stroke-current transition-all duration-700 ease-out" 
                      strokeWidth="5" fill="none"
                      strokeDasharray="213.6"
                      strokeDashoffset={213.6 - (213.6 * collectionRate) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-bold text-emerald-500">{collectionRate.toFixed(0)}%</span>
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Collected</span>
                  </div>
                </div>
                <h4 className="font-bold text-[10px] mt-2">Rent Collection</h4>
              </CardContent>
            </Card>

            <Card className="border border-border/80">
              <CardContent className="p-3.5 flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center h-20 w-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-muted/40 stroke-current" 
                      strokeWidth="5" fill="none"
                    />
                    <circle 
                      cx="40" cy="40" r="34" 
                      className="text-indigo-500 stroke-current transition-all duration-700 ease-out" 
                      strokeWidth="5" fill="none"
                      strokeDasharray="213.6"
                      strokeDashoffset={213.6 - (213.6 * occupancyRate) / 100}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-bold text-indigo-500">{occupancyRate.toFixed(0)}%</span>
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase">Occupied</span>
                  </div>
                </div>
                <h4 className="font-bold text-[10px] mt-2">Beds Filled</h4>
              </CardContent>
            </Card>
          </div>

          {/* Quick Metrics Grid - Denser padding */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Vacant Rooms</span>
                <p className="text-sm font-black text-rose-500 mt-0.5">{vacantRooms.length} Rooms</p>
              </div>
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            </Card>
            <Card className="p-2.5 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Vacant Beds</span>
                <p className="text-sm font-black text-indigo-500 mt-0.5">{totalAvailableBeds} Beds</p>
              </div>
              <BedDouble className="h-4 w-4 text-indigo-500 shrink-0" />
            </Card>
          </div>

          {/* Executive KPI Summary Table */}
          <Card className="border border-border/80 overflow-hidden">
            <CardHeader className="py-2.5 px-3 border-b bg-muted/20">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Executive Performance Table</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="p-2.5">Key Performance Indicator</th>
                    <th className="p-2.5 text-right">Value / Status</th>
                    <th className="p-2.5 text-right">Target / Proj.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-2.5 font-medium">Rent Collection Rate</td>
                    <td className={`p-2.5 text-right font-bold ${collectionRate >= 90 ? 'text-emerald-500' : collectionRate >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {collectionRate.toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-right text-muted-foreground">100.0%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Beds Occupancy Rate</td>
                    <td className={`p-2.5 text-right font-bold ${occupancyRate >= 80 ? 'text-emerald-500' : occupancyRate >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {occupancyRate.toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-right text-muted-foreground">90.0%</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Actual Cash Collected</td>
                    <td className="p-2.5 text-right font-bold text-emerald-500">₹{rentCollected.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-muted-foreground">₹{totalExpectedRevenue.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Pending Collections</td>
                    <td className={`p-2.5 text-right font-bold ${pendingRent > 0 ? 'text-rose-400' : 'text-emerald-500'}`}>₹{pendingRent.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-muted-foreground">₹0</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Total Utility Expenses</td>
                    <td className="p-2.5 text-right font-semibold text-rose-500">₹{totalExpenses.toLocaleString()}</td>
                    <td className="p-2.5 text-right text-muted-foreground">Budgeted</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Net Income Margin</td>
                    <td className={`p-2.5 text-right font-extrabold ${actualNetIncome >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {totalExpectedRevenue > 0 ? ((actualNetIncome / totalExpectedRevenue) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="p-2.5 text-right text-muted-foreground">Positive</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* AI-Powered Analysis Summary Box */}
          <Card className="border border-indigo-500/10 bg-indigo-500/5 dark:bg-indigo-950/10 relative overflow-hidden">
            <CardHeader className="py-2.5 px-3 border-b border-indigo-500/10">
              <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Monthly Health Analysis & Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-[11px] leading-relaxed text-foreground/90 space-y-2">
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <p>
                  <strong>Rent Collections Status:</strong> Collected <span className="font-semibold text-emerald-500">₹{rentCollected.toLocaleString()}</span> out of <span className="font-semibold">₹{totalExpectedRevenue.toLocaleString()}</span> expected. There is still <span className="font-bold text-rose-500">₹{pendingRent.toLocaleString()}</span> outstanding from <span className="font-semibold">{sortedPendingTenants.length} tenants</span>.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <p>
                  <strong>Occupancy Health:</strong> Currently operating at <span className="font-semibold text-indigo-500">{occupancyRate.toFixed(0)}% occupancy</span>, with <span className="font-semibold">{occupiedBeds} out of {totalBeds} beds occupied</span>. {totalAvailableBeds} beds across {vacantRooms.length} vacant rooms remain available for new bookings.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <p>
                  <strong>Cash Flow Analysis:</strong> Operating expenses of <span className="font-semibold text-rose-500">₹{totalExpenses.toLocaleString()}</span> result in actual net income of <span className="font-extrabold text-emerald-500">₹{actualNetIncome.toLocaleString()}</span>. This leaves a cash buffer of {totalExpenses > 0 ? ((actualNetIncome / totalExpenses) * 100).toFixed(0) : 0}% relative to expenses.
                </p>
              </div>
              {collectionRate < 85 && (
                <div className="rounded-lg bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/10 p-2 text-[10px] text-rose-600 dark:text-rose-400 mt-2 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Recommendation:</span> High rent balance remains outstanding. Switch to the <strong>Collections</strong> tab to ping pending tenants directly via WhatsApp.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'collections' && (
        <Card className="border border-border/80">
          <CardHeader className="py-2.5 px-3 flex items-center justify-between gap-3 border-b">
            <div className="text-left">
              <CardTitle className="text-xs font-bold">Outstanding Rent List</CardTitle>
            </div>
            <div className="relative w-44">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search room..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-6 h-7 rounded-lg text-[10px] py-1"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredPendingTenants.length === 0 ? (
              <div className="text-center py-6 px-4">
                <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
                <h4 className="font-semibold text-xs">All clear!</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  No pending rent payments found.
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[380px] overflow-y-auto">
                {filteredPendingTenants.map((tenant) => {
                  const isPartial = tenant.paymentCategory === 'partial';
                  const remaining = isPartial ? tenant.monthlyRent - (tenant.amountPaid || 0) : tenant.monthlyRent;
                  const dueDay = new Date(tenant.startDate).getDate();
                  
                  const statusColor = 
                    tenant.paymentCategory === 'overdue' ? 'text-rose-500 border-rose-500/20 bg-rose-500/5'
                    : tenant.paymentCategory === 'partial' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                    : 'text-blue-500 border-blue-500/20 bg-blue-500/5';

                  return (
                    <div key={tenant.id} className="flex items-center justify-between p-2.5 hover:bg-muted/10 transition-colors">
                      <div className="text-left space-y-0.5">
                        <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          {tenant.name}
                          <Badge variant="outline" className={`text-[8px] font-bold px-1.5 py-0 rounded ${statusColor}`}>
                            {tenant.paymentCategory === 'overdue' ? 'Overdue' 
                             : tenant.paymentCategory === 'partial' ? 'Partial' 
                             : 'Upcoming'}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span className="font-semibold text-foreground">Room {tenant.roomNo}</span>
                          <span>•</span>
                          <span>Due Day: {dueDay}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-black text-xs text-foreground">₹{remaining.toLocaleString()}</span>
                          {isPartial && (
                            <span className="block text-[8px] text-muted-foreground">Paid ₹{tenant.amountPaid}</span>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 border-emerald-500/10 rounded-lg shrink-0"
                          onClick={() => handleSendReminder(tenant.name, tenant.phone, remaining, tenant.roomNo)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'occupancy' && (
        <div className="space-y-2.5">
          {Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b).map((floor) => {
            const floorRooms = roomsByFloor[floor];
            const floorBeds = floorRooms.reduce((sum, r) => sum + r.capacity, 0);
            const floorOccupied = floorRooms.reduce((sum, r) => sum + getActiveTenantsInMonth(r).length, 0);
            const floorAvailable = floorBeds - floorOccupied;

            return (
              <Card key={floor} className="border border-border/80 overflow-hidden text-left">
                <CardHeader className="bg-muted/30 p-2.5 border-b">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                      <CardTitle className="text-xs font-bold">Floor {floor}</CardTitle>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <span>{floorOccupied}/{floorBeds} Filled</span>
                      <span className="h-2.5 w-[1px] bg-border" />
                      <span className="text-emerald-500 font-semibold">{floorAvailable} Empty</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3">
                    {floorRooms.sort((a,b) => a.roomNo.localeCompare(b.roomNo)).map((room) => {
                      const roomOccupied = getActiveTenantsInMonth(room).length;
                      const isVacant = roomOccupied === 0;
                      const isFull = roomOccupied >= room.capacity;

                      return (
                        <div 
                          key={room.roomNo} 
                          className={`p-2 rounded-lg border flex items-center justify-between gap-1 transition-all ${
                            isVacant 
                              ? 'bg-rose-500/5 border-rose-500/10' 
                              : isFull 
                                ? 'bg-emerald-500/5 border-emerald-500/10' 
                                : 'bg-amber-500/5 border-amber-500/10'
                          }`}
                        >
                          <div className="space-y-0.5 truncate text-left">
                            <span className="text-[11px] font-bold text-foreground">Room {room.roomNo}</span>
                            <p className="text-[8px] text-muted-foreground truncate">{room.capacity} Sharing</p>
                          </div>
                          <span className={`inline-flex rounded px-1 py-0.2 text-[8px] font-extrabold shrink-0 ${
                            isVacant 
                              ? "bg-rose-500/10 text-rose-600"
                              : isFull
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {isVacant ? "Empty" : isFull ? "Full" : `${roomOccupied}/${room.capacity}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Hidden Print-Only Dedicated Report Template */}
      <div id="print-report-container" className="hidden print:block bg-white text-black p-8 font-sans space-y-6 w-full text-left">
        {/* Style block for print media settings */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #print-report-container, #print-report-container * {
              visibility: visible;
            }
            #print-report-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
            }
            /* Custom page breaks */
            .page-break {
              page-break-before: always;
            }
            /* Hide print dialog overlays in background if any */
            [role="dialog"], .dialog, .fixed, footer, header, nav, aside {
              display: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}} />

        {/* Business Report Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">PG HUB Report</h1>
            <p className="text-sm font-semibold text-slate-600">
              Executive Performance & Monthly Health Summary
            </p>
            <div className="text-xs text-slate-500 flex gap-4">
              <span><strong>Month:</strong> {activeMonthName} {selectedYear}</span>
              <span>•</span>
              <span><strong>PG Name:</strong> {currentPG?.name || "All Properties"}</span>
              {currentPG?.address && (
                <>
                  <span>•</span>
                  <span><strong>Address:</strong> {currentPG.address}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right space-y-1 text-xs text-slate-500">
            <span><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</span>
            <br />
            <span><strong>Status:</strong> Active</span>
          </div>
        </div>

        {/* Two-Column Chart Layout */}
        <div className="grid grid-cols-2 gap-8 py-4">
          {/* Rent Collection SVG Pie Chart */}
          <div className="border rounded-2xl p-5 bg-slate-50/50 flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">Rent Collection Rate</h3>
            <div className="relative h-32 w-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="64" cy="64" r="54" 
                  className="text-slate-200 stroke-current" 
                  strokeWidth="8" fill="none"
                />
                <circle 
                  cx="64" cy="64" r="54" 
                  className="text-emerald-600 stroke-current" 
                  strokeWidth="8" fill="none"
                  strokeDasharray="339.3"
                  strokeDashoffset={339.3 - (339.3 * collectionRate) / 100}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-800">{collectionRate.toFixed(1)}%</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase">Collected</span>
              </div>
            </div>
            <div className="mt-4 text-xs space-y-1 text-slate-600">
              <p>Collected: <strong>₹{rentCollected.toLocaleString()}</strong></p>
              <p>Expected: <strong>₹{totalExpectedRevenue.toLocaleString()}</strong></p>
            </div>
          </div>

          {/* Occupancy Beds Horizontal Bar Chart */}
          <div className="border rounded-2xl p-5 bg-slate-50/50 flex flex-col justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 text-center">Beds Occupancy Status</h3>
            <div className="space-y-4">
              <div className="relative h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle 
                    cx="64" cy="64" r="54" 
                    className="text-slate-200 stroke-current" 
                    strokeWidth="8" fill="none"
                  />
                  <circle 
                    cx="64" cy="64" r="54" 
                    className="text-indigo-600 stroke-current" 
                    strokeWidth="8" fill="none"
                    strokeDasharray="339.3"
                    strokeDashoffset={339.3 - (339.3 * occupancyRate) / 100}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-slate-800">{occupancyRate.toFixed(1)}%</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Occupied</span>
                </div>
              </div>
              <div className="text-xs text-center space-y-1 text-slate-600">
                <p>Occupied: <strong>{occupiedBeds} Beds</strong></p>
                <p>Available: <strong>{totalAvailableBeds} Beds</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* Executive summary table */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">1. Financial & Operational KPI Summary</h3>
          <table className="w-full text-xs text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase text-[10px]">
                <th className="p-2 border-r border-slate-300">KPI Metric Name</th>
                <th className="p-2 border-r border-slate-300 text-right">Value / Status</th>
                <th className="p-2 text-right">Target / Projected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              <tr>
                <td className="p-2 border-r border-slate-300 font-medium">Rent Collection Rate</td>
                <td className="p-2 border-r border-slate-300 text-right font-bold text-emerald-600">{collectionRate.toFixed(1)}%</td>
                <td className="p-2 text-right text-slate-500">100.0%</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-medium">Beds Occupancy Rate</td>
                <td className="p-2 border-r border-slate-300 text-right font-bold text-indigo-600">{occupancyRate.toFixed(1)}%</td>
                <td className="p-2 text-right text-slate-500">90.0%</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-medium">Actual Cash Collected</td>
                <td className="p-2 border-r border-slate-300 text-right font-bold text-emerald-600">₹{rentCollected.toLocaleString()}</td>
                <td className="p-2 text-right text-slate-500">₹{totalExpectedRevenue.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-medium">Pending Rent Outstanding</td>
                <td className="p-2 border-r border-slate-300 text-right font-bold text-rose-600">₹{pendingRent.toLocaleString()}</td>
                <td className="p-2 text-right text-slate-500">₹0</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-medium">Total Utility Expenses</td>
                <td className="p-2 border-r border-slate-300 text-right font-bold text-rose-500">₹{totalExpenses.toLocaleString()}</td>
                <td className="p-2 text-right text-slate-500">Budgeted</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-medium">Net Profit Margin</td>
                <td className="p-2 border-r border-slate-300 text-right font-bold text-slate-800">
                  {totalExpectedRevenue > 0 ? ((actualNetIncome / totalExpectedRevenue) * 100).toFixed(1) : 0}%
                </td>
                <td className="p-2 text-right text-slate-500">Positive</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AI Health Analysis insights */}
        <div className="border border-slate-300 bg-slate-50/50 p-4 rounded-xl space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Monthly Analysis & Insights</h4>
          <ul className="list-disc pl-4 space-y-1 text-xs text-slate-700">
            <li>Collected <strong>₹{rentCollected.toLocaleString()}</strong> out of <strong>₹{totalExpectedRevenue.toLocaleString()}</strong> expected ({collectionRate.toFixed(1)}%). There is an outstanding balance of <strong>₹{pendingRent.toLocaleString()}</strong> across <strong>{sortedPendingTenants.length} tenants</strong>.</li>
            <li>Currently running at <strong>{occupancyRate.toFixed(1)}% bed occupancy</strong> with <strong>{occupiedBeds} occupied beds</strong> and <strong>{totalAvailableBeds} vacant beds</strong>. Completely vacant rooms count: <strong>{vacantRooms.length}</strong>.</li>
            <li>Operating expenses of <strong>₹{totalExpenses.toLocaleString()}</strong> yield an actual cash buffer net income of <strong>₹{actualNetIncome.toLocaleString()}</strong>.</li>
          </ul>
        </div>

        {/* Page Break for Outstanding list */}
        <div className="page-break" />

        {/* 2. Outstanding Balance Details Table */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">2. Outstanding Rents & Balance Sheet</h3>
          <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase text-[9px]">
                <th className="p-2 border-r border-slate-300">Room</th>
                <th className="p-2 border-r border-slate-300">Tenant Name</th>
                <th className="p-2 border-r border-slate-300">Contact Number</th>
                <th className="p-2 border-r border-slate-300 text-right">Rent Due (₹)</th>
                <th className="p-2 border-r border-slate-300 text-right">Amount Paid (₹)</th>
                <th className="p-2 text-right">Pending Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {eligibleTenants.filter(t => t.paymentCategory !== 'paid' && !t.isLocked).map((tenant) => {
                const isPartial = tenant.paymentCategory === 'partial';
                const remaining = isPartial ? tenant.monthlyRent - (tenant.amountPaid || 0) : tenant.monthlyRent;
                return (
                  <tr key={tenant.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-300 font-semibold">Room {tenant.roomNo}</td>
                    <td className="p-2 border-r border-slate-300">{tenant.name}</td>
                    <td className="p-2 border-r border-slate-300">{tenant.phone || "N/A"}</td>
                    <td className="p-2 border-r border-slate-300 text-right">₹{tenant.monthlyRent.toLocaleString()}</td>
                    <td className="p-2 border-r border-slate-300 text-right text-emerald-600">₹{(tenant.amountPaid || 0).toLocaleString()}</td>
                    <td className="p-2 text-right font-bold text-rose-600">₹{remaining.toLocaleString()}</td>
                  </tr>
                );
              })}
              {sortedPendingTenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">No outstanding rents found for this month! 🎉</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. Room Occupancy breakdown */}
        <div className="space-y-2 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">3. Room & Bed Allocation Breakdown</h3>
          <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 uppercase text-[9px]">
                <th className="p-2 border-r border-slate-300">Floor</th>
                <th className="p-2 border-r border-slate-300">Room No</th>
                <th className="p-2 border-r border-slate-300">Room Sharing Type</th>
                <th className="p-2 border-r border-slate-300 text-center">Occupied Beds</th>
                <th className="p-2 border-r border-slate-300 text-center">Available Beds</th>
                <th className="p-2 text-center">Occupancy Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {rooms.sort((a,b) => a.roomNo.localeCompare(b.roomNo)).map((room) => {
                const roomOccupied = getActiveTenantsInMonth(room).length;
                const isVacant = roomOccupied === 0;
                const isFull = roomOccupied >= room.capacity;
                return (
                  <tr key={room.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-300">Floor {room.floor}</td>
                    <td className="p-2 border-r border-slate-300 font-semibold">Room {room.roomNo}</td>
                    <td className="p-2 border-r border-slate-300">{room.capacity} Sharing</td>
                    <td className="p-2 border-r border-slate-300 text-center font-medium">{roomOccupied}</td>
                    <td className="p-2 border-r border-slate-300 text-center text-emerald-600 font-bold">{room.capacity - roomOccupied}</td>
                    <td className="p-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isVacant ? "bg-rose-500/10 text-rose-700" : isFull ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>
                        {isVacant ? "Empty" : isFull ? "Full" : "Partial"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
