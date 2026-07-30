import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Coffee,
  Droplet,
  Egg,
  Flame,
  Home,
  IndianRupee,
  Layers3,
  Milk,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Settings,
  ShoppingBag,
  Sparkles,
  Wallet,
  Drumstick,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  ArrowUpRight,
  PieChart,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMonthContext } from "@/contexts/MonthContext";
import { usePG } from "@/contexts/PGContext";
import { useExpenseEntries, type ExpenseCategory } from "@/hooks/useExpenseEntries";
import { useMonthlyBudget } from "@/hooks/useMonthlyBudget";
import { MONTHS } from "@/constants/pricing";
import { Room } from "@/types";
import { QuickExpenseDialog, type QuickExpenseInitial } from "./bills/QuickExpenseDialog";
import { BillsEntriesSheet } from "./bills/BillsEntriesSheet";
import { BillsAnalytics } from "./bills/BillsAnalytics";

interface Props {
  rooms: Room[];
}

type DashboardTab = "overview" | "activity";

const getFloorLabel = (floor: number): string => {
  if (floor === 0) return "Ground Floor";
  const j = floor % 10;
  const k = floor % 100;
  if (j === 1 && k !== 11) return `${floor}st Floor`;
  if (j === 2 && k !== 12) return `${floor}nd Floor`;
  if (j === 3 && k !== 13) return `${floor}rd Floor`;
  return `${floor}th Floor`;
};

const UTILITY_PRESETS = [
  { key: "Water Tank", icon: Droplet },
  { key: "Gas Cylinder", icon: Flame },
  { key: "Water Can", icon: Coffee },
  { key: "Milk & Curd", icon: Milk },
  { key: "Rice Bags", icon: ShoppingBag },
  { key: "Palm Oil", icon: Droplet },
  { key: "Chicken", icon: Drumstick },
  { key: "Eggs", icon: Egg },
];

const CATEGORY_META: Record<
  ExpenseCategory,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ElementType;
    iconTone: string;
    surfaceTone: string;
    barTone: string;
    gradient: string;
    accentColor: string;
    ringColor: string;
  }
