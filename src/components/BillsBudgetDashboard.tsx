import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  BarChart3,
  Coffee,
  Droplet,
  Drumstick,
  Egg,
  Flame,
  IndianRupee,
  Milk,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  UsersRound,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useExpenseEntries, type ExpenseCategory, type ExpenseEntry } from "@/hooks/useExpenseEntries";
import { useMonthlyBudget } from "@/hooks/useMonthlyBudget";
import { useBackGesture } from "@/hooks/useBackGesture";
import { Room } from "@/types";
import { MonthYearPicker } from "./MonthYearPicker";
import { QuickExpenseDialog, type QuickExpenseInitial } from "./bills/QuickExpenseDialog";
import { BillsEntriesSheet } from "./bills/BillsEntriesSheet";
import { BillsAnalytics } from "./bills/BillsAnalytics";

interface Props {
  rooms?: Room[];
  onClose?: () => void;
}

export interface BillItemDefinition {
  key: string;
  label: string;
  category: ExpenseCategory;
  icon: React.ElementType;
  tone: string;
  matchFn: (entry: ExpenseEntry) => boolean;
}

const PRESET_BILL_ITEMS: BillItemDefinition[] = [
  {
    key: "Current Bill",
    label: "Current Bill",
    category: "current",
    icon: Zap,
    tone: "bg-[#f1efff] text-[#4932e7] dark:bg-[#302858] dark:text-[#b6a2ff]",
    matchFn: (entry) => entry.category === "current" || entry.subcategory === "Current Bill" || entry.label === "Current Bill",
  },
  {
    key: "Water Tank",
    label: "Water Tank",
    category: "utility",
    icon: Droplet,
    tone: "bg-[#edf3ff] text-[#2670e8] dark:bg-[#17345c] dark:text-[#78b4ff]",
    matchFn: (entry) => entry.subcategory === "Water Tank" || entry.label.toLowerCase().includes("water tank"),
  },
  {
    key: "Gas Cylinder",
    label: "Gas Cylinder",
    category: "utility",
    icon: Flame,
    tone: "bg-[#fff0eb] text-[#f05c3c] dark:bg-[#4b2927] dark:text-[#ff9b83]",
    matchFn: (entry) => entry.subcategory === "Gas Cylinder" || entry.label.toLowerCase().includes("gas"),
  },
  {
    key: "Water Can",
    label: "Water Can",
    category: "utility",
    icon: Coffee,
    tone: "bg-[#eafafd] text-[#0ea5b7] dark:bg-[#173b49] dark:text-[#69d8e7]",
    matchFn: (entry) => entry.subcategory === "Water Can" || entry.label.toLowerCase().includes("water can"),
  },
  {
    key: "Milk & Curd",
    label: "Milk & Curd",
    category: "utility",
    icon: Milk,
    tone: "bg-[#eef4ff] text-[#2670e8] dark:bg-[#17345c] dark:text-[#78b4ff]",
    matchFn: (entry) => entry.subcategory === "Milk & Curd" || entry.label.toLowerCase().includes("milk") || entry.label.toLowerCase().includes("curd"),
  },
  {
    key: "Rice Bags",
    label: "Rice Bags",
    category: "utility",
    icon: ShoppingBag,
    tone: "bg-[#edf9f0] text-[#159447] dark:bg-[#173b2b] dark:text-[#69d48f]",
    matchFn: (entry) => entry.subcategory === "Rice Bags" || entry.label.toLowerCase().includes("rice"),
  },
  {
    key: "Palm Oil",
    label: "Palm Oil",
    category: "utility",
    icon: Droplet,
    tone: "bg-[#fff7e8] text-[#d99000] dark:bg-[#49391c] dark:text-[#f6c45f]",
    matchFn: (entry) => entry.subcategory === "Palm Oil" || entry.label.toLowerCase().includes("oil"),
  },
  {
    key: "Chicken",
    label: "Chicken",
    category: "utility",
    icon: Drumstick,
    tone: "bg-[#fff0f4] text-[#ee4770] dark:bg-[#4a2534] dark:text-[#ff8dac]",
    matchFn: (entry) => entry.subcategory === "Chicken" || entry.label.toLowerCase().includes("chicken"),
  },
  {
    key: "Eggs",
    label: "Eggs",
    category: "utility",
    icon: Egg,
    tone: "bg-[#f3efff] text-[#6f45dd] dark:bg-[#302858] dark:text-[#b6a2ff]",
    matchFn: (entry) => entry.subcategory === "Eggs" || entry.label.toLowerCase().includes("egg"),
  },
  {
    key: "Maintenance & Repairs",
    label: "Maintenance & Repairs",
    category: "other",
    icon: Wrench,
    tone: "bg-[#f3f4f6] text-[#4b5563] dark:bg-[#374151] dark:text-[#d1d5db]",
    matchFn: (entry) => entry.category === "other" && !PRESET_BILL_ITEMS.slice(0, 9).some((p) => p.matchFn(entry)),
  },
  {
    key: "Family Expenses",
    label: "Family Expenses",
    category: "family",
    icon: UsersRound,
    tone: "bg-[#f5f0ff] text-[#5737d8] dark:bg-[#332851] dark:text-[#bea7ff]",
    matchFn: (entry) => entry.category === "family",
  },
];

