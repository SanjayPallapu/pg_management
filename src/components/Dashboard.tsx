import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gsap } from "gsap";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Building,
  CreditCard,
  AlertTriangle,
  UserCheck,
  UserPlus,
  TrendingUp,
  UserMinus,
  ChevronDown,
  MessageSquare,
  ArrowLeft,
  Receipt,
  UserPlus,
  Scale,
  Wallet,
  Users,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Room, DashboardStats } from "@/types";
import { useTotalCollected } from "@/hooks/useTotalCollected";
import { useMonthContext } from "@/contexts/MonthContext";
import { usePG } from "@/contexts/PGContext";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useRealtimePayments } from "@/hooks/useRealtimePayments";
import { useRentCalculations } from "@/hooks/useRentCalculations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import { useAuth } from "@/hooks/useAuth";
import { DayGuestSheet } from "./DayGuestSheet";
import { SecurityDepositCard } from "./SecurityDepositCard";
import { PaymentModeCard } from "./PaymentModeCard";
import { VisitorFollowUpDialog } from "./VisitorFollowUpDialog";
import { EmptyBedsSheet } from "./EmptyBedsSheet";
import { PreviousMonthOverdueCard } from "./PreviousMonthOverdueCard";
import { TenantMovementCard } from "./TenantMovementCard";
import { TotalCollectedCard } from "./TotalCollectedCard";
import { PersonalExpensesCard } from "./PersonalExpensesCard";
import { TodaySpendingCard } from "./TodaySpendingCard";
import { AllCollectedCard } from "./AllCollectedCard";
import { PendingTenantsCard, PendingTenantsCardRef } from "./PendingTenantsCard";
import { CalculatorCard } from "./CalculatorCard";
import { KeyNumbersCard } from "./KeyNumbersCard";
import { BuildingRentCard } from "./BuildingRentCard";
import { PGRulesCard } from "./PGRulesCard";
import { BillUnitPricesCard } from "./BillUnitPricesCard";
import { RulesTemplate } from "./RulesTemplate";
import { SettlementSummarySheet } from "./SettlementSummarySheet";
import { DayGuestRevenueCard } from "./DayGuestRevenueCard";
import { OverduePaidCard } from "./OverduePaidCard";
import { BalanceCard } from "./BalanceCard";
import { BillsBudgetDashboard } from "./BillsBudgetDashboard";
import { CollectedByCard } from "./CollectedByCard";
import { ExpectedCollectionCard } from "./ExpectedCollectionCard";
import { TenantPricingOverviewCard } from "./TenantPricingOverviewCard";
import { isTenantActiveInMonth, isTenantActiveNow } from "@/utils/dateOnly";
import { getPricePerBed } from "@/constants/pricing";

interface DashboardProps {
  rooms: Room[];
  onStartRentCycle: () => void;
}

