import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
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
import { isTenantActiveInMonth, isTenantActiveNow, hasTenantLeftNow } from "@/utils/dateOnly";
import { getPricePerBed } from "@/constants/pricing";

import bannerFillEveryBed from "@/assets/banner-fill-every-bed.png";
import bannerRentOnTime from "@/assets/banner-rent-on-time.png";
import bannerNeverMissRent from "@/assets/banner-never-miss-rent.png";
import bannerGrowYourPg from "@/assets/banner-grow-your-pg.png";
import bannerBillsBudget from "@/assets/banner-bills-budget.png";
import bannerEverythingOnePlace from "@/assets/banner-everything-one-place.png";
import bannerReceiptsInstantly from "@/assets/banner-receipts-instantly.png";

interface DashboardProps {
  rooms: Room[];
  onStartRentCycle: () => void;
  onQuickAddTenant: (room: Room) => void;
  onNavigateToRent: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Dashboard = ({ rooms, onStartRentCycle, onQuickAddTenant, onNavigateToRent, onNavigateToTab }: DashboardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const { payments } = useTenantPayments();
  const { isAdmin, isOwner } = useAuth();
  const canManageDayGuests = isAdmin || isOwner;
  useRealtimePayments(); // Subscribe to real-time payment updates
  const [dayGuestSheetOpen, setDayGuestSheetOpen] = useState(false);
  const [emptyBedsSheetOpen, setEmptyBedsSheetOpen] = useState(false);
  const [settlementSheetOpen, setSettlementSheetOpen] = useState(false);
  const [pendingTenantsDefaultTab, setPendingTenantsDefaultTab] = useState<'overdue' | 'not-yet-due' | 'previous-month'>('overdue');
  const [calculatorSheetOpen, setCalculatorSheetOpen] = useState(false);
  const [rulesTemplateOpen, setRulesTemplateOpen] = useState(false);
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
  
  // Add Tenant workflow state
  const [addTenantRoomSelectOpen, setAddTenantRoomSelectOpen] = useState(false);

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
      setBillsBudgetGridOpen(false);
      setBillsBudgetOpen(false);
      setFinancialsOpen(false);
      setTenantsOpen(false);
      setToolsOpen(false);
      setAddTenantRoomSelectOpen(false);
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
    setActiveSheet("pending-tenants");
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

  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const slideWidth = container.offsetWidth;
    const index = Math.round(container.scrollLeft / slideWidth);
    setActiveSlide(index);
  };

  const stats: DashboardStats = {
    totalRooms: rooms.length,
    occupiedCount: fullyOccupiedRooms,
    vacantCount: vacantRooms,
    rentCollected,
    pendingRent,
  };

  const banners = [
    {
      id: "grow-your-pg",
      image: bannerGrowYourPg,
      action: () => onNavigateToTab?.("settings"),
      badge: "Scale Up",
      badgeColor: "bg-amber-600 dark:bg-amber-500",
      bgColor: "bg-[#1a094a]",
    },
    {
      id: "fill-every-bed",
      image: bannerFillEveryBed,
      action: () => setEmptyBedsSheetOpen(true),
      badge: `${totalEmptyBeds} Empty Bed${totalEmptyBeds === 1 ? "" : "s"}`,
      badgeColor: "bg-blue-600 dark:bg-blue-500",
    },
    {
      id: "receipts-instantly",
      image: bannerReceiptsInstantly,
      action: () => setActiveSheet("all-collected"),
      badge: "Payment History",
      badgeColor: "bg-teal-600 dark:bg-teal-500",
    },
    {
      id: "rent-on-time",
      image: bannerRentOnTime,
      action: () => openPendingTenants(),
      badge: `₹${stats.pendingRent.toLocaleString()} Pending`,
      badgeColor: "bg-rose-600 dark:bg-rose-500",
    },
    {
      id: "never-miss-rent",
      image: bannerNeverMissRent,
      action: onNavigateToRent,
      badge: "Reminders",
      badgeColor: "bg-indigo-600 dark:bg-indigo-500",
    },
    {
      id: "bills-budget",
      image: bannerBillsBudget,
      action: () => setBillsBudgetOpen(true),
      badge: "Utility Bills",
      badgeColor: "bg-emerald-600 dark:bg-emerald-500",
    },
    {
      id: "everything-one-place",
      image: bannerEverythingOnePlace,
      action: () => setTenantsOpen(true),
      badge: "PG Manager",
      badgeColor: "bg-purple-600 dark:bg-purple-500",
    }
  ];

