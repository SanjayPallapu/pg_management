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
  }
> = {
  current: {
    label: "Current bills",
    shortLabel: "Current",
    description: "Floors & motor",
    icon: Building2,
    iconTone: "text-amber-700 dark:text-amber-300",
    surfaceTone: "bg-amber-50 dark:bg-amber-950/25",
    barTone: "bg-amber-500",
  },
  utility: {
    label: "Utilities",
    shortLabel: "Utilities",
    description: "Daily operations",
    icon: Droplet,
    iconTone: "text-sky-700 dark:text-sky-300",
    surfaceTone: "bg-sky-50 dark:bg-sky-950/25",
    barTone: "bg-sky-500",
  },
  other: {
    label: "Other bills",
    shortLabel: "Other",
    description: "One-off costs",
    icon: Receipt,
    iconTone: "text-violet-700 dark:text-violet-300",
    surfaceTone: "bg-violet-50 dark:bg-violet-950/25",
    barTone: "bg-violet-500",
  },
  family: {
    label: "Family expenses",
    shortLabel: "Family",
    description: "Personal spend",
    icon: Home,
    iconTone: "text-rose-700 dark:text-rose-300",
    surfaceTone: "bg-rose-50 dark:bg-rose-950/25",
    barTone: "bg-rose-500",
  },
};

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

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
  const budgetTone =
    rawPercentUsed >= 100 ? "bg-rose-400" : rawPercentUsed >= 75 ? "bg-amber-400" : "bg-emerald-400";
  const recentEntries = entries.slice(0, 3);
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

  if (isLoading) {
    return (
      <div
        className="bills-dashboard-shell flex h-full min-h-0 flex-col gap-3 px-3 pt-3"
        style={{ paddingBottom: "calc(var(--bottom-nav-offset, 0px) + 12px)" }}
      >
        <Skeleton className="h-[154px] shrink-0 rounded-[24px]" />
        <Skeleton className="h-11 shrink-0 rounded-xl" />
        <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="min-h-[108px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 shrink-0 rounded-xl" />
        <Skeleton className="h-12 shrink-0 rounded-xl" />
        <span className="sr-only">Loading bills and budget</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-[24px] border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold">Couldn’t load your bills</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Check your connection and try again. Your saved data is safe.
          </p>
          <Button className="mt-5 h-11 w-full" onClick={retryQueries}>
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="bills-dashboard-shell flex h-full min-h-0 flex-col gap-3 px-3 pt-3"
        style={{ paddingBottom: "calc(var(--bottom-nav-offset, 0px) + 12px)" }}
      >
        <section className="bills-budget-hero shrink-0 rounded-[24px] bg-slate-950 p-4 text-white shadow-[0_14px_36px_-20px_rgba(15,23,42,0.85)] dark:border dark:border-white/10">
          <div className="bills-hero-top flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Wallet className="h-[18px] w-[18px] text-indigo-200" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-300">Monthly spending</p>
                <p className="truncate text-sm font-bold">
                  {MONTHS[selectedMonth - 1]?.label} {selectedYear}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="h-11 shrink-0 rounded-xl px-3 text-xs text-white hover:bg-white/10 hover:text-white"
              onClick={() => setAnalyticsOpen(true)}
            >
              <BarChart3 className="mr-1.5 h-4 w-4 text-indigo-200" />
              Insights
            </Button>
          </div>

          <div className="bills-hero-spend mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                Spent
                <span className="bills-short-month hidden">
                  {" "}· {MONTHS[selectedMonth - 1]?.short} {selectedYear}
                </span>
              </p>
              <p className="mt-0.5 text-[28px] font-bold leading-none tracking-tight">
                {formatCurrency(grandTotal)}
              </p>
            </div>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-3 text-left transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              onClick={() => {
                setBudgetDraft(hasBudget ? String(budgetAmount) : "");
                setEditingBudget(true);
              }}
              aria-label={hasBudget ? `Edit budget of ${formatCurrency(budgetAmount)}` : "Set monthly budget"}
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Budget</p>
                <p className="text-sm font-bold">{hasBudget ? formatCurrency(budgetAmount) : "Set now"}</p>
              </div>
              <Pencil className="h-3.5 w-3.5 text-indigo-200" />
            </button>
          </div>

          <div className="bills-hero-progress mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500", budgetTone)}
                style={{ width: `${hasBudget ? Math.max(percentUsed, grandTotal > 0 ? 2 : 0) : 0}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {hasBudget ? `${Math.round(rawPercentUsed)}% used` : "Add a budget to track your limit"}
              </span>
              {hasBudget && (
                <span className={cn("font-semibold", remaining < 0 ? "text-rose-300" : "text-emerald-300")}>
                  {formatCurrency(Math.abs(remaining))} {remaining < 0 ? "over" : "left"}
                </span>
              )}
            </div>
          </div>
        </section>

        <div
          className="grid h-[52px] shrink-0 grid-cols-2 rounded-xl bg-muted/80 p-1"
          role="tablist"
          aria-label="Bills dashboard views"
        >
          {(["overview", "activity"] as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={cn(
                "min-h-11 rounded-lg text-sm font-semibold capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "activity" && entries.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px]">
                  {entries.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1">
          {activeTab === "overview" ? (
            <div className="flex h-full min-h-0 flex-col gap-3">
              <div className="bills-category-grid grid min-h-[226px] flex-1 grid-cols-2 gap-2.5">
                {categoryData.map((item) => {
                  const Icon = item.icon;
                  const share = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
                  return (
                    <div key={item.category} className="relative min-h-0">
                      <button
                        type="button"
                        className="bills-category-card flex h-full w-full min-h-[110px] flex-col rounded-2xl border bg-card p-3 text-left shadow-[0_8px_22px_-18px_rgba(15,23,42,0.55)] transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                        onClick={() => openCategory(item.category)}
                        aria-label={`Open ${item.label}, ${formatCurrency(item.total)}, ${item.count} entries`}
                      >
                        <div className="flex w-full items-start justify-between">
                          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.surfaceTone, item.iconTone)}>
                            <Icon className="h-[18px] w-[18px]" />
                          </div>
                          {item.category !== "current" && (
                            <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="mt-auto w-full pt-2">
                          <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-muted-foreground">{item.label}</p>
                              <p className="mt-0.5 truncate text-lg font-bold leading-tight">{formatCurrency(item.total)}</p>
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                              {grandTotal > 0 ? `${share}%` : `${item.count}`}
                            </span>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full rounded-full", item.barTone)} style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      </button>
                      {item.category === "current" && (
                        <button
                          type="button"
                          className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={openFloorSettings}
                          aria-label="Configure floors for current bills"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {entries.length === 0 && (
                <div className="bills-empty-prompt flex shrink-0 items-center gap-3 rounded-2xl border border-dashed bg-muted/25 px-3 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Ready for your first expense</p>
                    <p className="truncate text-xs text-muted-foreground">Add a bill to start tracking this month.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col gap-2.5">
              <div className="flex shrink-0 items-center justify-between gap-2 rounded-2xl border bg-card px-3 py-1.5">
                <div>
                  <p className="text-xs text-muted-foreground">Largest category</p>
                  <p className="text-sm font-bold">{largestCategory.label}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-base font-bold">{formatCurrency(largestCategory.total)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {grandTotal > 0 ? Math.round((largestCategory.total / grandTotal) * 100) : 0}% of spend
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl"
                  onClick={() => setAnalyticsOpen(true)}
                  aria-label="Open spending insights"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card">
                <div className="flex h-11 items-center justify-between border-b px-3">
                  <p className="text-sm font-semibold">Recent activity</p>
                  {entries.length > 3 && (
                    <button
                      type="button"
                      className="min-h-11 px-1 text-xs font-semibold text-primary-foreground"
                      onClick={() => openCategory(recentEntries[0]?.category ?? "other")}
                    >
                      View category
                    </button>
                  )}
                </div>
                {recentEntries.length === 0 ? (
                  <div className="flex h-[calc(100%-44px)] flex-col items-center justify-center px-5 text-center">
                    <Receipt className="mb-2 h-7 w-7 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">No activity yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">New expenses will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {recentEntries.map((entry) => {
                      const meta = CATEGORY_META[entry.category];
                      const Icon = meta.icon;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className="flex min-h-[62px] w-full items-center gap-3 px-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          onClick={() => openCategory(entry.category)}
                        >
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.surfaceTone, meta.iconTone)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{entry.label}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {meta.shortLabel} · {format(new Date(entry.entry_date), "dd MMM")}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold">{formatCurrency(entry.amount)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Collapsible open={shortcutsOpen} onOpenChange={setShortcutsOpen} className="relative shrink-0 rounded-2xl border bg-card">
          <div className="flex min-h-11 items-center">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-h-11 flex-1 items-center justify-between rounded-l-2xl px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Layers3 className="h-4 w-4 text-muted-foreground" />
                  Quick-add shortcuts
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", shortcutsOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 overflow-hidden rounded-2xl border bg-card shadow-[0_18px_45px_-18px_rgba(15,23,42,0.5)]">
            <div className="flex h-10 items-center justify-between border-b px-3">
              <span className="text-xs font-semibold">Choose a shortcut</span>
              <span className="text-[11px] text-muted-foreground">Swipe for more</span>
            </div>
            <div className="scrollbar-hide flex snap-x gap-2 overflow-x-auto px-3 py-2.5">
              {currentBillPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className="flex h-14 min-w-[112px] snap-start items-center gap-2 rounded-xl bg-amber-50 px-3 text-left text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-amber-950/30 dark:text-amber-100"
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
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold leading-4">{preset.label}</span>
                  </button>
                );
              })}
              {UTILITY_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className="flex h-14 min-w-[112px] snap-start items-center gap-2 rounded-xl bg-sky-50 px-3 text-left text-sky-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-sky-950/30 dark:text-sky-100"
                    onClick={() =>
                      openQuickAdd({
                        category: "utility",
                        subcategory: preset.key,
                        label: preset.key,
                        title: `Add ${preset.key}`,
                      })
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold leading-4">{preset.key}</span>
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button
          className="h-12 shrink-0 rounded-xl text-sm font-bold shadow-[0_10px_24px_-14px_hsl(var(--primary))]"
          onClick={() => {
            setAddPickerCategory(null);
            setAddPickerOpen(true);
          }}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add expense
        </Button>
      </div>

      <Dialog open={editingBudget} onOpenChange={setEditingBudget}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[24px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Set monthly budget</DialogTitle>
            <DialogDescription>
              Choose a spending limit for {MONTHS[selectedMonth - 1]?.label} {selectedYear}.
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
                className="h-12 pl-9 text-base"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="h-11 flex-1" onClick={() => setEditingBudget(false)}>
              Cancel
            </Button>
            <Button
              className="h-11 flex-1"
              disabled={!budgetDraft || Number(budgetDraft) < 0 || setBudget.isPending}
              onClick={() => {
                const amount = Number.parseInt(budgetDraft, 10);
                if (Number.isNaN(amount) || amount < 0) return;
                setBudget.mutate(amount, { onSuccess: () => setEditingBudget(false) });
              }}
            >
              {setBudget.isPending ? "Saving…" : "Save budget"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addPickerOpen}
        onOpenChange={(open) => {
          setAddPickerOpen(open);
          if (!open) setAddPickerCategory(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-24px)] overflow-hidden rounded-[24px] p-0 sm:max-w-sm">
          <DialogHeader className="px-5 pb-0 pt-5">
            <DialogTitle className="flex items-center gap-2">
              {addPickerCategory && (
                <button
                  type="button"
                  className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setAddPickerCategory(null)}
                  aria-label="Back to categories"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {addPickerCategory ? `Choose ${CATEGORY_META[addPickerCategory].shortLabel}` : "Add an expense"}
            </DialogTitle>
            <DialogDescription>
              {addPickerCategory ? "Choose a shortcut or add a custom entry." : "What kind of expense are you recording?"}
            </DialogDescription>
          </DialogHeader>

          {!addPickerCategory ? (
            <div className="grid grid-cols-2 gap-2.5 px-5 pb-5 pt-3">
              {categoryData.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.category}
                    type="button"
                    className="flex min-h-[92px] flex-col items-start justify-between rounded-2xl border bg-card p-3 text-left hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => chooseAddCategory(item.category)}
                  >
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.surfaceTone, item.iconTone)}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-sm font-bold">{item.label}</span>
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
                        className="flex h-[92px] min-w-[128px] snap-start flex-col items-start justify-between rounded-2xl bg-amber-50 p-3 text-left text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-amber-950/30 dark:text-amber-100"
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
                        <Icon className="h-5 w-5" />
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
                        className="flex h-[92px] min-w-[128px] snap-start flex-col items-start justify-between rounded-2xl bg-sky-50 p-3 text-left text-sky-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-sky-950/30 dark:text-sky-100"
                        onClick={() =>
                          openQuickAdd({
                            category: "utility",
                            subcategory: preset.key,
                            label: preset.key,
                            title: `Add ${preset.key}`,
                          })
                        }
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-bold">{preset.key}</span>
                      </button>
                    );
                  })}
              </div>
              <div className="px-5">
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl"
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

      <Dialog open={isFloorsConfigOpen} onOpenChange={setIsFloorsConfigOpen}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[24px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configure current-bill floors</DialogTitle>
            <DialogDescription>
              These shortcuts help you record electricity bills faster.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="num-floors">Number of floors</Label>
              <Input
                id="num-floors"
                className="h-11"
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
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3"
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
            <Button variant="outline" className="h-11 flex-1" onClick={() => setIsFloorsConfigOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-11 flex-1"
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
              Spending insights
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
