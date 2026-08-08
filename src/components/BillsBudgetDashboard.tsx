import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleGauge,
  Coffee,
  Droplet,
  Drumstick,
  Egg,
  Flame,
  Home,
  Inbox,
  Search,
  IndianRupee,
  ListChecks,
  Milk,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Settings,
  Settings2,
  ShoppingBag,
  Sparkles,
  Target,
  Trash2,
  UsersRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useExpenseEntries, type ExpenseCategory, type ExpenseEntry } from "@/hooks/useExpenseEntries";
import { useMonthlyBudget } from "@/hooks/useMonthlyBudget";
import { useBackGesture } from "@/hooks/useBackGesture";
import { MONTHS } from "@/constants/pricing";
import { Room } from "@/types";
import { MonthYearPicker } from "./MonthYearPicker";
import { QuickExpenseDialog, type QuickExpenseInitial } from "./bills/QuickExpenseDialog";
import { BillsEntriesSheet } from "./bills/BillsEntriesSheet";
import { BillsAnalytics } from "./bills/BillsAnalytics";
import { BillPaymentFlow } from "./bills/BillPaymentFlow";
import type { BillPaymentRequest } from "@/features/bill-payments/types";

interface Props {
  rooms: Room[];
  onClose?: () => void;
}

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
  { key: "Water Tank", icon: Droplet, tone: "bg-[#edf3ff] text-[#2670e8] dark:bg-[#17345c] dark:text-[#78b4ff]" },
  { key: "Gas Cylinder", icon: Flame, tone: "bg-[#fff0eb] text-[#f05c3c] dark:bg-[#4b2927] dark:text-[#ff9b83]" },
  { key: "Water Can", icon: Coffee, tone: "bg-[#eafafd] text-[#0ea5b7] dark:bg-[#173b49] dark:text-[#69d8e7]" },
  { key: "Milk & Curd", icon: Milk, tone: "bg-[#eef4ff] text-[#2670e8] dark:bg-[#17345c] dark:text-[#78b4ff]" },
  { key: "Rice Bags", icon: ShoppingBag, tone: "bg-[#edf9f0] text-[#159447] dark:bg-[#173b2b] dark:text-[#69d48f]" },
  { key: "Palm Oil", icon: Droplet, tone: "bg-[#fff7e8] text-[#d99000] dark:bg-[#49391c] dark:text-[#f6c45f]" },
  { key: "Chicken", icon: Drumstick, tone: "bg-[#fff0f4] text-[#ee4770] dark:bg-[#4a2534] dark:text-[#ff8dac]" },
  { key: "Eggs", icon: Egg, tone: "bg-[#f3efff] text-[#6f45dd] dark:bg-[#302858] dark:text-[#b6a2ff]" },
];

const CATEGORY_META: Record<
  ExpenseCategory,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ElementType;
    iconSurface: string;
    iconColor: string;
    barColor: string;
  }
> = {
  current: {
    label: "Current bills",
    shortLabel: "Current",
    description: "Floor and motor electricity",
    icon: Zap,
    iconSurface: "bg-[#f1efff] dark:bg-[#302858]",
    iconColor: "text-[#4932e7] dark:text-[#b6a2ff]",
    barColor: "bg-[#4936ef]",
  },
  utility: {
    label: "Utilities",
    shortLabel: "Utilities",
    description: "Water, food and operations",
    icon: Droplet,
    iconSurface: "bg-[#edf4ff] dark:bg-[#17345c]",
    iconColor: "text-[#1766d9] dark:text-[#78b4ff]",
    barColor: "bg-[#1aa9d2]",
  },
  other: {
    label: "Other bills",
    shortLabel: "Other",
    description: "Maintenance and one-off costs",
    icon: Receipt,
    iconSurface: "bg-[#f3efff] dark:bg-[#302858]",
    iconColor: "text-[#5d3ed4] dark:text-[#b6a2ff]",
    barColor: "bg-[#32b45d]",
  },
  family: {
    label: "Family expenses",
    shortLabel: "Family",
    description: "Personal and household spend",
    icon: UsersRound,
    iconSurface: "bg-[#f5f0ff] dark:bg-[#332851]",
    iconColor: "text-[#5737d8] dark:text-[#bea7ff]",
    barColor: "bg-[#794ef6]",
  },
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Uint8Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!q) return true;
  if (t.includes(q)) return true;

  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = t.split(/\s+/).filter(Boolean);

  return qWords.every((qw) => {
    if (tWords.some((tw) => tw.includes(qw) || qw.includes(tw))) return true;
    return tWords.some((tw) => {
      const maxDist = qw.length > 5 ? 2 : qw.length > 2 ? 1 : 0;
      return levenshteinDistance(qw, tw) <= maxDist;
    });
  });
}

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const getEntryGroupKey = (entry: ExpenseEntry) => (
  entry.subcategory ?? (entry.category === "utility" ? entry.label : "")
);

