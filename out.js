import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { gsap } from "gsap";
import {
  Building,
  CreditCard,
  AlertTriangle,
  UserCheck,
  UserPlus,
  TrendingUp,
  ArrowLeft,
  Receipt,
  Scale,
  Wallet,
  Users,
  Settings,
  ChevronRight,
  Zap,
  Tag,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { TenantMovementCard } from "./TenantMovementCard";
import { TotalCollectedCard } from "./TotalCollectedCard";
import { AllCollectedCard } from "./AllCollectedCard";
import { PendingTenantsCard } from "./PendingTenantsCard";
import { CalculatorCard } from "./CalculatorCard";
import { KeyNumbersCard } from "./KeyNumbersCard";
import { BuildingRentCard } from "./BuildingRentCard";
import { PGRulesCard } from "./PGRulesCard";
import { BillUnitPricesCard } from "./BillUnitPricesCard";
import { RulesTemplate } from "./RulesTemplate";
import { SettlementSummarySheet } from "./SettlementSummarySheet";
import { BillsBudgetDashboard } from "./BillsBudgetDashboard";
import { CollectedByCard } from "./CollectedByCard";
import { ExpectedCollectionCard } from "./ExpectedCollectionCard";
import { TenantPricingOverviewCard } from "./TenantPricingOverviewCard";
import { isTenantActiveInMonth, isTenantActiveNow } from "@/utils/dateOnly";
import { getPricePerBed } from "@/constants/pricing";
import bannerFillEveryBed from "@/assets/banner-fill-every-bed.png";
import bannerRentOnTime from "@/assets/banner-rent-on-time.png";
import bannerNeverMissRent from "@/assets/banner-never-miss-rent.png";
import bannerGrowYourPg from "@/assets/banner-grow-your-pg.jpg";
import bannerBillsBudget from "@/assets/banner-bills-budget.png";
import bannerEverythingOnePlace from "@/assets/banner-everything-one-place.png";
import bannerReceiptsInstantly from "@/assets/banner-receipts-instantly.png";
export const Dashboard = ({ rooms, onStartRentCycle, onQuickAddTenant, onNavigateToRent, onNavigateToTab }) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const { payments } = useTenantPayments();
  const { isAdmin, isOwner } = useAuth();
  const canManageDayGuests = isAdmin || isOwner;
  useRealtimePayments();
  const [dayGuestSheetOpen, setDayGuestSheetOpen] = useState(false);
  const [emptyBedsSheetOpen, setEmptyBedsSheetOpen] = useState(false);
  const [settlementSheetOpen, setSettlementSheetOpen] = useState(false);
  const [pendingTenantsDefaultTab, setPendingTenantsDefaultTab] = useState("overdue");
  const [calculatorSheetOpen, setCalculatorSheetOpen] = useState(false);
  const [rulesTemplateOpen, setRulesTemplateOpen] = useState(false);
  const [rulesForTemplate, setRulesForTemplate] = useState([]);
  const [rulesLanguage, setRulesLanguage] = useState("en");
  const pendingTenantsRef = useRef(null);
  const isMobile = useIsMobile();
  const [financialsOpen, setFinancialsOpen] = useState(false);
  const [tenantsOpen, setTenantsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [billsBudgetGridOpen, setBillsBudgetGridOpen] = useState(false);
  const [billsBudgetOpen, setBillsBudgetOpen] = useState(false);
  const [addTenantRoomSelectOpen, setAddTenantRoomSelectOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const dashboardRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
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
    window.addEventListener("tab-click", handleCloseAll);
    return () => window.removeEventListener("tab-click", handleCloseAll);
  }, [location.search]);
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    payments
  });
  const { data: dayGuestStats, isLoading: dayGuestStatsLoading } = useQuery({
    queryKey: ["day-guest-revenue", selectedMonth, selectedYear, currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0, guests: [] };
      const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1);
      const endOfMonth = new Date(selectedYear, selectedMonth, 0);
      const pad = (n) => String(n).padStart(2, "0");
      const toLocalISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const startStr = toLocalISO(startOfMonth);
      const endStr = toLocalISO(endOfMonth);
      const { data, error } = await supabase.from("day_guests").select("guest_name, from_date, to_date, total_amount, payment_status, amount_paid, payment_entries, rooms!inner(pg_id, room_no)").eq("rooms.pg_id", currentPG.id).lte("from_date", endStr).gte("to_date", startStr).order("from_date", { ascending: false });
      if (error) {
        console.error("Error fetching day guest stats:", error);
        return { collected: 0, pending: 0, count: 0, upi: 0, cash: 0, guests: [] };
      }
      const collected = data.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
      const pending = data.reduce((sum, g) => sum + (g.total_amount - (g.amount_paid || 0)), 0);
      let upi = 0;
      let cash = 0;
      data.forEach((g) => {
        const entries = g.payment_entries || [];
        entries.forEach((entry) => {
          if (entry.mode === "upi") {
            upi += entry.amount || 0;
          } else if (entry.mode === "cash") {
            cash += entry.amount || 0;
          }
        });
      });
      const guests = data.map((g) => ({
        name: g.guest_name,
        roomNo: g.rooms?.room_no || "",
        fromDate: g.from_date,
        toDate: g.to_date,
        total: g.total_amount,
        paid: g.amount_paid || 0,
        balance: g.total_amount - (g.amount_paid || 0),
        status: g.payment_status
      }));
      return { collected, pending, count: data.length, upi, cash, guests };
    },
    enabled: !!currentPG?.id,
    staleTime: 5 * 60 * 1e3,
    gcTime: 15 * 60 * 1e3,
    placeholderData: (prev) => prev,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  const today = /* @__PURE__ */ new Date();
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
      isEmpty: occupied === 0
    };
  });
  const totalOccupied = roomStats.reduce((sum, r) => sum + r.occupied, 0);
  const totalEmptyBeds = roomStats.reduce((sum, r) => sum + r.emptyBeds, 0);
  const totalPotentialAdditionalRevenue = roomStats.reduce((sum, r) => sum + r.potentialAdditionalRent, 0);
  const fullyOccupiedRooms = roomStats.filter((r) => r.isFull).length;
  const vacantRooms = roomStats.filter((r) => r.isEmpty).length;
  const occupancyPercent = totalCapacity > 0 ? totalOccupied / totalCapacity * 100 : 0;
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
  const maxMonthlyRevenue = rooms.reduce((sum, room) => sum + room.capacity * getPricePerBed(room.capacity), 0);
  const { totalCollected: totalCollectedForExpenses } = useTotalCollected(rooms);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef(null);
  const handleScroll = (e) => {
    const container = e.currentTarget;
    const slideWidth = container.offsetWidth;
    const index = Math.round(container.scrollLeft / (slideWidth + 8));
    setActiveSlide(index);
  };
  const stats = {
    totalRooms: rooms.length,
    occupiedCount: fullyOccupiedRooms,
    vacantCount: vacantRooms,
    rentCollected,
    pendingRent
  };
  const banners = [
    {
      id: "grow-your-pg",
      image: bannerGrowYourPg,
      action: () => onNavigateToTab?.("settings"),
      badge: "Scale Up",
      badgeColor: "bg-amber-600 dark:bg-amber-500",
      bgColor: "bg-[#1a094a]"
    },
    {
      id: "fill-every-bed",
      image: bannerFillEveryBed,
      action: () => setEmptyBedsSheetOpen(true),
      badge: `${totalEmptyBeds} Empty Bed${totalEmptyBeds === 1 ? "" : "s"}`,
      badgeColor: "bg-blue-600 dark:bg-blue-500"
    },
    {
      id: "receipts-instantly",
      image: bannerReceiptsInstantly,
      action: () => setActiveSheet("all-collected"),
      badge: "Payment History",
      badgeColor: "bg-teal-600 dark:bg-teal-500"
    },
    {
      id: "rent-on-time",
      image: bannerRentOnTime,
      action: () => openPendingTenants(),
      badge: `\u20B9${stats.pendingRent.toLocaleString()} Pending`,
      badgeColor: "bg-rose-600 dark:bg-rose-500"
    },
    {
      id: "never-miss-rent",
      image: bannerNeverMissRent,
      action: onNavigateToRent,
      badge: "Reminders",
      badgeColor: "bg-indigo-600 dark:bg-indigo-500"
    },
    {
      id: "bills-budget",
      image: bannerBillsBudget,
      action: () => setBillsBudgetOpen(true),
      badge: "Utility Bills",
      badgeColor: "bg-emerald-600 dark:bg-emerald-500"
    },
    {
      id: "everything-one-place",
      image: bannerEverythingOnePlace,
      action: () => setTenantsOpen(true),
      badge: "PG Manager",
      badgeColor: "bg-purple-600 dark:bg-purple-500"
    }
  ];
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { ref: dashboardRef, className: "space-y-4 md:space-y-6 max-w-[1200px] mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "w-full relative group" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: carouselRef,
      onScroll: handleScroll,
      className: "flex w-full overflow-x-auto scrollbar-none snap-x snap-mandatory gap-2 pb-2",
      style: { scrollbarWidth: "none", msOverflowStyle: "none" }
    },
    banners.map((banner) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: banner.id,
        onClick: banner.action,
        className: "relative w-full shrink-0 snap-center rounded-2xl overflow-hidden aspect-[16/9] shadow-sm hover:shadow-md active:scale-[0.99] transition-all duration-200 cursor-pointer bg-transparent"
      },
      /* @__PURE__ */ React.createElement(
        "img",
        {
          src: banner.image,
          alt: banner.id,
          className: "w-full h-full object-contain bg-transparent transition-transform duration-500 hover:scale-[1.02]"
        }
      ),
      /* @__PURE__ */ React.createElement("div", { className: `absolute top-2 right-2 sm:top-3 sm:right-3 ${banner.badgeColor} text-white font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md bg-opacity-95 flex items-center justify-center transition-transform hover:scale-105` }, banner.badge)
    ))
  ), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center gap-1.5 mt-1" }, banners.map((_, idx) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: idx,
      type: "button",
      onClick: () => {
        const container = carouselRef.current;
        if (container) {
          const slideWidth = container.offsetWidth;
          container.scrollTo({
            left: idx * (slideWidth + 8),
            behavior: "smooth"
          });
          setActiveSlide(idx);
        }
      },
      className: `h-1.5 rounded-full transition-all duration-300 ${activeSlide === idx ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"}`,
      "aria-label": `Go to slide ${idx + 1}`
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-2 md:grid-cols-2" }, /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(CardContent, { className: "p-0" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 divide-x divide-border" }, /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-muted-foreground" }, "Capacity"), /* @__PURE__ */ React.createElement(
    Building,
    {
      className: "h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary transition-colors",
      onClick: () => setCalculatorSheetOpen(true)
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold" }, totalOccupied, "/", totalCapacity), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, stats.totalRooms, " rooms across 3 floors")), /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-muted-foreground" }, "Occupancy"), /* @__PURE__ */ React.createElement(UserCheck, { className: "h-4 w-4 text-muted-foreground" })), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold" }, stats.occupiedCount, " rooms"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, occupancyPercent.toFixed(1), "% total occupancy"))))), /* @__PURE__ */ React.createElement(Card, null, /* @__PURE__ */ React.createElement(CardContent, { className: "p-0" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 divide-x divide-border" }, /* @__PURE__ */ React.createElement("div", { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-muted-foreground" }, "Collected"), /* @__PURE__ */ React.createElement(CreditCard, { className: "h-4 w-4 text-paid" })), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-paid" }, "\u20B9", stats.rentCollected.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, "This month")), /* @__PURE__ */ React.createElement("div", { className: "p-4 cursor-pointer hover:bg-accent/50 transition-colors rounded-r-lg", onClick: openPendingTenants }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-muted-foreground" }, "Pending"), /* @__PURE__ */ React.createElement(AlertTriangle, { className: "h-4 w-4 text-pending" })), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-pending" }, "\u20B9", stats.pendingRent.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, "Needs collection")))))), /* @__PURE__ */ React.createElement(
    Card,
    {
      className: "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 cursor-pointer transition-all hover:shadow-md",
      onClick: () => setEmptyBedsSheetOpen(true)
    },
    /* @__PURE__ */ React.createElement(CardContent, { className: "p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(TrendingUp, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-muted-foreground" }, "If PG Gets Full"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-lg font-bold text-paid" }, "\u20B9", currentMonthlyRevenue.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, totalOccupied, " tenants now")), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("div", { className: "text-lg font-bold text-primary" }, "\u20B9", maxMonthlyRevenue.toLocaleString()), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground" }, "Max capacity"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between pt-2 border-t" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-pending" }, "+\u20B9", Math.round(maxMonthlyRevenue - currentMonthlyRevenue).toLocaleString(), " possible"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-muted-foreground" }, totalEmptyBeds, " beds empty")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground mt-2 text-center" }, "Tap to view breakdown"))
  ), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 gap-1.5 sm:gap-2 mb-4" }, /* @__PURE__ */ React.createElement("div", { onClick: () => setAddTenantRoomSelectOpen(true), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(UserPlus, { className: "w-5 h-5 text-blue-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "Add", /* @__PURE__ */ React.createElement("br", null), "Tenant")), /* @__PURE__ */ React.createElement("div", { onClick: () => setActiveSheet("expected-collection"), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(TrendingUp, { className: "w-5 h-5 text-amber-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "Expected", /* @__PURE__ */ React.createElement("br", null), "Rent")), /* @__PURE__ */ React.createElement("div", { onClick: () => setActiveSheet("total-collected"), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-emerald-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Wallet, { className: "w-5 h-5 text-emerald-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "Total", /* @__PURE__ */ React.createElement("br", null), "Collected")), /* @__PURE__ */ React.createElement("div", { onClick: openPendingTenants, className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-pending/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "w-5 h-5 text-pending" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "Pending", /* @__PURE__ */ React.createElement("br", null), "Tenants")), /* @__PURE__ */ React.createElement("div", { onClick: () => setActiveSheet("security-deposit"), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(ShieldCheck, { className: "w-5 h-5 text-indigo-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "Security", /* @__PURE__ */ React.createElement("br", null), "Deposit")), /* @__PURE__ */ React.createElement("div", { onClick: () => setActiveSheet("tenant-pricing"), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-cyan-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Tag, { className: "w-5 h-5 text-cyan-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "Room", /* @__PURE__ */ React.createElement("br", null), "Pricing")), /* @__PURE__ */ React.createElement("div", { onClick: () => navigate("/?tab=rent-sheet&openAc=true"), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-amber-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Zap, { className: "w-5 h-5 text-amber-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "AC", /* @__PURE__ */ React.createElement("br", null), "Bill")), /* @__PURE__ */ React.createElement("div", { onClick: () => setActiveSheet("in-out"), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-purple-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(DoorOpen, { className: "w-5 h-5 text-purple-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "In/Out")), /* @__PURE__ */ React.createElement("div", { onClick: () => setBillsBudgetOpen(true), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-orange-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Receipt, { className: "w-5 h-5 text-orange-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "Record", /* @__PURE__ */ React.createElement("br", null), "Expense")), /* @__PURE__ */ React.createElement("div", { onClick: () => setPGCalcOpen(true), className: "flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-95 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "bg-slate-500/10 p-2 rounded-full" }, /* @__PURE__ */ React.createElement(Calculator, { className: "w-5 h-5 text-slate-500" })), /* @__PURE__ */ React.createElement("span", { className: "text-[9px] sm:text-[10px] font-medium text-center leading-tight" }, "PG", /* @__PURE__ */ React.createElement("br", null), "Calc"))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setBillsBudgetGridOpen(true),
      className: "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-slate-100 dark:bg-slate-800 p-3 rounded-xl" }, /* @__PURE__ */ React.createElement(Scale, { className: "w-6 h-6 text-slate-600 dark:text-slate-400" })),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-base" }, "Bills & Budget"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground mt-0.5" }, "Manage room utility bills & budgets")),
    /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-5 h-5 text-muted-foreground/50" })
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setFinancialsOpen(true),
      className: "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-slate-100 dark:bg-slate-800 p-3 rounded-xl" }, /* @__PURE__ */ React.createElement(Wallet, { className: "w-6 h-6 text-slate-600 dark:text-slate-400" })),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-base" }, "Financials"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground mt-0.5" }, "Payments, deposits, building rent")),
    /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-5 h-5 text-muted-foreground/50" })
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setTenantsOpen(true),
      className: "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-slate-100 dark:bg-slate-800 p-3 rounded-xl" }, /* @__PURE__ */ React.createElement(Users, { className: "w-6 h-6 text-slate-600 dark:text-slate-400" })),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-base" }, "Tenants"), stats.pendingRent > 0 && /* @__PURE__ */ React.createElement("span", { className: "bg-pending/10 text-pending text-[10px] font-bold px-2 py-0.5 rounded-full" }, "Pending")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground mt-0.5" }, "Pending, pricing and movement")),
    /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-5 h-5 text-muted-foreground/50" })
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      onClick: () => setToolsOpen(true),
      className: "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all"
    },
    /* @__PURE__ */ React.createElement("div", { className: "bg-slate-100 dark:bg-slate-800 p-3 rounded-xl" }, /* @__PURE__ */ React.createElement(Settings, { className: "w-6 h-6 text-slate-600 dark:text-slate-400" })),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-base" }, "Tools & Admin"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-muted-foreground mt-0.5" }, "App settings, calculators & rules")),
    /* @__PURE__ */ React.createElement(ChevronRight, { className: "w-5 h-5 text-muted-foreground/50" })
  ))), /* @__PURE__ */ React.createElement(Sheet, { open: activeSheet === "collected-by", onOpenChange: (o) => !o && setActiveSheet(null) }, /* @__PURE__ */ React.createElement(SheetContent, { side: "right", className: "w-full max-w-full p-0 [&>button]:hidden bg-slate-50 dark:bg-slate-900" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-slate-50 dark:bg-slate-900" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "px-4 pt-4 pb-2 border-b bg-background shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0", onClick: () => setActiveSheet(null) }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })), /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-base font-bold" }, "Collected By"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-1.5 py-4 space-y-3" }, /* @__PURE__ */ React.createElement(CollectedByCard, { onClose: () => setActiveSheet(null) }))))), /* @__PURE__ */ React.createElement(Sheet, { open: activeSheet === "payment-mode", onOpenChange: (o) => !o && setActiveSheet(null) }, /* @__PURE__ */ React.createElement(SheetContent, { side: "right", className: isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "px-4 pt-4 pb-2 border-b bg-background shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0", onClick: () => setActiveSheet(null) }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })), /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-base font-bold" }, "Payment Mode"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-1.5 py-4 space-y-3" }, /* @__PURE__ */ React.createElement(PaymentModeCard, { rooms }))))), /* @__PURE__ */ React.createElement(Sheet, { open: activeSheet === "total-collected", onOpenChange: (o) => !o && setActiveSheet(null) }, /* @__PURE__ */ React.createElement(SheetContent, { side: "right", className: isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "px-4 pt-4 pb-2 border-b bg-background shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0", onClick: () => setActiveSheet(null) }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })), /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-base font-bold" }, "Total Collected"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-1.5 py-4 space-y-3" }, /* @__PURE__ */ React.createElement(TotalCollectedCard, { rooms, rentCollected }), /* @__PURE__ */ React.createElement(PaymentModeCard, { rooms }), /* @__PURE__ */ React.createElement(AllCollectedCard, { rooms }))))), /* @__PURE__ */ React.createElement(Sheet, { open: activeSheet === "all-collected", onOpenChange: (o) => !o && setActiveSheet(null) }, /* @__PURE__ */ React.createElement(SheetContent, { side: "right", className: isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "px-4 pt-4 pb-2 border-b bg-background shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0", onClick: () => setActiveSheet(null) }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })), /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-base font-bold" }, "All Collected"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-1.5 py-4 space-y-3" }, /* @__PURE__ */ React.createElement(AllCollectedCard, { rooms }))))), activeSheet === "security-deposit" && /* @__PURE__ */ React.createElement(SecurityDepositCard, { rooms, defaultOpen: true, onClose: () => setActiveSheet(null), showSummaryCard: false }), /* @__PURE__ */ React.createElement(Sheet, { open: activeSheet === "building-rent", onOpenChange: (o) => !o && setActiveSheet(null) }, /* @__PURE__ */ React.createElement(SheetContent, { side: "right", className: isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "px-4 pt-4 pb-2 border-b bg-background shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0", onClick: () => setActiveSheet(null) }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })), /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-base font-bold" }, "Building Rent"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-1.5 py-4 space-y-3" }, /* @__PURE__ */ React.createElement(BuildingRentCard, { defaultOpen: true }))))), /* @__PURE__ */ React.createElement(
    PendingTenantsCard,
    {
      ref: pendingTenantsRef,
      rooms,
      open: activeSheet === "pending-tenants",
      onClose: () => {
        setActiveSheet(null);
        setPendingTenantsDefaultTab("overdue");
      },
      showSummaryCard: false,
      defaultTab: pendingTenantsDefaultTab
    }
  ), /* @__PURE__ */ React.createElement(
    ExpectedCollectionCard,
    {
      open: activeSheet === "expected-collection",
      onClose: () => setActiveSheet(null),
      showSummaryCard: false
    }
  ), activeSheet === "tenant-pricing" && /* @__PURE__ */ React.createElement(TenantPricingOverviewCard, { defaultOpen: true, onClose: () => setActiveSheet(null), showSummaryCard: false }), activeSheet === "tenant-movement" && /* @__PURE__ */ React.createElement(TenantMovementCard, { rooms, defaultOpen: true, onClose: () => setActiveSheet(null), showSummaryCard: false }), activeSheet === "calculator" && /* @__PURE__ */ React.createElement(CalculatorCard, { defaultOpen: true, onExternalOpenChange: (open) => !open && setActiveSheet(null), hideCard: true }), activeSheet === "key-numbers" && /* @__PURE__ */ React.createElement(KeyNumbersCard, { defaultOpen: true, onClose: () => setActiveSheet(null), showSummaryCard: false }), activeSheet === "pg-rules" && /* @__PURE__ */ React.createElement(PGRulesCard, { defaultOpen: true, onClose: () => setActiveSheet(null), onEditableTemplate: (rules, language) => {
    setActiveSheet(null);
    setRulesForTemplate(rules);
    setRulesLanguage(language);
    setRulesTemplateOpen(true);
  }, showSummaryCard: false }), activeSheet === "bill-prices" && /* @__PURE__ */ React.createElement(BillUnitPricesCard, { defaultOpen: true, onClose: () => setActiveSheet(null), showSummaryCard: false }), /* @__PURE__ */ React.createElement(Sheet, { open: billsBudgetOpen, onOpenChange: setBillsBudgetOpen }, /* @__PURE__ */ React.createElement(SheetContent, { side: "right", className: isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "px-4 pt-4 pb-2 border-b bg-background shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0", onClick: () => setBillsBudgetOpen(false), "aria-label": "Back" }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 flex-1" }, /* @__PURE__ */ React.createElement(Scale, { className: "h-4 w-4 text-primary shrink-0" }), /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-base text-foreground font-bold" }, "Bills & Budget")))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-1.5 py-4 space-y-4" }, /* @__PURE__ */ React.createElement(BillsBudgetDashboard, { rooms }))))), /* @__PURE__ */ React.createElement(RulesTemplate, { open: rulesTemplateOpen, onOpenChange: setRulesTemplateOpen, rules: rulesForTemplate, language: rulesLanguage }), canManageDayGuests && /* @__PURE__ */ React.createElement(DayGuestSheet, { open: dayGuestSheetOpen, onOpenChange: setDayGuestSheetOpen }), /* @__PURE__ */ React.createElement(
    EmptyBedsSheet,
    {
      open: emptyBedsSheetOpen,
      onOpenChange: setEmptyBedsSheetOpen,
      roomStats,
      totalEmptyBeds,
      totalPotentialRevenue: totalPotentialAdditionalRevenue
    }
  ), /* @__PURE__ */ React.createElement(SettlementSummarySheet, { open: settlementSheetOpen, onOpenChange: setSettlementSheetOpen, rooms }), /* @__PURE__ */ React.createElement(CalculatorCard, { externalOpen: calculatorSheetOpen, onExternalOpenChange: setCalculatorSheetOpen, hideCard: true }), /* @__PURE__ */ React.createElement(Sheet, { open: financialsOpen, onOpenChange: setFinancialsOpen }, /* @__PURE__ */ React.createElement(SheetContent, { side: "bottom", className: "h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "mb-5" }, /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-left" }, "Financials")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center" }, [
    { key: "collected-by", icon: "/icons/avatar-3d.png", label: "Collected By" },
    { key: "total-collected", icon: "/icons/total-collected-update.png", label: "Total Collected" },
    { key: "security-deposit", icon: "/icons/safe-box-3d.png", label: "Security Deposit" },
    { key: "overdue-overview", icon: "/icons/overdue.jpg", label: "Overdue Overview" },
    { key: "day-guest", icon: "/icons/bed-3d.png", label: "Day Guests" }
  ].map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.key,
      className: "cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full",
      onClick: () => {
        setFinancialsOpen(false);
        setTimeout(() => {
          if (item.key === "day-guest") {
            setDayGuestSheetOpen(true);
          } else if (item.key === "overdue-overview") {
            setPendingTenantsDefaultTab("previous-month");
            setActiveSheet("pending-tenants");
          } else {
            setActiveSheet(item.key);
          }
        }, 300);
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: item.icon,
        alt: item.label,
        className: "w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
      }
    )),
    /* @__PURE__ */ React.createElement("span", { className: "text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]" }, item.label)
  ))))), /* @__PURE__ */ React.createElement(Sheet, { open: tenantsOpen, onOpenChange: setTenantsOpen }, /* @__PURE__ */ React.createElement(SheetContent, { side: "bottom", className: "h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "mb-5" }, /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-left" }, "Tenants")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center" }, [
    { key: "pending-tenants", icon: "/icons/pending-updte.jpg", label: "Pending" },
    { key: "expected-collection", icon: "/icons/expected-updte.png", label: "Expected" },
    { key: "tenant-pricing", icon: "/icons/tenant-pricing-3d.jpg", label: "Pricing" },
    { key: "tenant-movement", icon: "/icons/movemnet-update.png", label: "Movement" },
    { key: "settlement", icon: "/icons/settlement-final.jpg", label: "Settlement" }
  ].map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.key,
      className: "cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full",
      onClick: () => {
        setTenantsOpen(false);
        setTimeout(() => item.key === "settlement" ? setSettlementSheetOpen(true) : item.key === "pending-tenants" ? openPendingTenants() : setActiveSheet(item.key), 300);
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: item.icon,
        alt: item.label,
        className: "w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
      }
    )),
    /* @__PURE__ */ React.createElement("span", { className: "text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]" }, item.label)
  ))))), /* @__PURE__ */ React.createElement(Sheet, { open: toolsOpen, onOpenChange: setToolsOpen }, /* @__PURE__ */ React.createElement(SheetContent, { side: "bottom", className: "h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "mb-5" }, /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-left" }, "Tools & Admin")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center" }, [
    { key: "calculator", icon: "/icons/calculator-3d.jpg", label: "Calculator" },
    { key: "key-numbers", icon: "/icons/key-numbers-3d.png", label: "Key Numbers" },
    { key: "pg-rules", icon: "/icons/pg-rules-3d.png", label: "PG Rules" },
    { key: "bill-prices", icon: "/icons/electricity-bill-update.png", label: "Bill Prices" }
  ].map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.key,
      className: "cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full",
      onClick: () => {
        setToolsOpen(false);
        setTimeout(() => setActiveSheet(item.key), 300);
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: item.icon,
        alt: item.label,
        className: "w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
      }
    )),
    /* @__PURE__ */ React.createElement("span", { className: "text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]" }, item.label)
  ))))), /* @__PURE__ */ React.createElement(Sheet, { open: billsBudgetGridOpen, onOpenChange: setBillsBudgetGridOpen }, /* @__PURE__ */ React.createElement(SheetContent, { side: "bottom", className: "h-auto max-h-[70vh] px-6 pt-6 pb-8 rounded-t-[2rem]" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "mb-5" }, /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-left" }, "Bills & Budget")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-5 sm:grid-cols-6 gap-x-2 sm:gap-x-4 gap-y-5 justify-items-center" }, [
    { key: "building-rent", icon: "/icons/rent-update.png", label: "Building Rent" },
    { key: "bills-budget", icon: "/icons/budget-update.png", label: "Overview" }
  ].map((item) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: item.key,
      className: "cursor-pointer group flex flex-col items-center text-center transition-all duration-200 active:scale-95 w-full",
      onClick: () => {
        setBillsBudgetGridOpen(false);
        setTimeout(() => item.key === "building-rent" ? setActiveSheet("building-rent") : setBillsBudgetOpen(true), 300);
      }
    },
    /* @__PURE__ */ React.createElement("div", { className: "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden mb-2 flex items-center justify-center bg-white border border-slate-200/60 dark:border-slate-200/40 shadow-sm relative p-0.5 transition-all duration-200 group-hover:shadow-md" }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: item.icon,
        alt: item.label,
        className: "w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
      }
    )),
    /* @__PURE__ */ React.createElement("span", { className: "text-[10px] sm:text-xs text-foreground/80 font-medium leading-tight line-clamp-2 max-w-[64px] sm:max-w-[76px]" }, item.label)
  ))))), /* @__PURE__ */ React.createElement(Sheet, { open: addTenantRoomSelectOpen, onOpenChange: setAddTenantRoomSelectOpen }, /* @__PURE__ */ React.createElement(SheetContent, { side: "bottom", className: "h-full w-full px-0 pt-0 pb-0 rounded-none border-none overflow-hidden flex flex-col [&>button]:hidden animate-in duration-300" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50" }, /* @__PURE__ */ React.createElement(SheetHeader, { className: "px-4 pt-4 pb-2 border-b bg-background shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setAddTenantRoomSelectOpen(false),
      className: "flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors shrink-0"
    },
    /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })
  ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(SheetTitle, { className: "text-left font-bold text-base" }, "Select Room for Tenant")))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-4 py-4 bg-background" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-3" }, (rooms || []).filter((room) => {
    const activeTenantsCount = (room.tenants || []).filter((t) => t && isTenantActiveNow(t.startDate, t.endDate)).length;
    return room.capacity - activeTenantsCount > 0;
  }).map((room) => {
    const activeTenantsCount = (room.tenants || []).filter((t) => t && isTenantActiveNow(t.startDate, t.endDate)).length;
    const available = room.capacity - activeTenantsCount;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        key: room.id,
        onClick: () => {
          setAddTenantRoomSelectOpen(false);
          onQuickAddTenant(room);
        },
        className: "flex flex-col items-center justify-center p-3 rounded-2xl border border-border bg-card shadow-sm hover:bg-accent/50 cursor-pointer transition-all active:scale-95"
      },
      /* @__PURE__ */ React.createElement("h4", { className: "font-bold text-lg" }, room.roomNo),
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 mt-1 bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold" }, available, " bed", available > 1 ? "s" : ""))
    );
  })), (rooms || []).filter((room) => {
    if (!room) return false;
    const activeTenantsCount = (room.tenants || []).filter((t) => t && isTenantActiveNow(t.startDate, t.endDate)).length;
    return room.capacity - activeTenantsCount > 0;
  }).length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center p-8 text-muted-foreground" }, /* @__PURE__ */ React.createElement("p", null, "No rooms with available beds.")))))));
};