export const Dashboard = ({ rooms }: DashboardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const { payments } = useTenantPayments();
  const { isAdmin, isOwner } = useAuth();
  const canManageDayGuests = isAdmin || isOwner;
  useRealtimePayments(); // Subscribe to real-time payment updates
  const [dayGuestSheetOpen, setDayGuestSheetOpen] = useState(false);
  const [emptyBedsSheetOpen, setEmptyBedsSheetOpen] = useState(false);
  const [settlementSheetOpen, setSettlementSheetOpen] = useState(false);
  const [calculatorSheetOpen, setCalculatorSheetOpen] = useState(false);
  const [rulesTemplateOpen, setRulesTemplateOpen] = useState(false);
  const [visitorFollowUpOpen, setVisitorFollowUpOpen] = useState(false);
  const [rulesForTemplate, setRulesForTemplate] = useState<Array<{id: string; title: string; description: string; details: string[]; titleTe?: string; descriptionTe?: string; detailsTe?: string[]}>>([]);
  const [rulesLanguage, setRulesLanguage] = useState<'en' | 'te'>('en');

  // Section sheet states
  const pendingTenantsRef = useRef<PendingTenantsCardRef>(null);
  const isMobile = useIsMobile();
  const [financialsOpen, setFinancialsOpen] = useState(false);
  const [tenantsOpen, setTenantsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [billsBudgetGridOpen, setBillsBudgetGridOpen] = useState(false);
  const [billsBudgetOpen, setBillsBudgetOpen] = useState(false);

  // Active sheet state for Swiggy-style icon grid
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close all sheets/dialogs when URL changes or tab-click is triggered (handles same tab click reset)
  useEffect(() => {
    const handleCloseAll = () => {
      setDayGuestSheetOpen(false);
      setEmptyBedsSheetOpen(false);
      setSettlementSheetOpen(false);
      setCalculatorSheetOpen(false);
      setRulesTemplateOpen(false);
      setVisitorFollowUpOpen(false);
      setBillsBudgetGridOpen(false);
      setBillsBudgetOpen(false);
      setFinancialsOpen(false);
      setTenantsOpen(false);
      setToolsOpen(false);
    };

    handleCloseAll();

    window.addEventListener('tab-click', handleCloseAll);
    return () => window.removeEventListener('tab-click', handleCloseAll);
  }, [location.search]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    if (dashboardRef.current) {
      gsap.fromTo(
        dashboardRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.05, ease: "power2.out", clearProps: "all" }
      );
    }
  }, [currentPG?.id]);

  const openPendingTenants = () => {
    setTenantsOpen(true);
    window.setTimeout(() => pendingTenantsRef.current?.openSheet(), 0);
  };

  const { rentCollected, pendingRent } = useRentCalculations({
    selectedMonth,
    selectedYear,
    rooms,
    payments,
  });

  // Fetch day guest stats for selected month - filtered by current PG
  const { data: dayGuestStats, isLoading: dayGuestStatsLoading } = useQuery({
    queryKey: ["day-guest-revenue", selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0, guests: [] };

      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const toLocalISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const startStr = toLocalISO(startOfMonth);
      const endStr = toLocalISO(endOfMonth);

      // Include any guest whose stay overlaps the selected month
      // (from_date <= endOfMonth AND to_date >= startOfMonth)
      const { data, error } = await supabase
        .from("day_guests")
        .select("guest_name, from_date, to_date, total_amount, payment_status, amount_paid, payment_entries, rooms!inner(pg_id, room_no)")
        .eq("rooms.pg_id", currentPG.id)
        .lte("from_date", endStr)
        .gte("to_date", startStr)
        .order("from_date", { ascending: false });

      if (error) {
        console.error("Error fetching day guest stats:", error);
        return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0, guests: [] };
      }

      const collected = data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
      const pending = data.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);

      // Calculate UPI and Cash totals
      let upi = 0;
      let cash = 0;
      data.forEach((g) => {
        const entries = (g.payment_entries as any[]) || [];
        entries.forEach((entry) => {
          if (entry.mode === "upi") {
            upi += entry.amount || 0;
          } else if (entry.mode === "cash") {
            cash += entry.amount || 0;
          }
        });
      });

      const guests = data.map((g: any) => ({
        name: g.guest_name as string,
        roomNo: (g.rooms?.room_no as string) || "",
        fromDate: g.from_date as string,
        toDate: g.to_date as string,
        total: g.total_amount as number,
        paid: (g.amount_paid as number) || 0,
        balance: (g.total_amount as number) - ((g.amount_paid as number) || 0),
        status: g.payment_status as string,
      }));

      return { collected, pending, count: data.length, upi, cash, guests };
    },
    enabled: !!currentPG?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);

  // Check if viewing current month
  const today = new Date();
  const isCurrentMonth = selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear();

  const roomStats = rooms.map((room) => {
    const activeTenants = room.tenants.filter((t) => {
      const activeInSelectedMonth = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
      if (isCurrentMonth) {
        return activeInSelectedMonth && isTenantActiveNow(t.startDate, t.endDate);
      }
      return activeInSelectedMonth;
    });
    const activeCount = activeTenants.length;

    // Ensure we don't count more occupied than capacity
    const occupied = Math.min(activeCount, room.capacity);
    const emptyBeds = Math.max(0, room.capacity - occupied);
    const perBedRent = getPricePerBed(room.capacity);
    const potentialAdditionalRent = emptyBeds * perBedRent;

    return {
      roomNo: room.roomNo,
      capacity: room.capacity,
      occupied,
      emptyBeds,
      perBedRent,
      potentialAdditionalRent,
      floor: room.floor,
      isFull: occupied === room.capacity,
      isEmpty: occupied === 0,
    };
  });

  const totalOccupied = roomStats.reduce((sum, r) => sum + r.occupied, 0);
  const totalEmptyBeds = roomStats.reduce((sum, r) => sum + r.emptyBeds, 0);
  const totalPotentialAdditionalRevenue = roomStats.reduce((sum, r) => sum + r.potentialAdditionalRent, 0);
  const fullyOccupiedRooms = roomStats.filter((r) => r.isFull).length;
  const vacantRooms = roomStats.filter((r) => r.isEmpty).length;
  const occupancyPercent = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

  // Current revenue from present tenants (sum of their monthly rents)
  const currentMonthlyRevenue = rooms.reduce((sum, room) => {
    const activeTenants = room.tenants.filter((t) => {
      const activeInSelectedMonth = isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth);
      if (isCurrentMonth) {
        return activeInSelectedMonth && isTenantActiveNow(t.startDate, t.endDate);
      }
      return activeInSelectedMonth;
    });
    return sum + activeTenants.reduce((s, t) => s + t.monthlyRent, 0);
  }, 0);

  // Max monthly revenue if all beds filled (using fixed per-bed rates)
  const maxMonthlyRevenue = rooms.reduce((sum, room) => sum + room.capacity * getPricePerBed(room.capacity), 0);

  // Use shared hook for total collected
  const { totalCollected: totalCollectedForExpenses } = useTotalCollected(rooms);

  const stats: DashboardStats = {
    totalRooms: rooms.length,
    occupiedCount: fullyOccupiedRooms,
    vacantCount: vacantRooms,
    rentCollected,
    pendingRent,
  };

  return (
    <>
      <div ref={dashboardRef} className="space-y-3">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.005]">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today overview</p>
                <h2 className="mt-1 text-2xl font-bold leading-tight">₹{stats.pendingRent.toLocaleString()} pending</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  ₹{stats.rentCollected.toLocaleString()} collected · {totalEmptyBeds} empty bed{totalEmptyBeds === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={openPendingTenants}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm active:scale-95"
              >
                Collect
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={openPendingTenants}
                className="rounded-lg border border-border/70 bg-background/60 p-3 text-left"
              >
                <p className="text-[11px] text-muted-foreground">Pending</p>
                <p className="mt-1 text-base font-bold text-pending">₹{stats.pendingRent.toLocaleString()}</p>
              </button>
              <button
                type="button"
                onClick={() => setEmptyBedsSheetOpen(true)}
                className="rounded-lg border border-border/70 bg-background/60 p-3 text-left"
              >
                <p className="text-[11px] text-muted-foreground">Occupancy</p>
                <p className="mt-1 text-base font-bold">{Math.round(occupancyPercent)}%</p>
              </button>
              <button
                type="button"
                onClick={() => setDayGuestSheetOpen(true)}
                className="rounded-lg border border-border/70 bg-background/60 p-3 text-left"
              >
                <p className="text-[11px] text-muted-foreground">Day guests</p>
                <p className="mt-1 text-base font-bold">₹{(dayGuestStats?.collected || 0).toLocaleString()}</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Split KPI Cards */}
        <div className="grid gap-2 md:grid-cols-2">
          {/* Capacity & Occupancy Split Card */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Left: Capacity */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Capacity</span>
                    <Building
                      className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setCalculatorSheetOpen(true)}
                    />
                  </div>
                  <div className="text-2xl font-bold">
                    {totalOccupied}/{totalCapacity}
                  </div>
                  <p className="text-xs text-muted-foreground">{stats.totalRooms} rooms across 3 floors</p>
                </div>
                {/* Right: Occupancy */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Occupancy</span>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{stats.occupiedCount} rooms</div>
                  <p className="text-xs text-muted-foreground">{occupancyPercent.toFixed(1)}% total occupancy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rent Collected & Pending Split Card */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Left: Collected */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Collected</span>
                    <CreditCard className="h-4 w-4 text-paid" />
                  </div>
                  <div className="text-2xl font-bold text-paid">₹{stats.rentCollected.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </div>
                {/* Right: Pending */}
                <div className="p-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-r-lg" onClick={openPendingTenants}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Pending</span>
                    <AlertTriangle className="h-4 w-4 text-pending" />
                  </div>
                  <div className="text-2xl font-bold text-pending">₹{stats.pendingRent.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Needs collection</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Potential Revenue Card - moved below Collected/Pending */}
        <Card
          className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 cursor-pointer transition-all hover:shadow-md"
          onClick={() => setEmptyBedsSheetOpen(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">If PG Gets Full</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="text-lg font-bold text-paid">₹{currentMonthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{totalOccupied} tenants now</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">₹{maxMonthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Max capacity</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm font-semibold text-pending">
                +₹{Math.round(maxMonthlyRevenue - currentMonthlyRevenue).toLocaleString()} possible
              </div>
              <div className="text-xs text-muted-foreground">{totalEmptyBeds} beds empty</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Tap to view breakdown</p>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════
            Quick Actions
           ═══════════════════════════════════════════════ */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div 
            onClick={openPendingTenants}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-primary/10 p-2.5 rounded-full">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">Collect<br/>Rent</span>
          </div>
          
          <div 
            onClick={() => navigate('/rooms')}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-blue-500/10 p-2.5 rounded-full">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">Add<br/>Tenant</span>
          </div>

          <div 
            onClick={() => setBillsBudgetOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-orange-500/10 p-2.5 rounded-full">
              <Receipt className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">Record<br/>Expense</span>
          </div>

          <div 
            onClick={() => setVisitorFollowUpOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-purple-500/10 p-2.5 rounded-full">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">Add<br/>Visitor</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            Category List Sections
           ═══════════════════════════════════════════════ */}
        <div className="space-y-3">
          {/* Bills & Budget */}
          <div 
            onClick={() => setBillsBudgetGridOpen(true)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
          >
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
              <Scale className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Bills & Budget</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Manage room utility bills & budgets</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>

          {/* Financials */}
          <div 
            onClick={() => setFinancialsOpen(true)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
          >
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
              <Wallet className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Financials</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Payments, deposits, building rent</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>

          {/* Tenants */}
          <div 
            onClick={() => setTenantsOpen(true)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
          >
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
              <Users className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">Tenants</h3>
                {stats.pendingRent > 0 && (
                  <span className="bg-pending/10 text-pending text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Pending, pricing and movement</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>

          {/* Tools & Admin */}
          <div 
            onClick={() => setToolsOpen(true)}
            className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
          >
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
              <Settings className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">Tools & Admin</h3>
              <p className="text-xs text-muted-foreground mt-0.5">App settings, calculators & rules</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
        </div>
        {/* ── Financials ── */}
        {/* (Categories replaced with List Cards) */}
      </div>

      {/* ═══════════════════════════════════════════════
          Active Card Sheets – opened by Swiggy icon clicks
         ═══════════════════════════════════════════════ */}
      <Sheet open={activeSheet === "collected-by"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Collected By</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><CollectedByCard onClose={() => setActiveSheet(null)} defaultOpen={true} /></div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "payment-mode"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Payment Mode</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><PaymentModeCard rooms={rooms} /></div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "total-collected"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Total Collected</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3">
              <TotalCollectedCard rooms={rooms} rentCollected={rentCollected} />
              <PaymentModeCard rooms={rooms} />
              <AllCollectedCard rooms={rooms} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "all-collected"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">All Collected</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><AllCollectedCard rooms={rooms} /></div>
          </div>
        </SheetContent>
      </Sheet>
      {activeSheet === "security-deposit" && (
        <SecurityDepositCard rooms={rooms} defaultOpen={true} onClose={() => setActiveSheet(null)} showSummaryCard={false} />
      )}
      <Sheet open={activeSheet === "overdue-overview"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Overdue Overview</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3">
              <PreviousMonthOverdueCard defaultOpen={false} showSummaryCard={true} />
              <OverduePaidCard rooms={rooms} defaultOpen={false} showSummaryCard={true} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "building-rent"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Building Rent</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><BuildingRentCard defaultOpen={true} /></div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tenant Sheets */}
      {activeSheet === "pending-tenants" && (
        <PendingTenantsCard ref={pendingTenantsRef} rooms={rooms} onClose={() => setActiveSheet(null)} defaultOpen={true} showSummaryCard={false} />
      )}
      {activeSheet === "expected-collection" && (
        <ExpectedCollectionCard defaultOpen={true} showSummaryCard={false} onClose={() => setActiveSheet(null)} />
      )}
      <Sheet open={activeSheet === "tenant-pricing"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Tenant Pricing</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><TenantPricingOverviewCard defaultOpen={true} /></div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "tenant-movement"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Tenant Movement</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><TenantMovementCard rooms={rooms} defaultOpen={true} onClose={() => setActiveSheet(null)} /></div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tool Sheets */}
      <Sheet open={activeSheet === "calculator"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Calculator</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><CalculatorCard defaultOpen={true} /></div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "key-numbers"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Key Numbers</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><KeyNumbersCard defaultOpen={true} onClose={() => setActiveSheet(null)} /></div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "pg-rules"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">PG Rules</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3">
              <PGRulesCard defaultOpen={true} onClose={() => setActiveSheet(null)} onEditableTemplate={(rules, language) => { setActiveSheet(null); setRulesForTemplate(rules); setRulesLanguage(language); setRulesTemplateOpen(true); }} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={activeSheet === "bill-prices"} onOpenChange={(o) => !o && setActiveSheet(null)}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Bill Unit Prices</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><BillUnitPricesCard defaultOpen={true} onClose={() => setActiveSheet(null)} /></div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bills & Budget Sheet */}
      <Sheet open={billsBudgetOpen} onOpenChange={setBillsBudgetOpen}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setBillsBudgetOpen(false)} aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1.5 flex-1">
                  <Scale className="h-4 w-4 text-primary shrink-0" />
                  <SheetTitle className="text-base text-foreground font-bold">Bills & Budget</SheetTitle>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-4">
              <BillsBudgetDashboard rooms={rooms} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Financials Sheet */}
      <Sheet open={financialsOpen} onOpenChange={setFinancialsOpen}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setFinancialsOpen(false)} aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1.5 flex-1">
                  <Wallet className="h-4 w-4 text-primary shrink-0" />
                  <SheetTitle className="text-base text-foreground font-bold">Financials</SheetTitle>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3">
              <CollectedByCard />
              <PaymentModeCard rooms={rooms} />
              <TotalCollectedCard rooms={rooms} rentCollected={rentCollected} />
              <AllCollectedCard rooms={rooms} />
              <SecurityDepositCard rooms={rooms} />
              <PreviousMonthOverdueCard />
              <OverduePaidCard rooms={rooms} />
              <BuildingRentCard />
              <DayGuestRevenueCard
                onClick={() => {
                  setFinancialsOpen(false);
                  setDayGuestSheetOpen(true);
                }}
                stats={dayGuestStats ?? undefined}
                isLoading={dayGuestStatsLoading}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tenants Sheet */}
      <Sheet open={tenantsOpen} onOpenChange={setTenantsOpen}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTenantsOpen(false)} aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1.5 flex-1">
                  <Users className="h-4 w-4 text-primary shrink-0" />
                  <SheetTitle className="text-base text-foreground font-bold">Tenants Overview</SheetTitle>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3">
              <PendingTenantsCard ref={pendingTenantsRef} rooms={rooms} onClose={() => setActiveSheet(null)} defaultOpen={true} showSummaryCard={false} />
              <ExpectedCollectionCard />
              <TenantPricingOverviewCard />
              <TenantMovementCard rooms={rooms} />
              <Card
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => {
                  setTenantsOpen(false);
                  setSettlementSheetOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Left Tenants</span>
                    <UserMinus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-lg font-bold">Settlement Summary</div>
                  <p className="text-xs text-muted-foreground">View pro-rata calculations for departed tenants</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tools Sheet */}
      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setToolsOpen(false)} aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-1.5 flex-1">
                  <Settings className="h-4 w-4 text-primary shrink-0" />
                  <SheetTitle className="text-base text-foreground font-bold">Tools & Admin</SheetTitle>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3">
              <CalculatorCard />
              <KeyNumbersCard />
              <PGRulesCard onEditableTemplate={(rules, language) => { setToolsOpen(false); setRulesForTemplate(rules); setRulesLanguage(language); setRulesTemplateOpen(true); }} />
              <BillUnitPricesCard />
              <Card
                className="cursor-pointer transition-all hover:shadow-md border-primary/20 bg-card hover:bg-muted/30"
                onClick={() => {
                  setToolsOpen(false);
                  setVisitorFollowUpOpen(true);
                }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <span className="block font-semibold text-sm">Visitor Follow-up</span>
                      <span className="text-xs text-muted-foreground">Polite enquiry for prospective tenants who visited</span>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-medium shrink-0">Open →</span>
                </CardContent>
              </Card>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Rules Template Sheet */}
      <RulesTemplate open={rulesTemplateOpen} onOpenChange={setRulesTemplateOpen} rules={rulesForTemplate} language={rulesLanguage} />

      {canManageDayGuests && <DayGuestSheet open={dayGuestSheetOpen} onOpenChange={setDayGuestSheetOpen} />}
      <EmptyBedsSheet
        open={emptyBedsSheetOpen}
        onOpenChange={setEmptyBedsSheetOpen}
        roomStats={roomStats}
        totalEmptyBeds={totalEmptyBeds}
        totalPotentialRevenue={totalPotentialAdditionalRevenue}
        onVisitorFollowUp={() => {
          setEmptyBedsSheetOpen(false);
          setVisitorFollowUpOpen(true);
        }}
      />
      <SettlementSummarySheet open={settlementSheetOpen} onOpenChange={setSettlementSheetOpen} rooms={rooms} />
      {/* Hidden calculator triggered by building icon */}
      <CalculatorCard externalOpen={calculatorSheetOpen} onExternalOpenChange={setCalculatorSheetOpen} hideCard />

      <VisitorFollowUpDialog
        open={visitorFollowUpOpen}
        onOpenChange={setVisitorFollowUpOpen}
        rooms={rooms}
      />
      <Sheet open={financialsOpen} onOpenChange={setFinancialsOpen}>
        <SheetContent side="bottom" className="h-[75vh] px-4 pt-6 pb-0 rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Financials</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-3 gap-y-5">
            {[
              { key: "collected-by", icon: "/icons/safe-new.png", label: "Collected By" },
              { key: "total-collected", icon: "/icons/total-collected-update.png", label: "Total Collected" },
              { key: "security-deposit", icon: "/icons/wallet-new.png", label: "Security Deposit", padding: "p-3" },
              { key: "overdue-overview", icon: "/icons/overdue-overview-new.jpg", label: "Overdue", cover: true },
              { key: "day-guest", icon: "/icons/bed-3d.png", label: "Day Guests" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95"
                onClick={() => { setFinancialsOpen(false); setTimeout(() => item.key === "day-guest" ? setDayGuestSheetOpen(true) : setActiveSheet(item.key), 300); }}
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-1.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 shadow-sm relative">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className={`w-full h-full transition-transform duration-200 group-hover:scale-110 ${item.cover ? 'object-cover' : `object-contain ${item.padding || 'p-2'}`}`}
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={tenantsOpen} onOpenChange={setTenantsOpen}>
        <SheetContent side="bottom" className="h-[75vh] px-4 pt-6 pb-0 rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Tenants</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-3 gap-y-5">
            {[
              { key: "pending-tenants", icon: "/icons/pending-updte.jpg", label: "Pending" },
              { key: "expected-collection", icon: "/icons/expected-updte.png", label: "Expected" },
              { key: "tenant-pricing", icon: "/icons/tenant-pricing-3d.jpg", label: "Pricing" },
              { key: "tenant-movement", icon: "/icons/movemnet-update.png", label: "Movement" },
              { key: "settlement", icon: "/icons/settlement-final.jpg", label: "Settlement" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95"
                onClick={() => { setTenantsOpen(false); setTimeout(() => item.key === "settlement" ? setSettlementSheetOpen(true) : item.key === "pending-tenants" ? openPendingTenants() : setActiveSheet(item.key), 300); }}
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-1.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 shadow-sm relative">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent side="bottom" className="h-[75vh] px-4 pt-6 pb-0 rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Tools & Admin</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-3 gap-y-5">
            {[
              { key: "calculator", icon: "/icons/calculator-3d.jpg", label: "Calculator" },
              { key: "key-numbers", icon: "/icons/key-numbers-3d.png", label: "Key Numbers" },
              { key: "pg-rules", icon: "/icons/pg-rules-3d.png", label: "PG Rules" },
              { key: "bill-prices", icon: "/icons/electricity-bill-update.png", label: "Bill Prices" },
              { key: "visitor-followup", icon: "/icons/visitor-3d.png", label: "Visitor" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95"
                onClick={() => { setToolsOpen(false); setTimeout(() => item.key === "visitor-followup" ? setVisitorFollowUpOpen(true) : setActiveSheet(item.key), 300); }}
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-1.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 shadow-sm relative">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={billsBudgetGridOpen} onOpenChange={setBillsBudgetGridOpen}>
        <SheetContent side="bottom" className="h-[75vh] px-4 pt-6 pb-0 rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Bills & Budget</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-3 gap-y-5">
            {[
              { key: "building-rent", icon: "/icons/rent-update.png", label: "Building Rent" },
              { key: "bills-budget", icon: "/icons/budget-update.png", label: "Overview" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95"
                onClick={() => { setBillsBudgetGridOpen(false); setTimeout(() => item.key === "building-rent" ? setActiveSheet("building-rent") : setBillsBudgetOpen(true), 300); }}
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-1.5 flex items-center justify-center bg-slate-50 border border-slate-200/60 shadow-sm relative">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-full object-contain p-2 transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