export const BillsBudgetDashboard = ({ rooms, onClose }: Props) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const pgId = currentPG?.id;
  const expenseQuery = useExpenseEntries(selectedMonth, selectedYear);
  const budgetQuery = useMonthlyBudget(selectedMonth, selectedYear);
  const { entries, byCategory, totalFor, grandTotal, addEntry, updateEntry, deleteEntry } = expenseQuery;
  const { amount: budgetAmount, setBudget } = budgetQuery;

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [quickAdd, setQuickAdd] = useState<QuickExpenseInitial | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<BillPaymentRequest | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);
  const [detailCategory, setDetailCategory] = useState<ExpenseCategory | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<ExpenseEntry | null>(null);
  const [inlineManageMode, setInlineManageMode] = useState(false);
  const [inlineSearchQuery, setInlineSearchQuery] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [sheetState, setSheetState] = useState<{
    title: string;
    category: ExpenseCategory;
    subcategory?: string | null;
    floor?: number | null;
    defaultLabel?: string;
    lockLabel?: boolean;
  } | null>(null);

  const [numFloors, setNumFloors] = useState(1);
  const [includeGround, setIncludeGround] = useState(false);
  const [isFloorsConfigOpen, setIsFloorsConfigOpen] = useState(false);
  const [tempNumFloors, setTempNumFloors] = useState("1");
  const [tempIncludeGround, setTempIncludeGround] = useState(false);

  useBackGesture(Boolean(detailCategory), () => setDetailCategory(null));
  useBackGesture(editingBudget, () => setEditingBudget(false));
  useBackGesture(addPickerOpen, () => setAddPickerOpen(false));
  useBackGesture(analyticsOpen, () => setAnalyticsOpen(false));
  useBackGesture(isFloorsConfigOpen, () => setIsFloorsConfigOpen(false));

  const storageKey = pgId ? `current_bills_floors_${pgId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNumFloors(parsed.n || 1);
        setIncludeGround(Boolean(parsed.includeGround));
        return;
      } catch {
        // Fall through to room-derived defaults when legacy data cannot be parsed.
      }
    }
    const maxFloorInRooms = rooms.length > 0 ? Math.max(...rooms.map((room) => room.floor)) : 0;
    setNumFloors(maxFloorInRooms || 1);
    setIncludeGround(rooms.some((room) => room.floor === 0));
  }, [storageKey, rooms]);

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
        icon: floor === 0 ? Home : Building2,
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

  const utilityCategoryItems = useMemo(() => {
    const presetKeys = new Set(UTILITY_PRESETS.map((preset) => preset.key));
    const customKeys = Array.from(
      new Set(
        entries
          .filter((entry) => entry.category === "utility")
          .map(getEntryGroupKey)
          .filter((key) => key && !presetKeys.has(key)),
      ),
    );

    return [
      {
        key: "Current Bill",
        icon: Zap,
        tone: "bg-[#f1efff] text-[#4932e7] dark:bg-[#302858] dark:text-[#b6a2ff]",
      },
      ...UTILITY_PRESETS,
      ...customKeys.map((key) => ({
        key,
        icon: Receipt,
        tone: "bg-[#f3efff] text-[#5d3ed4] dark:bg-[#302858] dark:text-[#b6a2ff]",
      })),
    ];
  }, [entries]);

  const categoryData = (Object.keys(CATEGORY_META) as ExpenseCategory[])
    .filter((category) => category !== "current")
    .map((category) => ({
      category,
      total: totalFor(category),
      count: byCategory(category).length,
      ...CATEGORY_META[category],
    }));

  const hasBudget = budgetAmount > 0;
  const rawPercentUsed = hasBudget ? (grandTotal / budgetAmount) * 100 : 0;
  const percentUsed = Math.min(100, rawPercentUsed);
  const remaining = budgetAmount - grandTotal;
  const monthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy");
  const isLoading = expenseQuery.isLoading || budgetQuery.isLoading;
  const isError = expenseQuery.isError || budgetQuery.isError;

  const openFloorSettings = () => {
    setTempNumFloors(String(numFloors));
    setTempIncludeGround(includeGround);
    setIsFloorsConfigOpen(true);
  };

  const openQuickAdd = (initial: QuickExpenseInitial) => {
    setAddPickerOpen(false);
    if (initial.editing) {
      setQuickAdd(initial);
      return;
    }
    const categoryName = initial.subcategory || CATEGORY_META[initial.category].label;
    setPaymentRequest({
      category: initial.category,
      categoryName,
      billCategoryId: `${initial.category}:${initial.subcategory ?? initial.floor ?? "general"}`,
      label: initial.label,
      subcategory: initial.subcategory,
      floor: initial.floor,
      lockLabel: initial.lockLabel,
      suggestedAmount: initial.suggestedAmount,
    });
  };

  const openPresetLedger = (
    category: ExpenseCategory,
    title: string,
    subcategory?: string | null,
    floor?: number | null,
  ) => {
    setSheetState({
      title,
      category,
      subcategory,
      floor,
      defaultLabel: title,
      lockLabel: category === "utility",
    });
  };

  const retryQueries = () => {
    void expenseQuery.refetch();
    void budgetQuery.refetch();
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#f8f9fd] px-3 dark:bg-background sm:px-4">
        <div className="flex h-[76px] shrink-0 items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-20" /></div>
        </div>
        <Skeleton className="h-[184px] shrink-0 rounded-[26px]" />
        <Skeleton className="mt-3 h-[74px] shrink-0 rounded-[22px]" />
        <Skeleton className="mt-5 min-h-0 flex-1 rounded-[22px]" />
        <Skeleton className="mb-3 mt-3 h-[52px] shrink-0 rounded-2xl" />
        <span className="sr-only">Loading bills and budget</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f8f9fd] px-3 dark:bg-background sm:px-4">
        <div className="w-full max-w-sm rounded-[26px] border border-[#e2e4ec] bg-white p-6 text-center shadow-[0_18px_40px_-28px_rgba(31,36,64,.55)] dark:border-border dark:bg-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffe8eb] text-[#b4232d]">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-black">Bills are temporarily unavailable</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Your saved entries are safe. Check your connection and try again.</p>
          <Button className="mt-5 h-12 w-full rounded-2xl bg-[#4735ef] font-bold text-white hover:bg-[#3827d7]" onClick={retryQueries}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reload dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="bills-premium-shell flex min-h-full flex-col bg-[#f8f9fd] px-3 dark:bg-background sm:px-4"
        style={{ paddingBottom: "calc(81px + env(safe-area-inset-bottom, 0px))" }}
      >
        <header className="flex h-[76px] shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#101426] hover:bg-[#eeeff7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] dark:text-white dark:hover:bg-white/5"
              onClick={onClose}
              aria-label="Back"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="truncate text-[20px] font-black tracking-[-0.025em] text-[#101426] dark:text-white">Bills &amp; Budget</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 text-[#101426] hover:bg-[#eeeff7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] dark:border-border dark:text-white dark:hover:bg-white/5"
              onClick={() => setAnalyticsOpen(true)}
              aria-label="Open spending analytics"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <MonthYearPicker />
          </div>
        </header>

        <section className="bills-premium-budget relative shrink-0 overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_82%_18%,rgba(127,108,255,.95),transparent_34%),linear-gradient(135deg,#2018ad_0%,#3126d6_52%,#5138f6_100%)] p-5 text-white shadow-[0_20px_42px_-24px_rgba(51,38,214,.9)]">
          <div className="pointer-events-none absolute -right-14 -top-20 h-60 w-60 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-10 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white/90">Monthly budget</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[38px] font-black leading-none tracking-[-0.045em]">{formatCurrency(grandTotal)}</span>
                  <span className="text-sm font-bold text-white/90">spent</span>
                </div>
                <p className="mt-1 text-sm font-medium text-white/65">
                  {hasBudget ? `of ${formatCurrency(budgetAmount)}` : "No limit set"}
                </p>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={() => {
                  setBudgetDraft(hasBudget ? String(budgetAmount) : "");
                  setEditingBudget(true);
                }}
                aria-label={hasBudget ? "Edit budget" : "Set budget"}
              >
                <Target className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{hasBudget ? `${Math.round(rawPercentUsed)}% used` : "Set a budget to track progress"}</span>
                <span>{hasBudget && remaining < 0 ? "Over limit" : "On track"}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-700", remaining < 0 ? "bg-[#ffb3be]" : "bg-white")}
                  style={{ width: `${hasBudget ? Math.max(percentUsed, grandTotal > 0 ? 2 : 0) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="bills-premium-stats mt-3 grid h-[74px] shrink-0 grid-cols-2 divide-x divide-[#e7e8ef] rounded-[22px] border border-[#e4e6ee] bg-white shadow-[0_14px_32px_-26px_rgba(25,30,58,.65)] dark:divide-border dark:border-border dark:bg-card">
          <div className="flex items-center gap-3 px-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4932e7] dark:bg-[#302858] dark:text-[#b6a2ff]"><Receipt className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-xs text-muted-foreground">Total bills</p><p className="truncate text-lg font-black">{formatCurrency(grandTotal)}</p></div>
          </div>
          <div className="flex items-center gap-3 px-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4932e7] dark:bg-[#302858] dark:text-[#b6a2ff]"><ListChecks className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Entries</p><p className="text-lg font-black">{entries.length}</p></div>
          </div>
        </section>

  <section className="bills-premium-groups mt-2 shrink-0">

  <div className="mb-1 flex items-center justify-between">
  <h2 className="text-[15px] font-black tracking-[-0.015em] text-[#111526] dark:text-white">Spending groups</h2>
            <button type="button" className="h-7 min-h-0 rounded-lg px-2 text-xs font-bold text-[#4936ef] dark:text-[#b6a2ff]" onClick={() => setAnalyticsOpen(true)}>View insights</button>
          </div>
          <div className="divide-y divide-[#e8e9f0] overflow-hidden rounded-[20px] border border-[#e3e5ed] bg-white shadow-[0_12px_28px_-25px_rgba(25,30,58,.7)] dark:divide-border dark:border-border dark:bg-card">
            {categoryData.map((item) => {
              const Icon = item.icon;
              const share = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
              return (
                <button
                  key={item.category}
                  type="button"
                  className="bills-premium-group-row flex min-h-[54px] w-full items-center gap-3 px-3 text-left transition-colors hover:bg-[#fafaff] active:bg-[#f4f2ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4936ef] dark:hover:bg-accent/40 dark:active:bg-accent/60"
                  onClick={() => setDetailCategory(item.category)}
                  aria-label={`Open ${item.label}, ${formatCurrency(item.total)}`}
                >
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", item.iconSurface, item.iconColor)}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-bold text-[#35394c] dark:text-white/80">{item.label}</p>
                      <p className="shrink-0 text-sm font-black">{formatCurrency(item.total)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ececf3] dark:bg-secondary">
                        <div className={cn("h-full rounded-full transition-[width] duration-500", item.barColor)} style={{ width: `${share}%` }} />
                      </div>
                      <span className="w-7 text-right text-[10px] font-bold text-muted-foreground">{share}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>


        <Button
          className="bills-premium-cta mb-3 mt-3 h-[52px] shrink-0 rounded-2xl bg-[linear-gradient(100deg,#3425e4,#563bfb)] text-sm font-black text-white shadow-[0_14px_28px_-18px_rgba(67,48,233,.9)] hover:opacity-95"
          onClick={() => setAddPickerOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" /> Add bill
        </Button>
      </div>

      <Dialog open={editingBudget} onOpenChange={setEditingBudget}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[26px] sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4932e7] dark:bg-[#302858] dark:text-[#b6a2ff]"><Target className="h-6 w-6" /></div>
            <DialogTitle className="text-center">Set monthly budget</DialogTitle>
            <DialogDescription className="text-center">Create a spending limit for {monthLabel}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="budget-amount">Monthly limit</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="budget-amount" type="number" inputMode="numeric" min={0} value={budgetDraft} onChange={(event) => setBudgetDraft(event.target.value)} placeholder="1,00,000" className="h-12 rounded-xl pl-9 text-base font-bold" autoFocus />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[50000, 75000, 100000, 150000].map((amount) => (
                <button key={amount} type="button" className="min-h-11 rounded-xl border text-xs font-black text-muted-foreground hover:bg-muted/50" onClick={() => setBudgetDraft(String(amount))}>
                  {amount >= 100000 ? `${amount / 100000}L` : `${amount / 1000}K`}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setEditingBudget(false)}>Cancel</Button>
            <Button
              className="h-12 flex-1 rounded-xl bg-[#4936ef] text-white hover:bg-[#3827d7]"
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

      <Dialog open={addPickerOpen} onOpenChange={setAddPickerOpen}>
        <DialogContent className="max-w-[calc(100%-24px)] rounded-[26px] p-0 sm:max-w-sm">
          <DialogHeader className="px-5 pb-2 pt-5">
            <DialogTitle>Add a bill</DialogTitle>
            <DialogDescription>Add a bill from Record expense or continue to scan a payment QR.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-5 pb-5">
            {categoryData.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.category}
                  type="button"
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-[18px] border bg-card px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] hover:border-[#4936ef]/40 hover:bg-[#fafaff] dark:hover:bg-accent/40 transition-colors active:scale-[0.99]"
                  onClick={() => {
                    setAddPickerOpen(false);
                    if (item.category === "other" || item.category === "family") {
                      openQuickAdd({ category: item.category, title: `Add ${item.shortLabel.toLowerCase()} expense` });
                    } else {
                      setDetailCategory(item.category);
                    }
                  }}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", item.iconSurface, item.iconColor)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex-1 truncate text-sm font-black">{item.label}</span>
                  <span className="shrink-0 text-sm font-black text-[#4936ef] dark:text-[#b6a2ff]">₹{item.total.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(detailCategory)} onOpenChange={(open) => !open && setDetailCategory(null)}>
        <SheetContent
          key={detailCategory ?? "closed"}
          side="right"
          className="!w-screen !max-w-none !sm:max-w-none inset-0 flex h-[100dvh] min-h-[100dvh] flex-col border-0 bg-[#f8f9fd] p-0 shadow-none dark:bg-background [&>button]:hidden [&>div:last-child]:px-0 [&>div:last-child]:pb-0"
          onInteractOutside={(event) => event.preventDefault()}
        >
          {detailCategory && (
            <>
              <SheetHeader className="shrink-0 border-b border-[#e4e6ee] bg-white px-2 py-2 dark:border-border dark:bg-card">
                <div className="flex min-h-[58px] items-center gap-2">
                  <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#f0f1f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] dark:hover:bg-accent/50" onClick={() => setDetailCategory(null)} aria-label="Back to bills and budget"><ArrowLeft className="h-6 w-6" /></button>
                  <div className="min-w-0 flex-1 text-center">
                    <SheetTitle className="truncate text-lg font-black">{CATEGORY_META[detailCategory].label}</SheetTitle>
                    <p className="text-xs font-semibold text-[#4936ef]">{monthLabel}</p>
                  </div>
                  {detailCategory === "current" ? (
                    <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]" onClick={openFloorSettings} aria-label="Configure floors">
                      <CircleGauge className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="h-11 w-11" aria-hidden="true" />
                  )}
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-1.5" style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
                <nav className="mt-3 grid min-h-[58px] grid-cols-4 rounded-[18px] border border-[#e0e2ea] bg-white p-1 dark:border-border dark:bg-card" aria-label="Bill categories">
                  {(["utility", "other", "family"] as ExpenseCategory[]).map((category) => {
                    const catTotal = totalFor(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        className={cn(
                          "flex flex-col items-center justify-center min-h-12 min-w-0 rounded-[14px] px-1 text-xs font-black py-1 transition-all",
                          detailCategory === category ? "bg-[#4936ef] text-white shadow-sm" : "text-[#4f5467] dark:text-white/70 hover:bg-[#f1efff] dark:hover:bg-[#302858]"
                        )}
                        onClick={() => setDetailCategory(category)}
                      >
                        <span className="block truncate text-[11px] leading-tight">{CATEGORY_META[category].shortLabel}</span>
                        <span className={cn("block text-[10px] font-extrabold truncate mt-0.5", detailCategory === category ? "text-white/90" : "text-[#4936ef] dark:text-[#b6a2ff]")}>
                          ₹{catTotal.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                {detailCategory === "current" ? (
                  <>
                    <div className="mb-2 mt-3 flex min-h-11 items-center justify-between">
                      <h3 className="text-base font-black">Floor meters <span className="text-xs font-bold text-muted-foreground ml-1">({byCategory("current").length} {byCategory("current").length === 1 ? "entry" : "entries"})</span></h3>
                      <button type="button" className="min-h-11 rounded-xl px-2 text-xs font-black text-[#4936ef] dark:text-[#b6a2ff]" onClick={openFloorSettings}>Manage floors</button>
                    </div>
                    <div className="space-y-2.5">
                      {currentBillPresets.map((preset) => {
                        const Icon = preset.icon;
                        const matchingEntries = byCategory("current").filter((entry) => (entry.subcategory ?? "") === preset.subcategory);
                        const hasEntry = matchingEntries.length > 0;
                        const entry = matchingEntries[0];
                        const presetTotal = matchingEntries.reduce((sum, e) => sum + e.amount, 0);
                        return (
                          <div key={preset.key} className="flex min-h-[76px] items-center rounded-[20px] border border-[#e3e5ed] bg-white px-3 shadow-[0_12px_28px_-26px_rgba(25,30,58,.7)] dark:border-border dark:bg-card">
                            <button
                              type="button"
                              className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 text-left"
                              onClick={() => {
                                openPresetLedger("current", preset.label, preset.subcategory, preset.floor);
                              }}
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]"><Icon className="h-5 w-5" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-black">{preset.label}</p>
                                {hasEntry ? (
                                  <p className="text-xs font-semibold text-[#4936ef] dark:text-[#b6a2ff]">
                                    {formatCurrency(presetTotal)} · {format(new Date(entry.entry_date), "dd MMM")}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground">No entry recorded for this month</p>
                                )}
                              </div>
                              {hasEntry ? (
                                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                              ) : null}
                            </button>
                            {!hasEntry && (
                              <button
                                type="button"
                                className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f1efff] text-[#4936ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]"
                                onClick={() => openQuickAdd({ category: "current", subcategory: preset.subcategory, floor: preset.floor, label: `${preset.label} - ${MONTHS[selectedMonth - 1]?.label}`, title: `Add ${preset.label}` })}
                                aria-label={`Add ${preset.label}`}
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Unassigned / Orphaned current entries section if any exist */}
                    {(() => {
                      const unassignedEntries = byCategory("current").filter(
                        (entry) => !currentBillPresets.some((p) => p.subcategory === entry.subcategory)
                      );
                      if (unassignedEntries.length === 0) return null;
                      return (
                        <div className="mt-5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-amber-600 dark:text-amber-400">Other / Unassigned current entries</h3>
                            <span className="text-xs text-muted-foreground">{unassignedEntries.length} {unassignedEntries.length === 1 ? "entry" : "entries"}</span>
                          </div>
                          {unassignedEntries.map((e) => (
                            <div key={e.id} className="flex min-h-[68px] items-center justify-between gap-2 rounded-[20px] border border-amber-200 bg-amber-50/50 p-3.5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
                              <div className="flex-1 min-w-0">
                                <div className="truncate text-sm font-black text-[#101426] dark:text-white">{e.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {format(new Date(e.entry_date), "dd MMM yyyy")}
                                  {e.notes && ` · ${e.notes}`}
                                </div>
                              </div>
                              <div className="font-black text-sm shrink-0 text-[#101426] dark:text-white mr-1">
                                {formatCurrency(e.amount)}
                              </div>
                              {inlineManageMode && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 rounded-xl"
                                    aria-label={`Edit ${e.label}`}
                                    onClick={() => openQuickAdd({ category: "current", editing: e, label: e.label, title: `Edit ${e.label}` })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 shrink-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                                    aria-label={`Delete ${e.label}`}
                                    onClick={() => setConfirmDeleteEntry(e)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {detailCategory === "utility" ? (
                      <>
                        <div className="mb-2 mt-4 flex min-h-11 items-center justify-between gap-2">
                          <h3 className="text-base font-black">Choose a category</h3>
                          <button type="button" className="min-h-11 shrink-0 rounded-xl border border-border px-3 text-xs font-black text-primary hover:bg-accent" onClick={() => openPresetLedger("utility", "Utilities — All entries")}>All entries</button>
                        </div>
                        <div className="space-y-2.5">
                          {utilityCategoryItems.map((preset) => {
                            const Icon = preset.icon;
                            const matchingEntries = byCategory("utility").filter((entry) => getEntryGroupKey(entry) === preset.key);
                            const presetTotal = matchingEntries.reduce((sum, entry) => sum + entry.amount, 0);
                            return (
                              <div key={preset.key} className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-3 shadow-sm">
                                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => openPresetLedger("utility", preset.key, preset.key)}>
                                  <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", preset.tone)}>
                                    <Icon className="size-5" />
                                  </div>
                                  <p className="min-w-0 flex-1 truncate text-sm font-black">{preset.key}</p>
                                  <p className="shrink-0 text-sm font-black">{formatCurrency(presetTotal)}</p>
                                </button>
                                <button
                                  type="button"
                                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                  onClick={() => openQuickAdd({ category: "utility", subcategory: preset.key, label: preset.key, lockLabel: true, title: `Add ${preset.key}` })}
                                  aria-label={`Add ${preset.key}`}
                                >
                                  <Plus className="size-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <button type="button" className="mt-3 mb-6 flex min-h-[54px] w-full items-center justify-center rounded-[18px] border border-dashed border-[#897aff] text-sm font-black text-[#4936ef] dark:border-[#7569cc] dark:text-[#b6a2ff]" onClick={() => openQuickAdd({ category: "utility", title: "Add custom utility bill" })}><Plus className="mr-2 h-5 w-5" /> Add custom utility bill</button>
                      </>
                    ) : (
                      <>
                        <div className="mt-4 mb-3 flex items-center gap-2">
                          <Button
                            className="h-[52px] flex-1 rounded-2xl bg-[linear-gradient(100deg,#3425e4,#563bfb)] text-sm font-black text-white hover:opacity-95 shadow-md"
                            onClick={() => openQuickAdd({ category: detailCategory, title: `Add ${CATEGORY_META[detailCategory].shortLabel.toLowerCase()} bill` })}
                          >
                            <Plus className="mr-2 h-5 w-5" /> Add {CATEGORY_META[detailCategory].shortLabel.toLowerCase()} bill
                          </Button>
                          <Button type="button" variant="outline" className="h-[52px] rounded-2xl px-3 text-xs font-black" onClick={() => openPresetLedger(detailCategory, `${CATEGORY_META[detailCategory].shortLabel} — All entries`)}>All entries</Button>
                        </div>

                        {/* Search bar for other/family */}
                        {byCategory(detailCategory).length > 0 && (
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder={`Search ${CATEGORY_META[detailCategory].shortLabel.toLowerCase()} bills...`}
                              value={inlineSearchQuery}
                              onChange={(e) => setInlineSearchQuery(e.target.value)}
                              className="h-11 w-full rounded-xl border border-[#e0e2ea] bg-white pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#4936ef] focus:ring-1 focus:ring-[#4936ef] dark:border-border dark:bg-card dark:text-white"
                            />
                          </div>
                        )}

                        <div className="mb-2 flex min-h-11 items-center justify-between">
                          <h3 className="text-base font-black">{CATEGORY_META[detailCategory].shortLabel} entries</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {byCategory(detailCategory).filter((e) => fuzzyMatch(inlineSearchQuery, e.label + " " + (e.notes ?? "") + " " + format(new Date(e.entry_date), "dd MMM yyyy"))).length} {byCategory(detailCategory).filter((e) => fuzzyMatch(inlineSearchQuery, e.label + " " + (e.notes ?? "") + " " + format(new Date(e.entry_date), "dd MMM yyyy"))).length === 1 ? "entry" : "entries"}
                            </span>
                            {byCategory(detailCategory).length > 0 && (
                              <button
                                type="button"
                                className={cn(
                                  "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-colors ml-1",
                                  inlineManageMode
                                    ? "bg-[#4936ef] text-white"
                                    : "text-[#4936ef] hover:bg-[#f1efff] dark:text-[#b6a2ff] dark:hover:bg-[#302858]"
                                )}
                                onClick={() => setInlineManageMode((prev) => !prev)}
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                                {inlineManageMode ? "Done" : "Manage"}
                              </button>
                            )}
                          </div>
                        </div>

                        {byCategory(detailCategory).length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 rounded-[20px] border border-dashed border-[#e3e5ed] bg-white text-muted-foreground dark:border-border dark:bg-card">
                            <Inbox className="h-10 w-10 mb-2 opacity-40" />
                            <p className="text-sm font-black text-[#101426] dark:text-white">No {CATEGORY_META[detailCategory].shortLabel.toLowerCase()} bills recorded</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Tap the button above to add one.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {byCategory(detailCategory).filter((e) => fuzzyMatch(inlineSearchQuery, e.label + " " + (e.notes ?? "") + " " + format(new Date(e.entry_date), "dd MMM yyyy"))).map((e) => (
                              <div key={e.id} className="flex min-h-[68px] items-center justify-between gap-2 rounded-[20px] border border-[#e3e5ed] bg-white p-3.5 shadow-sm dark:border-border dark:bg-card">
                                <div className="flex-1 min-w-0">
                                  <div className="truncate text-sm font-black text-[#101426] dark:text-white">{e.label}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {format(new Date(e.entry_date), "dd MMM yyyy")}
                                    {e.notes && ` · ${e.notes}`}
                                  </div>
                                </div>
                                <div className="font-black text-sm shrink-0 text-[#101426] dark:text-white mr-1">
                                  {formatCurrency(e.amount)}
                                </div>
                                {inlineManageMode && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 shrink-0 rounded-xl"
                                      aria-label={`Edit ${e.label}`}
                                      onClick={() => openQuickAdd({ category: detailCategory, editing: e, label: e.label, title: `Edit ${e.label}` })}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 shrink-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                                      aria-label={`Delete ${e.label}`}
                                      onClick={() => setConfirmDeleteEntry(e)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(confirmDeleteEntry)} onOpenChange={(o) => !o && setConfirmDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteEntry?.label} · {confirmDeleteEntry ? formatCurrency(confirmDeleteEntry.amount) : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteEntry) {
                  deleteEntry.mutate(confirmDeleteEntry.id);
                  setConfirmDeleteEntry(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickExpenseDialog
        open={Boolean(quickAdd)}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        initial={quickAdd}
        onSave={(data) => {
          addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear });
          setQuickAdd(null);
        }}
      />

      <BillPaymentFlow open={Boolean(paymentRequest)} request={paymentRequest} onOpenChange={(next) => !next && setPaymentRequest(null)} />

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
          entries={sheetState.subcategory ? byCategory(sheetState.category).filter((entry) => getEntryGroupKey(entry) === sheetState.subcategory) : byCategory(sheetState.category)}
          onSave={(data) => addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear })}
          onUpdate={(id, patch) => updateEntry.mutate({ id, ...patch })}
          onDelete={(id) => deleteEntry.mutate(id)}
          onAddPayment={(selection) => openQuickAdd({ category: sheetState.category, subcategory: sheetState.subcategory, floor: sheetState.floor, label: selection?.label ?? sheetState.defaultLabel, lockLabel: selection ? false : sheetState.lockLabel, suggestedAmount: selection?.amount, title: `Add ${sheetState.title}` })}
        />
      )}

      <Dialog open={isFloorsConfigOpen} onOpenChange={setIsFloorsConfigOpen}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[26px] sm:max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4932e7] dark:bg-[#302858] dark:text-[#b6a2ff]"><Building2 className="h-6 w-6" /></div>
            <DialogTitle className="text-center">Configure floor meters</DialogTitle>
            <DialogDescription className="text-center">Choose which floors appear in current bills.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="num-floors">Number of floors</Label>
              <Input id="num-floors" className="h-12 rounded-xl" type="number" inputMode="numeric" min={1} max={20} value={tempNumFloors} onChange={(event) => setTempNumFloors(event.target.value)} />
              <p className="text-xs text-muted-foreground">Choose between 1 and 20 floors.</p>
            </div>
            <label htmlFor="ground-floor" className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3">
              <Checkbox id="ground-floor" checked={tempIncludeGround} onCheckedChange={(checked) => setTempIncludeGround(Boolean(checked))} />
              <span className="text-sm font-medium">Include ground floor</span>
            </label>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => setIsFloorsConfigOpen(false)}>Cancel</Button>
            <Button
              className="h-12 flex-1 rounded-xl bg-[#4936ef] text-white hover:bg-[#3827d7]"
              onClick={() => {
                const parsed = Number.parseInt(tempNumFloors, 10);
                if (Number.isNaN(parsed) || parsed < 1 || parsed > 20) return;
                setNumFloors(parsed);
                setIncludeGround(tempIncludeGround);
                if (storageKey) localStorage.setItem(storageKey, JSON.stringify({ n: parsed, includeGround: tempIncludeGround }));
                setIsFloorsConfigOpen(false);
              }}
            >
              Save floors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent side="right" className="flex w-full max-w-full flex-col bg-[#f8f9fd] p-0 dark:bg-background [&>button]:hidden [&>div:last-child]:px-0 [&>div:last-child]:pb-0 sm:max-w-xl">
          <SheetHeader className="shrink-0 border-b border-[#e4e6ee] bg-white px-2 py-2 dark:border-border dark:bg-card">
            <div className="flex min-h-[58px] items-center gap-2">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#f0f1f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] dark:hover:bg-accent/50" onClick={() => setAnalyticsOpen(false)} aria-label="Back to bills and budget"><ArrowLeft className="h-6 w-6" /></button>
              <div className="min-w-0 flex-1 text-center"><SheetTitle className="text-lg font-black">Spending analytics</SheetTitle><p className="text-xs font-medium text-muted-foreground">{monthLabel}</p></div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]"><BarChart3 className="h-5 w-5" /></div>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-4"><BillsAnalytics /></div>
        </SheetContent>
      </Sheet>
    </>
  );
};
