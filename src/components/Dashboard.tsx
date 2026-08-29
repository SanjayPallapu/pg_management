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
  Wallet,
  Users,
  Settings,
  ChevronRight,
  Zap,
  IndianRupee,
  Tag,
  ArrowRightLeft,
  ShieldCheck,
  DoorOpen,
  CircleCheckBig,
  Gift,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useIsMobile } from "@/hooks/use-mobile";
import { Room, DashboardStats } from "@/types";
import { useTotalCollected } from "@/hooks/useTotalCollected";
import { useMonthContext } from "@/contexts/MonthContext";
import { usePG } from "@/contexts/PGContext";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useRent } from "@/contexts/RentContext";
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
import { PaidTenantsCard } from "./PaidTenantsCard";
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
import { ExpectedCollectionCard } from "./ExpectedCollectionCard";
import { TenantPricingOverviewCard } from "./TenantPricingOverviewCard";
import { isTenantActiveInMonth, isTenantActiveNow, hasTenantLeftNow, isTenantUpcoming } from "@/utils/dateOnly";
import { useBackGesture } from "@/hooks/useBackGesture";
import { ReferralDialog } from "./subscription/ReferralDialog";

import bannerFillEveryBed from "@/assets/banner-fill-every-bed.png";
import bannerRentOnTime from "@/assets/banner-rent-on-time.png";
import bannerNeverMissRent from "@/assets/banner-never-miss-rent.png";
import bannerGrowYourPg from "@/assets/banner-grow-your-pg.jpg";
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
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);

  useBackGesture(billsBudgetOpen, () => setBillsBudgetOpen(false));
  
  // Add Tenant workflow state
  const [addTenantRoomSelectOpen, setAddTenantRoomSelectOpen] = useState(false);

  // Active sheet state for Swiggy-style icon grid
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  // Key to force remount TenantMovementCard each time it's opened
  const [movementKey, setMovementKey] = useState(0);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close all sheets/dialogs when URL changes or tab-click is triggered (handles same tab click reset)
  useEffect(() => {
    const handleCloseAll = () => {
      setDayGuestSheetOpen(false);
      setEmptyBedsSheetOpen(false);
      setSettlementSheetOpen(false);
      setRulesTemplateOpen(false);
      setBillsBudgetGridOpen(false);
      setBillsBudgetOpen(false);
      setFinancialsOpen(false);
      setTenantsOpen(false);
      setToolsOpen(false);
      setAddTenantRoomSelectOpen(false);
      setReferralDialogOpen(false);
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

  const { getTotalCollected, getTotalPending } = useRent();
  const rentCollected = getTotalCollected();
  const pendingRent = getTotalPending();

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
        const entries = (g.payment_entries as unknown as Array<{ mode?: string; amount?: number }>) || [];
        entries.forEach((entry) => {
          if (entry.mode === "upi") {
            upi += entry.amount || 0;
          } else if (entry.mode === "cash") {
            cash += entry.amount || 0;
          }
        });
      });

      const guests = data.map((g: {
        guest_name: string;
        rooms?: { room_no?: string } | null;
        from_date: string;
        to_date: string;
        total_amount: number;
        amount_paid?: number | null;
        payment_status: string;
        payment_entries?: unknown;
      }) => ({
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
    const perBedRent = Math.round(room.rentAmount / Math.max(1, room.capacity));
    const potentialAdditionalRent = emptyBeds * perBedRent;

    const reservedTenants = isCurrentMonth
      ? room.tenants.filter((t) => isTenantUpcoming(t.startDate, t.endDate))
      : [];

    return {
      roomNo: room.roomNo,
      capacity: room.capacity,
      occupied,
      emptyBeds,
      reservedBeds: reservedTenants.length,
      upcomingTenants: reservedTenants.map((t) => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        startDate: t.startDate,
        deposit: t.securityDepositAmount || 0,
        rent: t.monthlyRent,
      })),
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

  // Max monthly revenue if all beds are filled at each room's configured price.
  const maxMonthlyRevenue = rooms.reduce((sum, room) => sum + room.rentAmount, 0);

  // Use shared hook for total collected
  const { totalCollected: totalCollectedForExpenses } = useTotalCollected(rooms);

  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const bannerAutoPausedRef = useRef(false);
  const bannerResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseBannerAutoAdvance = () => {
    bannerAutoPausedRef.current = true;
    if (bannerResumeTimerRef.current) clearTimeout(bannerResumeTimerRef.current);
    bannerResumeTimerRef.current = setTimeout(() => {
      bannerAutoPausedRef.current = false;
    }, 8000);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const firstChild = container.firstElementChild as HTMLElement | null;
    const itemWidth = firstChild ? firstChild.offsetWidth + 8 : container.offsetWidth;
    const index = Math.round(container.scrollLeft / itemWidth);
    setActiveSlide(Math.min(index, banners.length - 1));
  };

  const scrollCarousel = (direction: 'next' | 'prev') => {
    pauseBannerAutoAdvance();
    const container = carouselRef.current;
    if (!container) return;
    const firstChild = container.firstElementChild as HTMLElement | null;
    const itemWidth = firstChild ? firstChild.offsetWidth + 8 : container.offsetWidth;
    const maxScroll = container.scrollWidth - container.clientWidth;
    let targetScroll = direction === 'next' ? container.scrollLeft + itemWidth : container.scrollLeft - itemWidth;
    if (targetScroll > maxScroll + 10) targetScroll = 0;
    if (targetScroll < 0) targetScroll = maxScroll;
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
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
      action: () => onNavigateToRent?.(),
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
      action: undefined,
      badge: "PG HUB",
      badgeColor: "bg-purple-600 dark:bg-purple-500",
    }
  ];

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (bannerAutoPausedRef.current || document.visibilityState !== "visible") return;
      const container = carouselRef.current;
      if (!container) return;
      const firstChild = container.firstElementChild as HTMLElement | null;
      const itemWidth = firstChild ? firstChild.offsetWidth + 8 : container.offsetWidth;
      const maxScroll = container.scrollWidth - container.clientWidth;
      let targetScroll = container.scrollLeft + itemWidth;
      if (targetScroll > maxScroll + 10) targetScroll = 0;
      container.scrollTo({ left: targetScroll, behavior: "smooth" });
    }, 3500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => {
    if (bannerResumeTimerRef.current) clearTimeout(bannerResumeTimerRef.current);
  }, []);

  return (
    <>
      <div ref={dashboardRef} className="w-full flex flex-col gap-4 md:gap-6">
        {/* Banner Carousel — Responsive Multi-Card Display: 1 on Mobile, 2 on Tablet, 3 on Laptop, 4 on XL */}
        <div className="group relative order-1 w-full">
          {/* Left / Right Chevron Controls for Desktop */}
          <button
            type="button"
            onClick={() => scrollCarousel('prev')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-background/85 border border-border/70 text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-background hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
            aria-label="Previous banner"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollCarousel('next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-background/85 border border-border/70 text-foreground shadow-md backdrop-blur-sm transition-all hover:bg-background hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
            aria-label="Next banner"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div 
            ref={carouselRef}
            onScroll={handleScroll}
            onPointerDown={pauseBannerAutoAdvance}
            onWheel={pauseBannerAutoAdvance}
            className="flex w-full overflow-x-auto scrollbar-none snap-x snap-mandatory gap-2 md:gap-3 pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {banners.map((banner) => (
              <div 
                key={banner.id}
                onClick={banner.action}
                className={`relative w-full sm:w-[calc(50%-0.375rem)] md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.55rem)] xl:w-[calc(25%-0.6rem)] shrink-0 snap-start rounded-2xl overflow-hidden aspect-[16/9] shadow-sm hover:shadow-md transition-all duration-200 bg-slate-50 dark:bg-slate-900/40 flex justify-center items-center ${banner.action ? 'cursor-pointer active:scale-[0.99]' : ''}`}
              >
                <img 
                  src={banner.image} 
                  alt={banner.id}
                  className="w-full h-full object-cover"
                />
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
                  pauseBannerAutoAdvance();
                  const container = carouselRef.current;
                  if (container) {
                    const firstChild = container.firstElementChild as HTMLElement | null;
                    const itemWidth = firstChild ? firstChild.offsetWidth + 8 : container.offsetWidth;
                    container.scrollTo({
                      left: idx * itemWidth,
                      behavior: 'smooth'
                    });
                    setActiveSlide(idx);
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            Quick Actions — 5 cols on mobile, 10 cols on Desktop/Tablet
           ═══════════════════════════════════════════════ */}
        <div className="order-2 grid grid-cols-5 md:grid-cols-5 lg:grid-cols-10 gap-1.5 sm:gap-2.5 lg:gap-3">
          <div onClick={() => setAddTenantRoomSelectOpen(true)} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-blue-500/10 p-2 sm:p-2.5 rounded-full"><UserPlus className="w-5 h-5 text-blue-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Add<br/>Tenant</span>
          </div>

          <div onClick={() => setActiveSheet("expected-collection")} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-amber-500/10 p-2 sm:p-2.5 rounded-full"><TrendingUp className="w-5 h-5 text-amber-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Expected<br/>Rent</span>
          </div>

          <div onClick={openPendingTenants} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-pending/10 p-2 sm:p-2.5 rounded-full"><AlertTriangle className="w-5 h-5 text-pending" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Pending<br/>Tenants</span>
          </div>

          <div onClick={() => setActiveSheet("security-deposit")} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-indigo-500/10 p-2 sm:p-2.5 rounded-full"><ShieldCheck className="w-5 h-5 text-indigo-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Security<br/>Deposit</span>
          </div>

          <div onClick={() => setDayGuestSheetOpen(true)} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-teal-500/10 p-2 sm:p-2.5 rounded-full"><CalendarDays className="w-5 h-5 text-teal-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Day<br/>Guest</span>
          </div>

          <div onClick={() => setActiveSheet("tenant-pricing")} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-cyan-500/10 p-2 sm:p-2.5 rounded-full"><Tag className="w-5 h-5 text-cyan-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Room<br/>Pricing</span>
          </div>

          <div onClick={() => navigate('/?tab=rent-sheet&openAc=true')} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-amber-500/10 p-2 sm:p-2.5 rounded-full"><Zap className="w-5 h-5 text-amber-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">AC<br/>Bill</span>
          </div>

          <div onClick={() => { setMovementKey(k => k + 1); setActiveSheet("tenant-movement"); }} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-purple-500/10 p-2 sm:p-2.5 rounded-full"><DoorOpen className="w-5 h-5 text-purple-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">In/Out</span>
          </div>

          <div onClick={() => setBillsBudgetOpen(true)} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-orange-500/10 p-2 sm:p-2.5 rounded-full"><Receipt className="w-5 h-5 text-orange-500" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Record<br/>Expense</span>
          </div>

          <div data-testid="paid-tenants-action" onClick={() => setActiveSheet("paid-tenants")} className="flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 hover:border-primary/30 active:scale-95 transition-all">
            <div className="bg-emerald-500/10 p-2 sm:p-2.5 rounded-full"><CircleCheckBig className="w-5 h-5 text-emerald-600" /></div>
            <span className="text-[9px] sm:text-xs font-medium text-center leading-tight">Paid<br/>Tenants</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            KPI & Stats Section — Multi-column Grid on Tablets/Desktop
           ═══════════════════════════════════════════════ */}
        <div className="order-3 grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {/* Capacity & Occupancy Split Card */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Left: Capacity */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Capacity</span>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {totalOccupied}/{totalCapacity}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stats.totalRooms} rooms total</p>
                </div>
                {/* Right: Occupancy */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Occupancy</span>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold">{stats.occupiedCount} rooms</div>
                  <p className="text-xs text-muted-foreground mt-1">{occupancyPercent.toFixed(1)}% occupied</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rent Collected & Pending Split Card */}
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Left: Collected */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Collected</span>
                    <CreditCard className="h-4 w-4 text-paid" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-paid">₹{stats.rentCollected.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </div>
                {/* Right: Pending */}
                <div className="p-4 sm:p-5 cursor-pointer hover:bg-accent/50 transition-colors rounded-r-lg" onClick={openPendingTenants}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Pending</span>
                    <AlertTriangle className="h-4 w-4 text-pending" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-pending">₹{stats.pendingRent.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Tap to collect</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Potential Revenue Card */}
          <Card
            className="cursor-pointer border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent transition-all hover:shadow-md col-span-1 md:col-span-2 xl:col-span-1"
            onClick={() => setEmptyBedsSheetOpen(true)}
          >
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Full Capacity Potential</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">{totalEmptyBeds} empty beds</span>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-paid">₹{currentMonthlyRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">{totalOccupied} tenants now</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-bold text-primary">₹{maxMonthlyRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Max monthly revenue</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <div className="text-sm font-semibold text-pending">+₹{Math.round(maxMonthlyRevenue - currentMonthlyRevenue).toLocaleString()} possible</div>
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  View breakdown <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Active Card Sheets – opened by Swiggy icon clicks
         ═══════════════════════════════════════════════ */}
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
      <PaidTenantsCard
        rooms={rooms}
        open={activeSheet === "paid-tenants"}
        onClose={() => setActiveSheet(null)}
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
        <TenantMovementCard key={movementKey} rooms={rooms} defaultOpen={true} onClose={() => setActiveSheet(null)} showSummaryCard={false} />
      )}

      {/* Tool Sheets */}
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
        <SheetContent
          side="right"
          className={
            isMobile
              ? "w-full max-w-full p-0 sm:max-w-full [&>button]:hidden [&>div:last-child]:overflow-hidden [&>div:last-child]:px-0 [&>div:last-child]:pb-0"
              : "w-full p-0 sm:max-w-xl [&>div:last-child]:overflow-hidden [&>div:last-child]:px-0 [&>div:last-child]:pb-0"
          }
        >
          <div className="flex h-full flex-col bg-[#f8f9fd] dark:bg-background">
            <div className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain">
              <BillsBudgetDashboard rooms={rooms} onClose={() => setBillsBudgetOpen(false)} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ReferralDialog open={referralDialogOpen} onOpenChange={setReferralDialogOpen} />

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
      <Sheet open={financialsOpen} onOpenChange={setFinancialsOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-left">Financials</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
            {[
              
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
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
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
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
            {[
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
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center">
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
        <SheetContent side="bottom" className="h-full w-full px-0 pt-0 pb-0 rounded-none border-none overflow-hidden flex flex-col [&>button]:hidden animate-in duration-300">
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAddTenantRoomSelectOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <SheetTitle className="text-left font-bold text-base">Select Room for Tenant</SheetTitle>
                </div>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
              <div className="grid grid-cols-4 gap-2.5">
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
                      className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-border bg-card shadow-xs hover:bg-accent/50 cursor-pointer transition-all active:scale-95 text-center"
                    >
                      <h4 className="font-bold text-base text-foreground">{room.roomNo}</h4>
                      <div className="flex items-center justify-center gap-1 mt-1 bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded-full">
                        <span className="text-[10px] font-semibold">{available} bed{available > 1 ? 's' : ''}</span>
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
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