> = {
  current: {
    label: "Current Bills",
    shortLabel: "Current",
    description: "Electricity & motor",
    icon: Zap,
    iconTone: "text-amber-600 dark:text-amber-400",
    surfaceTone: "bg-amber-500/10 dark:bg-amber-500/15",
    barTone: "bg-amber-500",
    gradient: "from-amber-500 to-orange-500",
    accentColor: "amber",
    ringColor: "ring-amber-500/30",
  },
  utility: {
    label: "Utilities",
    shortLabel: "Utilities",
    description: "Daily operations",
    icon: Droplet,
    iconTone: "text-sky-600 dark:text-sky-400",
    surfaceTone: "bg-sky-500/10 dark:bg-sky-500/15",
    barTone: "bg-sky-500",
    gradient: "from-sky-500 to-cyan-500",
    accentColor: "sky",
    ringColor: "ring-sky-500/30",
  },
  other: {
    label: "Other Bills",
    shortLabel: "Other",
    description: "One-off costs",
    icon: Receipt,
    iconTone: "text-violet-600 dark:text-violet-400",
    surfaceTone: "bg-violet-500/10 dark:bg-violet-500/15",
    barTone: "bg-violet-500",
    gradient: "from-violet-500 to-purple-500",
    accentColor: "violet",
    ringColor: "ring-violet-500/30",
  },
  family: {
    label: "Family",
    shortLabel: "Family",
    description: "Personal spend",
    icon: Home,
    iconTone: "text-rose-600 dark:text-rose-400",
    surfaceTone: "bg-rose-500/10 dark:bg-rose-500/15",
    barTone: "bg-rose-500",
    gradient: "from-rose-500 to-pink-500",
    accentColor: "rose",
    ringColor: "ring-rose-500/30",
  },
};

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/* ─── Circular gauge ──────────────────────────────────────────────── */
const BudgetGauge = ({ percent, spent, budget, remaining }: { percent: number; spent: number; budget: number; remaining: number }) => {
  const radius = 52;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(percent, 100);
  const offset = circumference - (clampedPercent / 100) * circumference;
  const gaugeColor = percent >= 100 ? "#f43f5e" : percent >= 75 ? "#f59e0b" : "#10b981";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
        <circle cx="66" cy="66" r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/10" />
        <circle
          cx="66" cy="66" r={radius} fill="none"
          stroke={gaugeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={budget > 0 ? offset : circumference}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Spent</span>
        <span className="text-xl font-black text-white leading-tight">{formatCurrency(spent)}</span>
        {budget > 0 && (
          <span className={cn("text-[11px] font-bold mt-0.5", remaining < 0 ? "text-rose-300" : "text-emerald-300")}>
            {remaining < 0 ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
          </span>
        )}
      </div>
    </div>
  );
};

export const BillsBudgetDashboard = ({ rooms }: Props) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const pgId = currentPG?.id;

  const expenseQuery = useExpenseEntries(selectedMonth, selectedYear);
  const budgetQuery = useMonthlyBudget(selectedMonth, selectedYear);
  const {
    entries,
    byCategory,
    totalFor,
    grandTotal,
    addEntry,
    updateEntry,
    deleteEntry,
  } = expenseQuery;
  const { amount: budgetAmount, setBudget } = budgetQuery;

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [quickAdd, setQuickAdd] = useState<QuickExpenseInitial | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [addPickerCategory, setAddPickerCategory] = useState<ExpenseCategory | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [sheetState, setSheetState] = useState<{
    title: string;
    category: ExpenseCategory;
    subcategory?: string | null;
    floor?: number | null;
    defaultLabel?: string;
    lockLabel?: boolean;
  } | null>(null);

  const [numFloors, setNumFloors] = useState(3);
  const [includeGround, setIncludeGround] = useState(false);
  const [isFloorsConfigOpen, setIsFloorsConfigOpen] = useState(false);
  const [tempNumFloors, setTempNumFloors] = useState("3");
  const [tempIncludeGround, setTempIncludeGround] = useState(false);

  const storageKey = pgId ? `current_bills_floors_${pgId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNumFloors(parsed.n || 3);
        setIncludeGround(Boolean(parsed.includeGround));
        return;
      } catch (error) {
        console.error("Unable to read floor configuration", error);
      }
    }

    const maxFloorInRooms = rooms.length > 0 ? Math.max(...rooms.map((room) => room.floor)) : 0;
    setNumFloors(maxFloorInRooms || currentPG?.floors || 3);
    setIncludeGround(rooms.some((room) => room.floor === 0));
  }, [storageKey, rooms, currentPG]);

  const floors = useMemo(() => {
    const list: number[] = includeGround ? [0] : [];
    for (let floor = 1; floor <= numFloors; floor += 1) list.push(floor);
    return list;
  }, [includeGround, numFloors]);

  const currentBillPresets = useMemo(
    () => [
      ...floors.map((floor) => ({
        key: `floor-${floor}`,
        label: getFloorLabel(floor),
        subcategory: getFloorLabel(floor),
        floor,
        icon: Building2,
      })),
      {
        key: "motor",
        label: "Motor Bill",
        subcategory: "Motor",
        floor: null,
        icon: Settings,
      },
    ],
    [floors],
  );

  const categoryData = (Object.keys(CATEGORY_META) as ExpenseCategory[]).map((category) => ({
    category,
    total: totalFor(category),
    count: byCategory(category).length,
    ...CATEGORY_META[category],
  }));

  const hasBudget = budgetAmount > 0;
  const rawPercentUsed = hasBudget ? (grandTotal / budgetAmount) * 100 : 0;
  const percentUsed = Math.min(100, rawPercentUsed);
  const remaining = budgetAmount - grandTotal;
  const recentEntries = entries.slice(0, 5);
  const largestCategory = [...categoryData].sort((a, b) => b.total - a.total)[0];
  const isLoading = expenseQuery.isLoading || budgetQuery.isLoading;
  const isError = expenseQuery.isError || budgetQuery.isError;

  const openFloorSettings = () => {
    setTempNumFloors(String(numFloors));
    setTempIncludeGround(includeGround);
    setIsFloorsConfigOpen(true);
  };

  const openCategory = (category: ExpenseCategory) => {
    setSheetState({
      title: CATEGORY_META[category].label,
      category,
    });
  };

  const openQuickAdd = (initial: QuickExpenseInitial) => {
    setAddPickerOpen(false);
    setAddPickerCategory(null);
    setQuickAdd(initial);
  };

  const chooseAddCategory = (category: ExpenseCategory) => {
    if (category === "other" || category === "family") {
      openQuickAdd({
        category,
        title: category === "other" ? "Add other bill" : "Add family expense",
      });
      return;
    }
    setAddPickerCategory(category);
  };

  const retryQueries = () => {
    void expenseQuery.refetch();
    void budgetQuery.refetch();
  };

  /* ─── Loading skeleton ──────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3 px-3 pt-3" style={{ paddingBottom: "calc(var(--bottom-nav-offset, 0px) + 12px)" }}>
        <Skeleton className="h-[200px] shrink-0 rounded-[28px]" />
        <Skeleton className="h-12 shrink-0 rounded-2xl" />
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="min-h-[130px] rounded-2xl" />
          ))}
        </div>
        <span className="sr-only">Loading bills and budget</span>
      </div>
    );
  }

  /* ─── Error state ──────────────────────────────── */
  if (isError) {
    return (
      <div className="flex h-full items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-[28px] border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold">Couldn't load your bills</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Check your connection and try again. Your saved data is safe.
          </p>
          <Button className="mt-5 h-12 w-full rounded-2xl" onClick={retryQueries}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  /* ─── Main render ──────────────────────────────── */
  return (
    <>
      <div
        className="bills-dashboard-shell flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-3 pt-3"
        style={{ paddingBottom: "calc(var(--bottom-nav-offset, 0px) + 80px)" }}
      >
        {/* ══════════════ HERO CARD ══════════════ */}
        <section className="shrink-0 overflow-hidden rounded-[28px] shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)]">
          <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white">
            {/* subtle decorative glow */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-violet-500/15 blur-3xl" />

            {/* top bar */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                  <CalendarDays className="h-4 w-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Monthly Spend</p>
                  <p className="text-sm font-bold">{MONTHS[selectedMonth - 1]?.label} {selectedYear}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-9 gap-1.5 rounded-xl px-3 text-[11px] font-bold uppercase tracking-wider text-white/70 hover:bg-white/10 hover:text-white"
                onClick={() => setAnalyticsOpen(true)}
              >
                <PieChart className="h-3.5 w-3.5" />
                Insights
              </Button>
            </div>

            {/* center gauge + stats */}
            <div className="relative mt-4 flex items-center gap-4">
              <BudgetGauge
                percent={rawPercentUsed}
                spent={grandTotal}
                budget={budgetAmount}
                remaining={remaining}
              />

              <div className="flex flex-1 flex-col gap-2">
                {/* Budget pill */}
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2.5 text-left backdrop-blur-sm transition-colors hover:bg-white/12"
                  onClick={() => {
                    setBudgetDraft(hasBudget ? String(budgetAmount) : "");
                    setEditingBudget(true);
                  }}
                >
                  <Target className="h-4 w-4 shrink-0 text-indigo-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Budget</p>
                    <p className="text-sm font-bold">{hasBudget ? formatCurrency(budgetAmount) : "Tap to set"}</p>
                  </div>
                  <Pencil className="h-3 w-3 text-white/30" />
                </button>

                {/* entries & categories count */}
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl bg-white/8 px-2.5 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-medium text-white/40">Entries</p>
                    <p className="text-sm font-bold">{entries.length}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-white/8 px-2.5 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-medium text-white/40">Categories</p>
                    <p className="text-sm font-bold">{categoryData.filter((c) => c.count > 0).length}/4</p>
                  </div>
                </div>
              </div>
            </div>

            {/* budget progress bar */}
            {hasBudget && (
              <div className="relative mt-4">
                <div className="flex items-center justify-between text-[11px] font-medium text-white/50 mb-1.5">
                  <span>{Math.round(rawPercentUsed)}% used</span>
                  <span>{formatCurrency(budgetAmount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      rawPercentUsed >= 100 ? "bg-gradient-to-r from-rose-400 to-rose-500" :
                      rawPercentUsed >= 75 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                      "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    )}
                    style={{ width: `${Math.max(percentUsed, grandTotal > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════ TAB SWITCHER ══════════════ */}
        <div className="grid h-[48px] shrink-0 grid-cols-2 rounded-2xl bg-muted/60 p-1" role="tablist">
          {(["overview", "activity"] as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold capitalize transition-all",
                activeTab === tab
                  ? "bg-background text-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground/70",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" ? <Layers3 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {tab}
              {tab === "activity" && entries.length > 0 && (
                <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                  {entries.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════ TAB CONTENT ══════════════ */}
        <div className="min-h-0 flex-1">
          {activeTab === "overview" ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              {/* Category cards grid */}
              <div className="grid min-h-[260px] flex-1 grid-cols-2 gap-3">
                {categoryData.map((item) => {
                  const Icon = item.icon;
                  const share = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
                  return (
                    <div key={item.category} className="relative min-h-0">
                      <button
                        type="button"
                        className={cn(
                          "group flex h-full w-full min-h-[130px] flex-col rounded-2xl border bg-card p-3.5 text-left transition-all duration-200",
                          "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          item.ringColor
                        )}
                        onClick={() => openCategory(item.category)}
                        aria-label={`Open ${item.label}, ${formatCurrency(item.total)}, ${item.count} entries`}
                      >
                        {/* top row: icon + arrow */}
                        <div className="flex w-full items-start justify-between">
                          <div className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
                            item.surfaceTone, item.iconTone
                          )}>
                            <Icon className="h-5 w-5" />
                          </div>
                          {item.category === "current" ? (
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); openFloorSettings(); }}
                              aria-label="Configure floors"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                          )}
                        </div>

                        {/* bottom: label + amount */}
                        <div className="mt-auto w-full pt-2.5">
                          <p className="text-[11px] font-semibold text-muted-foreground">{item.label}</p>
                          <div className="mt-0.5 flex items-end justify-between gap-1.5">
                            <p className="text-[18px] font-black leading-tight tracking-tight">{formatCurrency(item.total)}</p>
                            {grandTotal > 0 && share > 0 && (
                              <span className={cn(
                                "mb-0.5 shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold",
                                item.surfaceTone, item.iconTone
                              )}>
                                {share}%
                              </span>
                            )}
                          </div>
                          {/* progress bar */}
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
                            <div
                              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", item.gradient)}
                              style={{ width: `${Math.max(share, item.total > 0 ? 3 : 0)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground/70">
                            {item.count} {item.count === 1 ? "entry" : "entries"} · {item.description}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Empty state prompt */}
              {entries.length === 0 && (
                <div className="shrink-0 flex items-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 px-4 py-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Ready for your first expense</p>
                    <p className="text-xs text-muted-foreground">Tap + below to start tracking this month.</p>
                  </div>
                </div>
              )}

              {/* Quick-add shortcuts (collapsible) */}
              <Collapsible open={shortcutsOpen} onOpenChange={setShortcutsOpen} className="shrink-0 rounded-2xl border bg-card overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-between px-4 text-left focus-visible:outline-none"
                  >
                    <span className="flex items-center gap-2.5 text-sm font-bold">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Quick-add shortcuts
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", shortcutsOpen && "rotate-180")} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t px-3 py-3">
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 px-1">⚡ Current Bills</p>
                    <div className="scrollbar-hide flex snap-x gap-2 overflow-x-auto pb-2">
                      {currentBillPresets.map((preset) => {
                        const Icon = preset.icon;
                        return (
                          <button
                            key={preset.key}
                            type="button"
                            className="flex h-12 min-w-[110px] snap-start items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-3 text-left transition-all hover:from-amber-500/20 hover:to-orange-500/20 active:scale-95"
                            onClick={() =>
                              openQuickAdd({
                                category: "current",
                                subcategory: preset.subcategory,
                                floor: preset.floor,
                                label: `${preset.label} - ${MONTHS[selectedMonth - 1]?.label}`,
                                title: `Add ${preset.label}`,
                              })
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-bold">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] font-semibold text-muted-foreground mb-2 mt-2 px-1">💧 Utilities</p>
                    <div className="scrollbar-hide flex snap-x gap-2 overflow-x-auto pb-1">
                      {UTILITY_PRESETS.map((preset) => {
                        const Icon = preset.icon;
                        return (
                          <button
                            key={preset.key}
                            type="button"
                            className="flex h-12 min-w-[110px] snap-start items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/10 to-cyan-500/10 px-3 text-left transition-all hover:from-sky-500/20 hover:to-cyan-500/20 active:scale-95"
                            onClick={() =>
                              openQuickAdd({
                                category: "utility",
                                subcategory: preset.key,
                                label: preset.key,
                                title: `Add ${preset.key}`,
                              })
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                            <span className="text-xs font-bold">{preset.key}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : (
            /* ══════════════ ACTIVITY TAB ══════════════ */
            <div className="flex h-full min-h-0 flex-col gap-3">
              {/* Top summary card */}
              {largestCategory && largestCategory.total > 0 && (
                <div className="shrink-0 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", largestCategory.surfaceTone)}>
                    {(() => { const LIcon = largestCategory.icon; return <LIcon className={cn("h-5 w-5", largestCategory.iconTone)} />; })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground">Biggest category</p>
                    <p className="text-sm font-bold truncate">{largestCategory.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black">{formatCurrency(largestCategory.total)}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {grandTotal > 0 ? Math.round((largestCategory.total / grandTotal) * 100) : 0}% of total
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl"
                    onClick={() => setAnalyticsOpen(true)}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Recent activity list */}
              <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex h-12 items-center justify-between border-b px-4">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Recent Activity
                  </p>
                  {entries.length > 5 && (
                    <button
                      type="button"
                      className="text-xs font-bold text-primary"
                      onClick={() => openCategory(recentEntries[0]?.category ?? "other")}
                    >
                      View all →
                    </button>
                  )}
                </div>
                {recentEntries.length === 0 ? (
                  <div className="flex h-[calc(100%-48px)] flex-col items-center justify-center px-5 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-3">
                      <Receipt className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-bold">No activity yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">New expenses will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto">
                    {recentEntries.map((entry, idx) => {
                      const meta = CATEGORY_META[entry.category];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={cn(
                            "flex min-h-[64px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-muted/40",
                            idx !== recentEntries.length - 1 && "border-b border-border/50"
                          )}
                          onClick={() => openCategory(entry.category)}
                        >
                          <div className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            meta.surfaceTone, meta.iconTone
                          )}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{entry.label}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {meta.shortLabel} · {format(new Date(entry.entry_date), "dd MMM yyyy")}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black">{formatCurrency(entry.amount)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Category breakdown mini cards */}
              <div className="shrink-0 grid grid-cols-4 gap-2">
                {categoryData.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.category}
                      type="button"
                      className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2 transition-all hover:shadow-md active:scale-95"
                      onClick={() => openCategory(item.category)}
                    >
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", item.surfaceTone)}>
                        <Icon className={cn("h-3.5 w-3.5", item.iconTone)} />
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground">{item.shortLabel}</p>
                      <p className="text-[11px] font-black">{item.count}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ FLOATING ACTION BUTTON ══════════════ */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4" style={{ bottom: "calc(var(--bottom-nav-offset, 0px) + 16px)" }}>
        <Button
          className="h-14 w-full max-w-xs rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-[0_12px_32px_-8px_rgba(99,102,241,0.5)] hover:shadow-[0_16px_40px_-8px_rgba(99,102,241,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => {
            setAddPickerCategory(null);
            setAddPickerOpen(true);
          }}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Expense
        </Button>
      </div>

      {/* ══════════════ SET BUDGET DIALOG ══════════════ */}
      <Dialog open={editingBudget} onOpenChange={setEditingBudget}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[28px] sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
              <Target className="h-7 w-7 text-indigo-500" />
            </div>
            <DialogTitle className="text-center">Set monthly budget</DialogTitle>
            <DialogDescription className="text-center">
              Set a spending limit for {MONTHS[selectedMonth - 1]?.label} {selectedYear}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="budget-amount">Budget amount</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="budget-amount"
                type="number"
                inputMode="numeric"
                min={0}
                value={budgetDraft}
                onChange={(event) => setBudgetDraft(event.target.value)}
                placeholder="80,000"
                className="h-12 rounded-xl pl-9 text-base font-semibold"
                autoFocus
              />
            </div>
            {/* Quick budget suggestions */}
            <div className="flex gap-2 pt-1">
              {[50000, 75000, 100000, 150000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="flex-1 rounded-lg border py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setBudgetDraft(String(amt))}
                >
                  {amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}K`}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setEditingBudget(false)}>
              Cancel
            </Button>
            <Button
              className="h-12 flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
              disabled={!budgetDraft || Number(budgetDraft) < 0 || setBudget.isPending}
              onClick={() => {
                const amount = Number.parseInt(budgetDraft, 10);
                if (Number.isNaN(amount) || amount < 0) return;
                setBudget.mutate(amount, { onSuccess: () => setEditingBudget(false) });
              }}
            >
              {setBudget.isPending ? "Saving…" : "Save Budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ ADD EXPENSE PICKER DIALOG ══════════════ */}
      <Dialog
        open={addPickerOpen}
        onOpenChange={(open) => {
          setAddPickerOpen(open);
          if (!open) setAddPickerCategory(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-24px)] overflow-hidden rounded-[28px] p-0 sm:max-w-sm">
          <DialogHeader className="px-5 pb-0 pt-5">
            <DialogTitle className="flex items-center gap-2 text-base">
              {addPickerCategory && (
                <button
                  type="button"
                  className="-ml-2 flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                  onClick={() => setAddPickerCategory(null)}
                  aria-label="Back to categories"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {addPickerCategory ? `Choose ${CATEGORY_META[addPickerCategory].shortLabel}` : "Add an expense"}
            </DialogTitle>
            <DialogDescription>
              {addPickerCategory ? "Pick a shortcut or add a custom entry." : "What kind of expense?"}
            </DialogDescription>
          </DialogHeader>

          {!addPickerCategory ? (
            <div className="grid grid-cols-2 gap-3 px-5 pb-5 pt-3">
              {categoryData.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.category}
                    type="button"
                    className={cn(
                      "group flex min-h-[100px] flex-col items-start justify-between rounded-2xl border bg-card p-3.5 text-left transition-all",
                      "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]",
                      item.ringColor
                    )}
                    onClick={() => chooseAddCategory(item.category)}
                  >
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110", item.surfaceTone, item.iconTone)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold">{item.label}</span>
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="min-w-0 overflow-hidden pb-5 pt-3">
              <div className="scrollbar-hide flex w-full max-w-full snap-x gap-2.5 overflow-x-auto px-5 pb-3">
                {addPickerCategory === "current" &&
                  currentBillPresets.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        className="flex h-[92px] min-w-[128px] snap-start flex-col items-start justify-between rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-3 text-left transition-all hover:from-amber-500/20 hover:to-orange-500/20 active:scale-95"
                        onClick={() =>
                          openQuickAdd({
                            category: "current",
                            subcategory: preset.subcategory,
                            floor: preset.floor,
                            label: `${preset.label} - ${MONTHS[selectedMonth - 1]?.label}`,
                            title: `Add ${preset.label}`,
                          })
                        }
                      >
                        <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-bold">{preset.label}</span>
                      </button>
                    );
                  })}
                {addPickerCategory === "utility" &&
                  UTILITY_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        className="flex h-[92px] min-w-[128px] snap-start flex-col items-start justify-between rounded-2xl bg-gradient-to-br from-sky-500/10 to-cyan-500/10 p-3 text-left transition-all hover:from-sky-500/20 hover:to-cyan-500/20 active:scale-95"
                        onClick={() =>
                          openQuickAdd({
                            category: "utility",
                            subcategory: preset.key,
                            label: preset.key,
                            title: `Add ${preset.key}`,
                          })
                        }
                      >
                        <Icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                        <span className="text-sm font-bold">{preset.key}</span>
                      </button>
                    );
                  })}
              </div>
              <div className="px-5">
                <Button
                  variant="outline"
                  className="h-12 w-full rounded-xl"
                  onClick={() =>
                    openQuickAdd({
                      category: addPickerCategory,
                      title: `Add custom ${CATEGORY_META[addPickerCategory].shortLabel.toLowerCase()} expense`,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add custom entry
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════ QUICK EXPENSE DIALOG ══════════════ */}
      <QuickExpenseDialog
        open={Boolean(quickAdd)}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        initial={quickAdd}
        rooms={rooms}
        onSave={(data) => {
          addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear });
          setQuickAdd(null);
        }}
      />

      {/* ══════════════ ENTRIES SHEET ══════════════ */}
      {sheetState && (
        <BillsEntriesSheet
          open={Boolean(sheetState)}
          onOpenChange={(open) => !open && setSheetState(null)}
          title={sheetState.title}
          category={sheetState.category}
          subcategory={sheetState.subcategory ?? null}
          floor={sheetState.floor ?? null}
          defaultLabel={sheetState.defaultLabel}
          lockLabel={sheetState.lockLabel}
          entries={
            sheetState.subcategory
              ? byCategory(sheetState.category).filter(
                  (entry) => (entry.subcategory ?? "") === sheetState.subcategory,
                )
              : byCategory(sheetState.category)
          }
          rooms={rooms}
          onSave={(data) => addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear })}
          onUpdate={(id, patch) => updateEntry.mutate({ id, ...patch })}
          onDelete={(id) => deleteEntry.mutate(id)}
        />
      )}

      {/* ══════════════ FLOORS CONFIG DIALOG ══════════════ */}
      <Dialog open={isFloorsConfigOpen} onOpenChange={setIsFloorsConfigOpen}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[28px] sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <Building2 className="h-7 w-7 text-amber-500" />
            </div>
            <DialogTitle className="text-center">Configure current-bill floors</DialogTitle>
            <DialogDescription className="text-center">
              These shortcuts help you record electricity bills faster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="num-floors">Number of floors</Label>
              <Input
                id="num-floors"
                className="h-12 rounded-xl"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={tempNumFloors}
                onChange={(event) => setTempNumFloors(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Choose between 1 and 20 floors.</p>
            </div>
            <label
              htmlFor="ground-floor"
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3"
            >
              <Checkbox
                id="ground-floor"
                checked={tempIncludeGround}
                onCheckedChange={(checked) => setTempIncludeGround(Boolean(checked))}
              />
              <span className="text-sm font-medium">Include ground floor</span>
            </label>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setIsFloorsConfigOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-12 flex-1 rounded-xl"
              onClick={() => {
                const parsed = Number.parseInt(tempNumFloors, 10);
                if (Number.isNaN(parsed) || parsed < 1 || parsed > 20) return;
                setNumFloors(parsed);
                setIncludeGround(tempIncludeGround);
                if (storageKey) {
                  localStorage.setItem(
                    storageKey,
                    JSON.stringify({ n: parsed, includeGround: tempIncludeGround }),
                  );
                }
                setIsFloorsConfigOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ ANALYTICS SHEET ══════════════ */}
      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-full flex-col p-0 [&>button]:hidden sm:max-w-xl"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-left">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={() => setAnalyticsOpen(false)}
                aria-label="Back to bills and budget"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              Spending Insights
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <BillsAnalytics />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