  return (
    <>
      <div ref={dashboardRef} className="space-y-3">
        {/* Banner Carousel */}
        <div className="w-full relative">
          <div 
            ref={carouselRef}
            onScroll={handleScroll}
            className="flex w-full overflow-x-auto scrollbar-none snap-x snap-mandatory gap-3 pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {banners.map((banner) => (
              <div 
                key={banner.id}
                onClick={banner.action}
                className={cn(
                  "relative w-full shrink-0 snap-center rounded-2xl overflow-hidden aspect-[2/1] border border-border/40 shadow-sm active:scale-[0.99] transition-transform duration-100 cursor-pointer",
                  banner.bgColor || "bg-white"
                )}
              >
                <img 
                  src={banner.image} 
                  alt={banner.id}
                  className={cn(
                    "w-full h-full object-contain",
                    banner.bgColor || "bg-white"
                  )}
                />
                
                {/* Floating dynamic glassmorphism badge */}
                <div className={`absolute top-2 right-2 sm:top-3 sm:right-3 ${banner.badgeColor} text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md bg-opacity-95 flex items-center justify-center`}>
                  {banner.badge}
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-1.5 mt-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const container = carouselRef.current;
                  if (container) {
                    const slideWidth = container.offsetWidth;
                    container.scrollTo({
                      left: idx * (slideWidth + 12), // include gap-3 (12px)
                      behavior: 'smooth'
                    });
                    setActiveSlide(idx);
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  activeSlide === idx ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

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
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-4">
          <div 
            onClick={openPendingTenants}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-pending/10 p-2 rounded-full">
              <AlertTriangle className="w-5 h-5 text-pending" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-center leading-tight">Pending<br/>Tenants</span>
          </div>

          <div 
            onClick={() => setActiveSheet("expected-collection")}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-amber-500/10 p-2 rounded-full">
              <TrendingUp className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-center leading-tight">Expected<br/>Rent</span>
          </div>
          
          <div 
            onClick={() => setAddTenantRoomSelectOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-blue-500/10 p-2 rounded-full">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-center leading-tight">Add<br/>Tenant</span>
          </div>

          <div 
            onClick={() => setBillsBudgetOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-orange-500/10 p-2 rounded-full">
              <Receipt className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-center leading-tight">Record<br/>Expense</span>
          </div>

          <div 
            onClick={onNavigateToRent}
            className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all"
          >
            <div className="bg-emerald-500/10 p-2 rounded-full">
              <CreditCard className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium text-center leading-tight">Collect<br/>Rent</span>
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
        <SheetContent side="right" className="w-full max-w-full p-0 [&>button]:hidden bg-slate-50 dark:bg-slate-900">
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setActiveSheet(null)}><ArrowLeft className="h-5 w-5" /></Button>
                <SheetTitle className="text-base font-bold">Collected By</SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-3"><CollectedByCard onClose={() => setActiveSheet(null)} /></div>
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
      <PendingTenantsCard 
        ref={pendingTenantsRef} 
        rooms={rooms} 
        open={activeSheet === "pending-tenants"} 
        onClose={() => { setActiveSheet(null); setPendingTenantsDefaultTab('overdue'); }} 
        showSummaryCard={false} 
        defaultTab={pendingTenantsDefaultTab}
      />
      <ExpectedCollectionCard 
        open={activeSheet === "expected-collection"} 
        onClose={() => setActiveSheet(null)} 
        showSummaryCard={false} 
      />
      {activeSheet === "tenant-pricing" && (
        <TenantPricingOverviewCard defaultOpen={true} onClose={() => setActiveSheet(null)} showSummaryCard={false} />
      )}
      {activeSheet === "tenant-movement" && (
        <TenantMovementCard rooms={rooms} defaultOpen={true} onClose={() => setActiveSheet(null)} showSummaryCard={false} />
      )}

      {/* Tool Sheets */}
      {activeSheet === "calculator" && (
        <CalculatorCard defaultOpen={true} onExternalOpenChange={(open) => !open && setActiveSheet(null)} hideCard={true} />
      )}
      {activeSheet === "key-numbers" && (
        <KeyNumbersCard defaultOpen={true} onClose={() => setActiveSheet(null)} showSummaryCard={false} />
      )}
      {activeSheet === "pg-rules" && (
        <PGRulesCard defaultOpen={true} onClose={() => setActiveSheet(null)} onEditableTemplate={(rules, language) => { setActiveSheet(null); setRulesForTemplate(rules); setRulesLanguage(language); setRulesTemplateOpen(true); }} showSummaryCard={false} />
      )}
      {activeSheet === "bill-prices" && (
        <BillUnitPricesCard defaultOpen={true} onClose={() => setActiveSheet(null)} showSummaryCard={false} />
      )}

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

      {/* Rules Template Sheet */}
      <RulesTemplate open={rulesTemplateOpen} onOpenChange={setRulesTemplateOpen} rules={rulesForTemplate} language={rulesLanguage} />

      {canManageDayGuests && <DayGuestSheet open={dayGuestSheetOpen} onOpenChange={setDayGuestSheetOpen} />}
      <EmptyBedsSheet
        open={emptyBedsSheetOpen}
        onOpenChange={setEmptyBedsSheetOpen}
        roomStats={roomStats}
        totalEmptyBeds={totalEmptyBeds}
        totalPotentialRevenue={totalPotentialAdditionalRevenue}
      />
      <SettlementSummarySheet open={settlementSheetOpen} onOpenChange={setSettlementSheetOpen} rooms={rooms} />
      {/* Hidden calculator triggered by building icon */}
      <CalculatorCard externalOpen={calculatorSheetOpen} onExternalOpenChange={setCalculatorSheetOpen} hideCard />
      <Sheet open={financialsOpen} onOpenChange={setFinancialsOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Financials</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
            {[
              { key: "collected-by", icon: "/icons/avatar-3d.png", label: "Collected By" },
              { key: "total-collected", icon: "/icons/total-collected-update.png", label: "Total Collected" },
              { key: "security-deposit", icon: "/icons/safe-box-3d.png", label: "Security Deposit" },
              { key: "overdue-overview", icon: "/icons/overdue.jpg", label: "Overdue Overview" },
              { key: "day-guest", icon: "/icons/bed-3d.png", label: "Day Guests" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full"
                onClick={() => {
                  setFinancialsOpen(false);
                  setTimeout(() => {
                    if (item.key === "day-guest") {
                      setDayGuestSheetOpen(true);
                    } else if (item.key === "overdue-overview") {
                      setPendingTenantsDefaultTab('previous-month');
                      setActiveSheet('pending-tenants');
                    } else {
                      setActiveSheet(item.key);
                    }
                  }, 300);
                }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={tenantsOpen} onOpenChange={setTenantsOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Tenants</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
            {[
              { key: "pending-tenants", icon: "/icons/pending-updte.jpg", label: "Pending" },
              { key: "expected-collection", icon: "/icons/expected-updte.png", label: "Expected" },
              { key: "tenant-pricing", icon: "/icons/tenant-pricing-3d.jpg", label: "Pricing" },
              { key: "tenant-movement", icon: "/icons/movemnet-update.png", label: "Movement" },
              { key: "settlement", icon: "/icons/settlement-final.jpg", label: "Settlement" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full"
                onClick={() => { setTenantsOpen(false); setTimeout(() => item.key === "settlement" ? setSettlementSheetOpen(true) : item.key === "pending-tenants" ? openPendingTenants() : setActiveSheet(item.key), 300); }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Tools & Admin</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
            {[
              { key: "calculator", icon: "/icons/calculator-3d.jpg", label: "Calculator" },
              { key: "key-numbers", icon: "/icons/key-numbers-3d.png", label: "Key Numbers" },
              { key: "pg-rules", icon: "/icons/pg-rules-3d.png", label: "PG Rules" },
              { key: "bill-prices", icon: "/icons/electricity-bill-update.png", label: "Bill Prices" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full"
                onClick={() => { setToolsOpen(false); setTimeout(() => setActiveSheet(item.key), 300); }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={billsBudgetGridOpen} onOpenChange={setBillsBudgetGridOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Bills & Budget</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
            {[
              { key: "building-rent", icon: "/icons/rent-update.png", label: "Building Rent" },
              { key: "bills-budget", icon: "/icons/budget-update.png", label: "Overview" },
            ].map((item) => (
              <div
                key={item.key}
                className="cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full"
                onClick={() => { setBillsBudgetGridOpen(false); setTimeout(() => item.key === "building-rent" ? setActiveSheet("building-rent") : setBillsBudgetOpen(true), 300); }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                </div>
                <span className="text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]">{item.label}</span>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Tenant Flow Sheets */}
      <Sheet open={addTenantRoomSelectOpen} onOpenChange={setAddTenantRoomSelectOpen}>
        <SheetContent side="bottom" className="h-[75vh] px-4 pt-6 pb-0 rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left">Select Room for Tenant</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pb-8 h-[calc(100%-4rem)]">
            <div className="grid grid-cols-3 gap-3">
              {(rooms || []).filter(room => {
                const activeTenantsCount = (room.tenants || []).filter(t => t && isTenantActiveNow(t.startDate, t.endDate)).length;
                return room.capacity - activeTenantsCount > 0;
              }).map(room => {
                const activeTenantsCount = (room.tenants || []).filter(t => t && isTenantActiveNow(t.startDate, t.endDate)).length;
                const available = room.capacity - activeTenantsCount;
                return (
                  <div 
                    key={room.id}
                    onClick={() => {
                      setAddTenantRoomSelectOpen(false);
                      onQuickAddTenant(room);
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-card shadow-sm hover:bg-accent/50 cursor-pointer transition-all active:scale-95"
                  >
                    <h4 className="font-bold text-lg">{room.roomNo}</h4>
                    <div className="flex items-center gap-1 mt-1 bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                      <span className="text-xs font-semibold">{available} bed{available > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {(rooms || []).filter(room => {
              if (!room) return false;
              const activeTenantsCount = (room.tenants || []).filter(t => t && isTenantActiveNow(t.startDate, t.endDate)).length;
              return room.capacity - activeTenantsCount > 0;
            }).length === 0 && (
              <div className="text-center p-8 text-muted-foreground">
                <p>No rooms with available beds.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
