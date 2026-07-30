import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Coffee,
  Droplet,
  Drumstick,
  Egg,
  Flame,
  History,
  Home,
  IndianRupee,
  Milk,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  WalletCards,
  Zap,
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

type DashboardTab = "plan" | "ledger";

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
    accent: string;
    iconSurface: string;
    segment: string;
  }
> = {
  current: {
    label: "Current bills",
    shortLabel: "Current",
    description: "Floor and motor electricity",
    icon: Zap,
    accent: "text-[#b35b00] dark:text-[#ffb86b]",
    iconSurface: "bg-[#fff0d8] dark:bg-[#412a12]",
    segment: "bg-[#f59e0b]",
  },
  utility: {
    label: "Utilities",
    shortLabel: "Utilities",
    description: "Water, food and operations",
    icon: Droplet,
    accent: "text-[#006f8b] dark:text-[#78d8ef]",
    iconSurface: "bg-[#e1f6fb] dark:bg-[#12333b]",
    segment: "bg-[#0ea5c6]",
  },
  other: {
    label: "Other bills",
    shortLabel: "Other",
    description: "Maintenance and one-off costs",
    icon: Receipt,
    accent: "text-[#6546b3] dark:text-[#b9a4ff]",
    iconSurface: "bg-[#eee9ff] dark:bg-[#2b2348]",
    segment: "bg-[#7c5ce0]",
  },
  family: {
    label: "Family expenses",
    shortLabel: "Family",
    description: "Personal and household spend",
    icon: Home,
    accent: "text-[#a43d61] dark:text-[#ff9fbe]",
    iconSurface: "bg-[#ffe8ef] dark:bg-[#43202d]",
    segment: "bg-[#e45b87]",
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

  const [activeTab, setActiveTab] = useState<DashboardTab>("plan");
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
  const availableLabel = !hasBudget
    ? "Set your monthly spending limit"
    : remaining < 0
      ? `${formatCurrency(Math.abs(remaining))} over budget`
      : `${formatCurrency(remaining)} available`;
  const averageEntry = entries.length > 0 ? grandTotal / entries.length : 0;
  const recentEntries = entries.slice(0, 4);
  const isLoading = expenseQuery.isLoading || budgetQuery.isLoading;
  const isError = expenseQuery.isError || budgetQuery.isError;

  const openFloorSettings = () => {
    setTempNumFloors(String(numFloors));
    setTempIncludeGround(includeGround);
    setIsFloorsConfigOpen(true);
  };

  const openCategory = (category: ExpenseCategory) => {
    setSheetState({ title: CATEGORY_META[category].label, category });
  };

  const openQuickAdd = (initial: QuickExpenseInitial) => {
    setAddPickerOpen(false);
    setAddPickerCategory(null);
    setShortcutsOpen(false);
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
        className="bills-ledger-shell flex h-full min-h-0 flex-col gap-2.5 px-3 pt-3"
        style={{ paddingBottom: "calc(var(--bottom-nav-offset, 0px) + 12px)" }}
      >
        <Skeleton className="h-[176px] shrink-0 rounded-[22px]" />
        <Skeleton className="h-12 shrink-0 rounded-2xl" />
        <Skeleton className="min-h-0 flex-1 rounded-[22px]" />
        <Skeleton className="h-[52px] shrink-0 rounded-2xl" />
        <span className="sr-only">Loading bills and budget</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f4f4ef] px-5 dark:bg-[#101114]">
        <div className="w-full max-w-sm rounded-[24px] border border-[#deded5] bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-[#181a1f]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffe5e7] text-[#b4232d] dark:bg-[#461d22] dark:text-[#ff9ca5]">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-black">Bills are temporarily unavailable</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Your saved entries are safe. Check your connection and try once more.
          </p>
          <Button className="mt-5 h-12 w-full rounded-2xl bg-[#1d4ed8] text-white hover:bg-[#1e40af]" onClick={retryQueries}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reload dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="bills-ledger-shell flex h-full min-h-0 flex-col gap-2.5 bg-[#f4f4ef] px-3 pt-3 dark:bg-[#101114]"
        style={{ paddingBottom: "calc(var(--bottom-nav-offset, 0px) + 12px)" }}
      >
        <section className="bills-ledger-summary shrink-0 rounded-[22px] border border-[#dcdcd3] bg-[#fffef9] p-3.5 shadow-[0_14px_30px_-24px_rgba(19,28,45,0.55)] dark:border-white/10 dark:bg-[#181a1f]">
          <div className="bills-ledger-summary-top flex min-h-11 items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dbe7ff] text-[#1d4ed8] dark:bg-[#1e3262] dark:text-[#9bb8ff]">
                <CalendarDays className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Budget runway</p>
                <p className="text-sm font-black">{MONTHS[selectedMonth - 1]?.label} {selectedYear}</p>
              </div>
            </div>
            <button
              type="button"
              className="flex min-h-11 items-center gap-2 rounded-full border border-[#d8d8cf] bg-white px-3 text-xs font-bold transition-colors hover:bg-[#f3f3ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              onClick={() => {
                setBudgetDraft(hasBudget ? String(budgetAmount) : "");
                setEditingBudget(true);
              }}
            >
              <Target className="h-4 w-4 text-[#1d4ed8] dark:text-[#9bb8ff]" />
              {hasBudget ? "Edit limit" : "Set limit"}
            </button>
          </div>

          <div className="bills-ledger-balance mt-2 flex min-h-11 items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground">
                {hasBudget ? "Available to spend" : "Monthly plan"}
                <span className="bills-ledger-short-month hidden">
                  {" "}· {MONTHS[selectedMonth - 1]?.short} {selectedYear}
                </span>
              </p>
              <p className={cn(
                "truncate text-[28px] font-black leading-none tracking-[-0.04em]",
                remaining < 0 && hasBudget ? "text-[#c8323c]" : "text-foreground",
              )}>
                {hasBudget ? formatCurrency(Math.abs(remaining)) : formatCurrency(grandTotal)}
              </p>
            </div>
            <div className="bills-ledger-entry-count shrink-0 text-right">
              <p className="text-lg font-black">{hasBudget ? `${Math.round(rawPercentUsed)}%` : `${entries.length}`}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {hasBudget ? "used" : entries.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <button
              type="button"
              className="bills-ledger-short-limit hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d8d8cf] bg-white text-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] dark:border-white/10 dark:bg-white/5 dark:text-[#9bb8ff]"
              onClick={() => {
                setBudgetDraft(hasBudget ? String(budgetAmount) : "");
                setEditingBudget(true);
              }}
              aria-label={hasBudget ? "Edit monthly spending limit" : "Set monthly spending limit"}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3">
            <div className="relative h-2 overflow-hidden rounded-full bg-[#e7e7de] dark:bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700",
                  rawPercentUsed >= 100 ? "bg-[#d73a45]" : rawPercentUsed >= 75 ? "bg-[#e88916]" : "bg-[#1d4ed8]",
                )}
                style={{ width: `${hasBudget ? Math.max(percentUsed, grandTotal > 0 ? 2 : 0) : 0}%` }}
              />
              {hasBudget && rawPercentUsed < 100 && (
                <span
                  className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-[#b8ef67] shadow-[0_0_0_2px_#fffef9]"
                  style={{ left: `calc(${Math.max(percentUsed, 1)}% - 2px)` }}
                />
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px]">
              <span className={cn("font-bold", remaining < 0 && hasBudget ? "text-[#c8323c]" : "text-muted-foreground")}>
                {availableLabel}
              </span>
              <span className="font-semibold text-muted-foreground">
                {hasBudget ? formatCurrency(budgetAmount) : "No limit"}
              </span>
            </div>
          </div>

          <div className="bills-ledger-metrics mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Spent", value: formatCurrency(grandTotal) },
              { label: "Average bill", value: formatCurrency(averageEntry) },
              { label: "Recorded", value: `${entries.length} ${entries.length === 1 ? "bill" : "bills"}` },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl bg-[#f1f1ea] px-2.5 py-2 dark:bg-white/[0.055]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                <p className="mt-0.5 truncate text-xs font-black">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div
          className="grid h-[52px] shrink-0 grid-cols-2 rounded-2xl border border-[#dcdcd3] bg-[#e9e9e2] p-1 dark:border-white/10 dark:bg-[#1b1d22]"
          role="tablist"
          aria-label="Bills dashboard views"
        >
          {([
            { value: "plan" as const, label: "Plan", icon: WalletCards },
            { value: "ledger" as const, label: "Ledger", icon: History },
          ]).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8]",
                  activeTab === tab.value
                    ? "bg-[#fffef9] text-foreground shadow-sm dark:bg-[#292c33]"
                    : "text-muted-foreground",
                )}
                onClick={() => setActiveTab(tab.value)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.value === "ledger" && entries.length > 0 && (
                  <span className="rounded-full bg-[#dbe7ff] px-1.5 py-0.5 text-[9px] text-[#1d4ed8] dark:bg-[#1e3262] dark:text-[#b8caff]">
                    {entries.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1">
          {activeTab === "plan" ? (
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#dcdcd3] bg-[#fffef9] dark:border-white/10 dark:bg-[#181a1f]">
              <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#e6e6de] px-3.5 dark:border-white/10">
                <div>
                  <p className="text-sm font-black">Spending plan</p>
                  <p className="text-[10px] text-muted-foreground">Tap a category for its ledger</p>
                </div>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-black text-[#1d4ed8] hover:bg-[#edf2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] dark:text-[#9bb8ff] dark:hover:bg-white/5"
                  onClick={() => setAnalyticsOpen(true)}
                >
                  <BarChart3 className="h-4 w-4" />
                  Insights
                </button>
              </div>

              <div className="flex h-2 shrink-0 overflow-hidden bg-[#ededE6] dark:bg-white/5" aria-label="Category spending mix">
                {categoryData.map((item) => {
                  const share = grandTotal > 0 ? (item.total / grandTotal) * 100 : 25;
                  return (
                    <span
                      key={item.category}
                      className={cn("h-full", item.segment, grandTotal === 0 && "opacity-25")}
                      style={{ width: `${share}%` }}
                    />
                  );
                })}
              </div>

              <div className="flex min-h-0 flex-1 flex-col divide-y divide-[#e9e9e1] dark:divide-white/10">
                {categoryData.map((item) => {
                  const Icon = item.icon;
                  const share = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
                  return (
                    <div key={item.category} className="bills-ledger-row flex min-h-14 flex-1 items-stretch">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 px-3.5 text-left transition-colors hover:bg-[#f5f5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d4ed8] dark:hover:bg-white/[0.04]"
                        onClick={() => openCategory(item.category)}
                        aria-label={`Open ${item.label}, ${formatCurrency(item.total)}, ${item.count} entries`}
                      >
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", item.iconSurface, item.accent)}>
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{item.label}</p>
                          <p className="bills-ledger-description truncate text-[10px] text-muted-foreground">
                            {item.count > 0 ? `${item.count} ${item.count === 1 ? "entry" : "entries"}` : item.description}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black">{formatCurrency(item.total)}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{share}%</p>
                        </div>
                        {item.category !== "current" && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
                      </button>
                      {item.category === "current" && (
                        <button
                          type="button"
                          className="flex w-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-[#f5f5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d4ed8] dark:hover:bg-white/[0.04]"
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
            </section>
          ) : (
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#dcdcd3] bg-[#fffef9] dark:border-white/10 dark:bg-[#181a1f]">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e6e6de] px-3.5 dark:border-white/10">
                <div>
                  <p className="text-sm font-black">Latest entries</p>
                  <p className="text-[10px] text-muted-foreground">{entries.length} recorded this month</p>
                </div>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-black text-[#1d4ed8] hover:bg-[#edf2ff] dark:text-[#9bb8ff] dark:hover:bg-white/5"
                  onClick={() => setAnalyticsOpen(true)}
                >
                  <BarChart3 className="h-4 w-4" />
                  Trends
                </button>
              </div>

              {recentEntries.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef0e9] text-muted-foreground dark:bg-white/[0.06]">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-black">A clean ledger</p>
                  <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">
                    Record the first bill and this space will become your monthly timeline.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col divide-y divide-[#e9e9e1] dark:divide-white/10">
                  {recentEntries.map((entry) => {
                    const meta = CATEGORY_META[entry.category];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className="flex min-h-14 flex-1 items-center gap-3 px-3.5 text-left hover:bg-[#f5f5ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1d4ed8] dark:hover:bg-white/[0.04]"
                        onClick={() => openCategory(entry.category)}
                      >
                        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", meta.iconSurface, meta.accent)}>
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{entry.label}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {meta.shortLabel} · {format(new Date(entry.entry_date), "dd MMM")}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black">{formatCurrency(entry.amount)}</p>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        <Collapsible open={shortcutsOpen} onOpenChange={setShortcutsOpen} className="relative flex h-[52px] shrink-0 gap-2">
          <CollapsibleContent className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-20 overflow-hidden rounded-[22px] border border-[#d5d5cc] bg-[#fffef9] shadow-[0_20px_45px_-20px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-[#1f2127]">
            <div className="flex h-11 items-center justify-between border-b border-[#e5e5dd] px-3.5 dark:border-white/10">
              <p className="text-xs font-black">Quick record</p>
              <p className="text-[10px] font-semibold text-muted-foreground">Swipe for more</p>
            </div>
            <div className="scrollbar-hide flex snap-x gap-2 overflow-x-auto p-3">
              {currentBillPresets.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className="flex h-14 min-w-[116px] snap-start items-center gap-2 rounded-2xl bg-[#fff0d8] px-3 text-left text-[#6b3a00] transition-transform active:scale-95 dark:bg-[#412a12] dark:text-[#ffd39d]"
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
                    <span className="text-xs font-black leading-4">{preset.label}</span>
                  </button>
                );
              })}
              {UTILITY_PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    className="flex h-14 min-w-[116px] snap-start items-center gap-2 rounded-2xl bg-[#e1f6fb] px-3 text-left text-[#00566c] transition-transform active:scale-95 dark:bg-[#12333b] dark:text-[#a9e9f7]"
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
                    <span className="text-xs font-black leading-4">{preset.key}</span>
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-[#d5d5cc] bg-[#fffef9] text-[#1d4ed8] shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8] dark:border-white/10 dark:bg-[#202228] dark:text-[#a8beff]",
                shortcutsOpen && "bg-[#dbe7ff] dark:bg-[#1e3262]",
              )}
              aria-label={shortcutsOpen ? "Close quick shortcuts" : "Open quick shortcuts"}
            >
              <Zap className="h-5 w-5" />
              <ChevronDown className={cn("ml-0.5 h-3 w-3 transition-transform", shortcutsOpen && "rotate-180")} />
            </button>
          </CollapsibleTrigger>

          <Button
            className="h-[52px] flex-1 rounded-2xl bg-[#1d4ed8] text-sm font-black text-white shadow-[0_12px_24px_-16px_rgba(29,78,216,0.9)] hover:bg-[#1e40af]"
            onClick={() => {
              setShortcutsOpen(false);
              setAddPickerCategory(null);
              setAddPickerOpen(true);
            }}
          >
            <Plus className="mr-2 h-5 w-5" />
            Record an expense
          </Button>
        </Collapsible>
      </div>

      <Dialog open={editingBudget} onOpenChange={setEditingBudget}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[24px] sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#dbe7ff] text-[#1d4ed8] dark:bg-[#1e3262] dark:text-[#a8beff]">
              <Target className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Set your spending limit</DialogTitle>
            <DialogDescription className="text-center">
              Create a runway for {MONTHS[selectedMonth - 1]?.label} {selectedYear}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="budget-amount">Monthly limit</Label>
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
                className="h-12 rounded-xl pl-9 text-base font-bold"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[50000, 75000, 100000, 150000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="min-h-11 rounded-xl border text-xs font-black text-muted-foreground hover:bg-muted/50"
                  onClick={() => setBudgetDraft(String(amount))}
                >
                  {amount >= 100000 ? `${amount / 100000}L` : `${amount / 1000}K`}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setEditingBudget(false)}>
              Cancel
            </Button>
            <Button
              className="h-12 flex-1 rounded-xl bg-[#1d4ed8] text-white hover:bg-[#1e40af]"
              disabled={!budgetDraft || Number(budgetDraft) < 0 || setBudget.isPending}
              onClick={() => {
                const amount = Number.parseInt(budgetDraft, 10);
                if (Number.isNaN(amount) || amount < 0) return;
                setBudget.mutate(amount, { onSuccess: () => setEditingBudget(false) });
              }}
            >
              {setBudget.isPending ? "Saving…" : "Save limit"}
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
                  className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8]"
                  onClick={() => setAddPickerCategory(null)}
                  aria-label="Back to categories"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {addPickerCategory ? `Choose ${CATEGORY_META[addPickerCategory].shortLabel}` : "Record an expense"}
            </DialogTitle>
            <DialogDescription>
              {addPickerCategory ? "Use a shortcut or create a custom entry." : "Choose where this expense belongs."}
            </DialogDescription>
          </DialogHeader>

          {!addPickerCategory ? (
            <div className="space-y-2 px-5 pb-5 pt-3">
              {categoryData.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.category}
                    type="button"
                    className="flex min-h-[68px] w-full items-center gap-3 rounded-2xl border bg-card px-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4ed8]"
                    onClick={() => chooseAddCategory(item.category)}
                  >
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]", item.iconSurface, item.accent)}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">{item.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                        className="flex h-[92px] min-w-[128px] snap-start flex-col items-start justify-between rounded-2xl bg-[#fff0d8] p-3 text-left text-[#6b3a00] active:scale-95 dark:bg-[#412a12] dark:text-[#ffd39d]"
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
                        <span className="text-sm font-black">{preset.label}</span>
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
                        className="flex h-[92px] min-w-[128px] snap-start flex-col items-start justify-between rounded-2xl bg-[#e1f6fb] p-3 text-left text-[#00566c] active:scale-95 dark:bg-[#12333b] dark:text-[#a9e9f7]"
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
                        <span className="text-sm font-black">{preset.key}</span>
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
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0d8] text-[#b35b00] dark:bg-[#412a12] dark:text-[#ffb86b]">
              <Building2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Current-bill floors</DialogTitle>
            <DialogDescription className="text-center">
              Choose the floors that should appear in quick record.
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
            <label htmlFor="ground-floor" className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3">
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
              className="h-12 flex-1 rounded-xl bg-[#1d4ed8] text-white hover:bg-[#1e40af]"
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
              Save floors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent side="right" className="flex w-full max-w-full flex-col p-0 [&>button]:hidden sm:max-w-xl">
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
