import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Droplet,
  Inbox,
  IndianRupee,
  Pencil,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Target,
  Trash2,
  UsersRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMonthContext } from "@/contexts/MonthContext";
import { useExpenseEntries, type ExpenseCategory, type ExpenseEntry } from "@/hooks/useExpenseEntries";
import { useMonthlyBudget } from "@/hooks/useMonthlyBudget";
import { useBackGesture } from "@/hooks/useBackGesture";
import { Room } from "@/types";
import { MonthYearPicker } from "./MonthYearPicker";
import { BillsAnalytics } from "./bills/BillsAnalytics";

interface Props {
  rooms?: Room[];
  onClose?: () => void;
}

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  {
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    badge: string;
  }
> = {
  current: {
    label: "Current / Electricity",
    shortLabel: "Current",
    icon: Zap,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/50",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  utility: {
    label: "Utilities (Water, Gas, Food)",
    shortLabel: "Utilities",
    icon: Droplet,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/50",
    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  other: {
    label: "Maintenance & Other",
    shortLabel: "Other",
    icon: Receipt,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  family: {
    label: "Family Expenses",
    shortLabel: "Family",
    icon: UsersRound,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/50",
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
};

const POPULAR_SUGGESTIONS: { label: string; category: ExpenseCategory }[] = [
  { label: "Electricity Bill", category: "current" },
  { label: "Motor Bill", category: "current" },
  { label: "Water Tanker", category: "utility" },
  { label: "Gas Cylinder", category: "utility" },
  { label: "Groceries", category: "utility" },
  { label: "Milk & Curd", category: "utility" },
  { label: "Plumber / Repairs", category: "other" },
  { label: "WiFi / Internet", category: "other" },
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
  const { entries, byCategory, totalFor, grandTotal, addEntry, updateEntry, deleteEntry, isLoading } =
    useExpenseEntries(selectedMonth, selectedYear);
  const { amount: budgetAmount, setBudget } = useMonthlyBudget(selectedMonth, selectedYear);

  // Simple tabs: "bills" (default) or "analysis"
  const [activeTab, setActiveTab] = useState<"bills" | "analysis">("bills");

  // Filters & Search
  const [selectedFilter, setSelectedFilter] = useState<"all" | ExpenseCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<ExpenseEntry | null>(null);

  // Simple Form State for Add / Edit
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("utility");
  const [formLabel, setFormLabel] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [formNotes, setFormNotes] = useState("");

  useBackGesture(billModalOpen, () => setBillModalOpen(false));
  useBackGesture(budgetModalOpen, () => setBudgetModalOpen(false));

  const monthLabel = format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy");
  const hasBudget = budgetAmount > 0;
  const percentUsed = hasBudget ? Math.min(100, Math.round((grandTotal / budgetAmount) * 100)) : 0;
  const remaining = budgetAmount - grandTotal;

  // Filtered bills list
  const filteredBills = useMemo(() => {
    let list = entries;
    if (selectedFilter !== "all") {
      list = list.filter((e) => e.category === selectedFilter);
    }
    if (searchQuery.trim()) {
      list = list.filter((e) =>
        fuzzyMatch(searchQuery, `${e.label} ${e.notes ?? ""} ${e.amount} ${format(new Date(e.entry_date), "dd MMM yyyy")}`)
      );
    }
    // Sort newest first
    return [...list].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
  }, [entries, selectedFilter, searchQuery]);

  const openAddModal = (defaultCat?: ExpenseCategory, defaultLabel?: string) => {
    setEditingEntry(null);
    setFormCategory(defaultCat || (selectedFilter !== "all" ? selectedFilter : "utility"));
    setFormLabel(defaultLabel || "");
    setFormAmount("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormNotes("");
    setBillModalOpen(true);
  };

  const openEditModal = (entry: ExpenseEntry) => {
    setEditingEntry(entry);
    setFormCategory(entry.category);
    setFormLabel(entry.label);
    setFormAmount(String(entry.amount));
    setFormDate(entry.entry_date || format(new Date(), "yyyy-MM-dd"));
    setFormNotes(entry.notes || "");
    setBillModalOpen(true);
  };

  const handleSaveBill = () => {
    const amt = parseInt(formAmount, 10);
    if (!formLabel.trim() || !amt || amt <= 0) return;

    if (editingEntry) {
      updateEntry.mutate({
        id: editingEntry.id,
        category: formCategory,
        label: formLabel.trim(),
        amount: amt,
        entry_date: formDate,
        notes: formNotes.trim() || null,
      });
    } else {
      addEntry.mutate({
        category: formCategory,
        subcategory: formCategory === "utility" ? formLabel.trim() : null,
        label: formLabel.trim(),
        amount: amt,
        entry_date: formDate,
        notes: formNotes.trim() || null,
        month: selectedMonth,
        year: selectedYear,
      });
    }
    setBillModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-background p-4 space-y-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="flex-1 rounded-2xl" />
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
              <h1 className="text-lg font-black tracking-tight text-foreground">Bills &amp; Expenses</h1>
              <p className="text-[11px] font-semibold text-muted-foreground leading-none">{monthLabel}</p>
            </div>
          </div>
          <MonthYearPicker />
        </header>

        {/* Simple Section Tabs: Bills (Default) vs Analysis */}
        <div className="mt-2 mb-3 grid grid-cols-2 rounded-2xl border border-border/60 bg-muted/40 p-1 dark:bg-muted/20">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-black transition-all",
              activeTab === "bills"
                ? "bg-white text-foreground shadow-xs dark:bg-card dark:text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("bills")}
          >
            <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Bills</span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
              {entries.length}
            </span>
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-black transition-all",
              activeTab === "analysis"
                ? "bg-white text-foreground shadow-xs dark:bg-card dark:text-white"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("analysis")}
          >
            <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Analysis</span>
          </button>
        </div>

        {/* SECTION 1: BILLS (DEFAULT VIEW - SHOWS ALL AMOUNTS DIRECTLY) */}
        {activeTab === "bills" && (
          <div className="space-y-3">
            {/* Simple Summary & Budget Card */}
            <div className="relative overflow-hidden rounded-[22px] border border-border/80 bg-white p-4 shadow-xs dark:bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Bills Spent</span>
                  <div className="mt-1 text-3xl font-black text-foreground tracking-tight">
                    {formatCurrency(grandTotal)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {hasBudget ? (
                      <span>
                        Budget: <strong className="text-foreground">{formatCurrency(budgetAmount)}</strong> ({remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`})
                      </span>
                    ) : (
                      "No budget limit set"
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl text-xs font-bold shrink-0"
                  onClick={() => {
                    setBudgetInput(hasBudget ? String(budgetAmount) : "");
                    setBudgetModalOpen(true);
                  }}
                >
                  <Target className="h-3.5 w-3.5 text-indigo-600" />
                  {hasBudget ? "Edit Budget" : "Set Budget"}
                </Button>
              </div>

              {/* Progress bar if budget is set */}
              {hasBudget && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-bold mb-1">
                    <span>{percentUsed}% spent</span>
                    <span className={remaining < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {remaining < 0 ? "Over Limit" : "On Track"}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all", remaining < 0 ? "bg-rose-500" : "bg-indigo-600")}
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Category Filters (Shows Amounts Directly) */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                  selectedFilter === "all"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-white text-muted-foreground hover:text-foreground dark:bg-card"
                )}
              >
                <span>All</span>
                <span className="font-extrabold">{formatCurrency(grandTotal)}</span>
              </button>

              {(["current", "utility", "other", "family"] as ExpenseCategory[]).map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg.icon;
                const total = totalFor(cat);
                const isSelected = selectedFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedFilter(cat)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all",
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                        : "border-border bg-white text-foreground hover:bg-muted/50 dark:bg-card"
                    )}
                  >
                    <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-white" : cfg.color)} />
                    <span>{cfg.shortLabel}</span>
                    <span className={cn("font-black", isSelected ? "text-white" : "text-muted-foreground")}>
                      {formatCurrency(total)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Bar & Add Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-xs font-medium outline-none focus:border-indigo-600 dark:bg-card dark:text-white"
                />
              </div>
              <Button
                className="h-10 gap-1 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shrink-0"
                onClick={() => openAddModal()}
              >
                <Plus className="h-4 w-4" /> Add Bill
              </Button>
            </div>

            {/* THE BILLS LIST - SHOWS ALL AMOUNTS DIRECTLY */}
            {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white py-12 text-center dark:bg-card">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-black text-foreground">No bills found</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">
                  {searchQuery.trim() ? "No bills match your search." : "Record your first expense for this month."}
                </p>
                <Button
                  size="sm"
                  className="mt-3 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
                  onClick={() => openAddModal()}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Bill
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBills.map((bill) => {
                  const cfg = CATEGORY_CONFIG[bill.category] || CATEGORY_CONFIG.other;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-white p-3 shadow-2xs transition-all hover:border-indigo-600/40 dark:bg-card"
                    >
                      {/* Category Icon */}
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cfg.bg, cfg.color)}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Bill Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="truncate text-sm font-black text-foreground">{bill.label}</h4>
                          <span className={cn("shrink-0 rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase", cfg.badge)}>
                            {cfg.shortLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span>{format(new Date(bill.entry_date), "dd MMM yyyy")}</span>
                          {bill.notes && (
                            <>
                              <span>·</span>
                              <span className="truncate italic max-w-[140px] sm:max-w-[220px]">{bill.notes}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-black text-foreground sm:text-lg">
                          {formatCurrency(bill.amount)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40"
                            onClick={() => openEditModal(bill)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                            onClick={() => setDeleteCandidate(bill)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: ANALYSIS (EMBEDDED DIRECTLY) */}
        {activeTab === "analysis" && (
          <div className="rounded-2xl border border-border/80 bg-white p-3 shadow-2xs dark:bg-card sm:p-4">
            <BillsAnalytics />
          </div>
        )}
      </div>

      {/* Simple Add / Edit Bill Dialog */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent className="max-w-[calc(100%-24px)] rounded-[24px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              {editingEntry ? "Edit Bill" : "Add Bill"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record an expense for {monthLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Category Selector (4 buttons) */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground mb-1.5 block">Category</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(["current", "utility", "other", "family"] as ExpenseCategory[]).map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const Icon = cfg.icon;
                  const isSelected = formCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-2 text-xs font-bold transition-all text-left",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-500"
                          : "border-border bg-white text-muted-foreground hover:bg-muted/40 dark:bg-card"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground")} />
                      <span className="truncate">{cfg.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Suggestions Chips */}
            {!editingEntry && (
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-1 block">Quick Suggestions</Label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() => {
                        setFormLabel(sug.label);
                        setFormCategory(sug.category);
                      }}
                      className={cn(
                        "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all",
                        formLabel === sug.label
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-border bg-white text-foreground hover:bg-muted dark:bg-card"
                      )}
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bill Name Input */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground">Bill Name / Item *</Label>
              <Input
                placeholder="e.g. Water Tanker, Floor 1 Electricity, Groceries"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                className="mt-1 h-11 rounded-xl font-bold"
                autoFocus={!editingEntry}
              />
            </div>

            {/* Amount & Date in 2 columns */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-bold text-muted-foreground">Amount (₹) *</Label>
                <div className="relative mt-1">
                  <IndianRupee className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-11 rounded-xl pl-8 font-black text-base"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground">Date</Label>
                <div className="relative mt-1">
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="h-11 rounded-xl font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground">Notes (Optional)</Label>
              <Input
                placeholder="e.g. Paid via cash to driver"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="mt-1 h-10 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex-row gap-2 pt-2">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-xl font-bold"
              onClick={() => setBillModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700"
              disabled={!formLabel.trim() || !formAmount || parseInt(formAmount, 10) <= 0}
              onClick={handleSaveBill}
            >
              {editingEntry ? "Update Bill" : "Save Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Monthly Budget Modal */}
      <Dialog open={budgetModalOpen} onOpenChange={setBudgetModalOpen}>
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
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="h-12 rounded-xl pl-9 text-lg font-black"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[30000, 50000, 75000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBudgetInput(String(amt))}
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
              onClick={() => setBudgetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-11 flex-1 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700"
              onClick={() => {
                const amt = parseInt(budgetInput, 10);
                if (!isNaN(amt) && amt >= 0) {
                  setBudget.mutate(amt, { onSuccess: () => setBudgetModalOpen(false) });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteCandidate)} onOpenChange={(o) => !o && setDeleteCandidate(null)}>
        <AlertDialogContent className="rounded-[24px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Delete Bill?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to delete {deleteCandidate?.label} ({deleteCandidate ? formatCurrency(deleteCandidate.amount) : ""})? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCandidate) {
                  deleteEntry.mutate(deleteCandidate.id);
                  setDeleteCandidate(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