export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!q) return true;
  if (t.includes(q)) return true;
  const qWords = q.split(/\s+/).filter(Boolean);
  return qWords.every((w) => t.includes(w));
}

const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`;

export const BillsBudgetDashboard = ({ onClose }: Props) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { entries, grandTotal, addEntry, updateEntry, deleteEntry, isLoading } =
    useExpenseEntries(selectedMonth, selectedYear);
  const { amount: budgetAmount, setBudget } = useMonthlyBudget(selectedMonth, selectedYear);

  // Analytics sheet open state (accessed via button at top right)
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [quickAdd, setQuickAdd] = useState<QuickExpenseInitial | null>(null);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [sheetState, setSheetState] = useState<{
    title: string;
    category: ExpenseCategory;
    subcategory?: string | null;
    defaultLabel?: string;
    isAll?: boolean;
  } | null>(null);

  useBackGesture(Boolean(quickAdd), () => setQuickAdd(null));
  useBackGesture(budgetDialogOpen, () => setBudgetDialogOpen(false));
  useBackGesture(Boolean(sheetState), () => setSheetState(null));
  useBackGesture(analyticsOpen, () => setAnalyticsOpen(false));

  // Dynamically derive entries for the currently open sheet so deletions and updates reflect immediately
  const currentSheetEntries = useMemo(() => {
    if (!sheetState) return [];
    if (sheetState.isAll) return entries;
    const preset = PRESET_BILL_ITEMS.find((p) => p.label === sheetState.title);
    if (preset) return entries.filter(preset.matchFn);
    return entries.filter((e) => e.label === sheetState.title);
  }, [sheetState, entries]);

  const monthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy");
  const hasBudget = budgetAmount > 0;
  const percentUsed = hasBudget ? Math.min(100, Math.round((grandTotal / budgetAmount) * 100)) : 0;
  const remaining = budgetAmount - grandTotal;

  // Build the list of bill cards (preset items + any custom items)
  const billCards = useMemo(() => {
    // 1. Calculate totals and matching entries for presets
    const cards = PRESET_BILL_ITEMS.map((preset) => {
      const matchingEntries = entries.filter(preset.matchFn);
      const total = matchingEntries.reduce((sum, e) => sum + e.amount, 0);
      return {
        ...preset,
        matchingEntries,
        total,
        isCustom: false,
      };
    });

    // 2. Identify any custom entries that don't match any preset
    const presetMatchedIds = new Set(cards.flatMap((c) => c.matchingEntries.map((e) => e.id)));
    const unhandledCustomEntries = entries.filter((e) => !presetMatchedIds.has(e.id));

    // Group remaining custom entries by their label/subcategory
    const customGroupMap = new Map<string, ExpenseEntry[]>();
    unhandledCustomEntries.forEach((e) => {
      const key = e.label || "Custom Expense";
      const existing = customGroupMap.get(key) || [];
      existing.push(e);
      customGroupMap.set(key, existing);
    });

    const customCards = Array.from(customGroupMap.entries()).map(([label, items]) => ({
      key: `custom-${label}`,
      label,
      category: items[0]?.category || ("other" as ExpenseCategory),
      icon: Receipt,
      tone: "bg-[#f3efff] text-[#5d3ed4] dark:bg-[#302858] dark:text-[#b6a2ff]",
      matchFn: (e: ExpenseEntry) => e.label === label,
      matchingEntries: items,
      total: items.reduce((sum, e) => sum + e.amount, 0),
      isCustom: true,
    }));

    const allCards = [...cards, ...customCards];

    // Filter by search query if any
    if (searchQuery.trim()) {
      return allCards.filter((card) =>
        fuzzyMatch(searchQuery, `${card.label} ${card.total} ${card.matchingEntries.map((e) => e.notes || "").join(" ")}`)
      );
    }

    return allCards;
  }, [entries, searchQuery]);

  // Open the ledger sheet for a category / item
  const openItemLedger = (card: (typeof billCards)[0]) => {
    setSheetState({
      title: card.label,
      category: card.category,
      subcategory: card.isCustom ? null : card.label,
      defaultLabel: card.label,
      isAll: false,
    });
  };

  // Open "All entries" ledger sheet
  const openAllEntriesLedger = () => {
    setSheetState({
      title: "All Bills — This Month",
      category: "other",
      defaultLabel: "Bill",
      isAll: true,
    });
  };

  // Quick add for a specific bill item
  const handleQuickAdd = (card: (typeof billCards)[0]) => {
    setQuickAdd({
      category: card.category,
      subcategory: card.label,
      label: card.label,
      lockLabel: true,
      title: `Add ${card.label}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-[#f8f9fd] p-4 space-y-3 dark:bg-background">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <div
        className="flex min-h-full flex-col bg-[#f8f9fd] px-3.5 pt-2 dark:bg-background sm:px-5"
        style={{ paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:outline-none"
              onClick={onClose}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-[#101426] dark:text-white">Bills &amp; Budget</h1>
              <p className="text-[11px] font-semibold text-muted-foreground leading-none">{monthLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="flex h-10 items-center gap-1.5 rounded-2xl border border-[#e0e2ea] bg-white px-3 text-xs font-black text-[#101426] shadow-2xs hover:bg-[#fafaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] dark:border-border dark:bg-card dark:text-white dark:hover:bg-white/5"
              onClick={() => setAnalyticsOpen(true)}
              aria-label="Spending Analytics"
              title="Spending Analytics"
            >
              <BarChart3 className="h-4 w-4 text-[#4936ef] dark:text-[#b6a2ff]" />
              <span>Analysis</span>
            </button>
            <MonthYearPicker />
          </div>
        </header>

        {/* Bills Section */}
        <div className="mt-2 space-y-3">
            {/* Top Budget / Total Spent Hero */}
            <div className="flex items-center justify-between rounded-[22px] border border-[#e4e6ee] bg-white p-4 shadow-[0_12px_28px_-26px_rgba(25,30,58,.5)] dark:border-border dark:bg-card">
              <div>
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Bills This Month</span>
                <div className="text-2xl sm:text-3xl font-black text-[#101426] dark:text-white tracking-tight">
                  {formatCurrency(grandTotal)}
                </div>
                <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                  {hasBudget ? (
                    <span>
                      Budget: <strong className="text-foreground">{formatCurrency(budgetAmount)}</strong> ({remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`})
                    </span>
                  ) : (
                    "No monthly budget limit set"
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-xl text-xs font-bold shrink-0 border-[#e0e2ea] dark:border-border"
                onClick={() => {
                  setBudgetDraft(hasBudget ? String(budgetAmount) : "");
                  setBudgetDialogOpen(true);
                }}
              >
                <Target className="h-3.5 w-3.5 text-[#4936ef]" />
                {hasBudget ? "Edit Budget" : "Set Budget"}
              </Button>
            </div>

            {/* Choose a category Header + All Entries Button (From Screenshot) */}
            <div className="flex items-center justify-between px-0.5 pt-1">
              <h2 className="text-base font-black text-[#101426] dark:text-white">Choose a category</h2>
              <button
                type="button"
                className="min-h-8 shrink-0 rounded-xl border border-[#e0e2ea] bg-white px-3 text-xs font-black text-[#4936ef] shadow-2xs hover:bg-[#fafaff] dark:border-border dark:bg-card dark:text-[#b6a2ff]"
                onClick={openAllEntriesLedger}
              >
                All entries
              </button>
            </div>

            {/* Search Input */}
            {entries.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#e0e2ea] bg-white pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#4936ef] dark:border-border dark:bg-card dark:text-white"
                />
              </div>
            )}

            {/* BILLS LIST CARDS IN THE EXACT STYLE OF USER SCREENSHOT */}
            <div className="space-y-2.5">
              {billCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.key}
                    className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-[#e3e5ed] bg-white px-3.5 py-2.5 shadow-[0_12px_28px_-26px_rgba(25,30,58,.55)] transition-all hover:border-[#4936ef]/40 dark:border-border dark:bg-card"
                  >
                    {/* Clickable Card Body: Icon, Label, Total Amount */}
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
                      onClick={() => openItemLedger(card)}
                      title={`Open ${card.label} ledger`}
                    >
                      {/* Left: Category Icon Squircle */}
                      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", card.tone)}>
                        <Icon className="size-5" />
                      </div>

                      {/* Middle: Title */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#101426] dark:text-white">{card.label}</p>
                        {card.matchingEntries.length > 0 && (
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            {card.matchingEntries.length} {card.matchingEntries.length === 1 ? "entry" : "entries"}
                          </p>
                        )}
                      </div>

                      {/* Right: Amount */}
                      <p className="shrink-0 text-sm font-black text-[#101426] dark:text-white mr-2">
                        {formatCurrency(card.total)}
                      </p>
                    </button>

                    {/* Far Right: [ + ] Button */}
                    <button
                      type="button"
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f1efff] text-[#4936ef] transition-all hover:bg-[#e6e2ff] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]"
                      onClick={() => handleQuickAdd(card)}
                      aria-label={`Add ${card.label}`}
                      title={`Add ${card.label}`}
                    >
                      <Plus className="size-4.5 stroke-[2.5]" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom: Dashed "+ Add custom utility bill" Button (Exact style from screenshot) */}
            <button
              type="button"
              className="mt-2 mb-6 flex min-h-[52px] w-full items-center justify-center rounded-[18px] border border-dashed border-[#897aff] bg-white/50 text-sm font-black text-[#4936ef] transition-all hover:bg-[#f1efff] active:scale-[0.99] dark:border-[#7569cc] dark:bg-card/50 dark:text-[#b6a2ff]"
              onClick={() =>
                setQuickAdd({
                  category: "utility",
                  title: "Add custom bill",
                })
              }
            >
              <Plus className="mr-2 h-5 w-5" /> Add custom utility bill
            </button>
          </div>
      </div>

      {/* Spending Analysis Sheet */}
      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent
          side="right"
          className="!w-screen !max-w-none !sm:max-w-none inset-0 flex h-[100dvh] min-h-[100dvh] flex-col border-0 bg-[#f8f9fd] p-0 shadow-none dark:bg-background [&>button]:hidden"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <SheetHeader className="sticky top-0 z-10 shrink-0 border-b bg-white px-3 py-3 dark:bg-card sm:px-4">
            <div className="flex min-h-11 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => setAnalyticsOpen(false)}
                aria-label="Close analytics"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-lg font-black">Spending Analysis</SheetTitle>
                <p className="text-xs font-semibold text-muted-foreground">{monthLabel}</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            <BillsAnalytics />
          </div>
        </SheetContent>
      </Sheet>

      {/* Ledger Sheet when user taps any bill card or "All entries" */}
      {sheetState && (
        <BillsEntriesSheet
          open={Boolean(sheetState)}
          onOpenChange={(open) => !open && setSheetState(null)}
          title={sheetState.title}
          category={sheetState.category}
          subcategory={sheetState.subcategory ?? null}
          defaultLabel={sheetState.defaultLabel}
          entries={currentSheetEntries}
          onSave={(data) => addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear })}
          onUpdate={(id, patch) => updateEntry.mutate({ id, ...patch })}
          onDelete={(id) => deleteEntry.mutate(id)}
          onAddPayment={(selection) =>
            setQuickAdd({
              category: sheetState.category,
              subcategory: sheetState.subcategory,
              label: selection?.label ?? sheetState.defaultLabel,
              lockLabel: !selection,
              suggestedAmount: selection?.amount,
              title: `Add ${sheetState.title}`,
            })
          }
        />
      )}

      {/* Quick Add Expense Entry Dialog */}
      <QuickExpenseDialog
        open={Boolean(quickAdd)}
        onOpenChange={(open) => !open && setQuickAdd(null)}
        initial={quickAdd}
        onSave={(data) => {
          if (quickAdd?.editing) {
            updateEntry.mutate({ id: quickAdd.editing.id, ...data });
          } else {
            addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear });
          }
          setQuickAdd(null);
        }}
      />

      {/* Set Monthly Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[24px] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-black">Monthly Budget</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Set spending limit for {monthLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                inputMode="numeric"
                placeholder="e.g. 50000"
                value={budgetDraft}
                onChange={(e) => setBudgetDraft(e.target.value)}
                className="h-12 rounded-xl pl-9 text-lg font-black"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[30000, 50000, 75000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBudgetDraft(String(amt))}
                  className="rounded-lg border p-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  {amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}K`}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl font-bold"
              onClick={() => setBudgetDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 rounded-xl bg-[#4936ef] font-bold text-white hover:bg-[#3827d7]"
              onClick={() => {
                const amt = parseInt(budgetDraft, 10);
                if (!isNaN(amt) && amt >= 0) {
                  setBudget.mutate(amt, { onSuccess: () => setBudgetDialogOpen(false) });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
