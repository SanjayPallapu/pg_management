import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Plus, Inbox, Settings2, Search, CheckSquare, Square } from "lucide-react";
import { format } from "date-fns";
import type { ExpenseCategory, ExpenseEntry } from "@/hooks/useExpenseEntries";
import { QuickExpenseDialog, type QuickExpenseInitial } from "./QuickExpenseDialog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  category: ExpenseCategory;
  subcategory?: string | null;
  floor?: number | null;
  defaultLabel?: string;
  lockLabel?: boolean;
  entries: ExpenseEntry[];
  onSave: (data: Omit<ExpenseEntry, "id" | "pg_id" | "month" | "year">) => void;
  onUpdate: (id: string, patch: Partial<ExpenseEntry>) => void;
  onDelete: (id: string) => void;
  onAddPayment: (selection?: { amount: number; label?: string }) => void;
}

const OTHER_FILTERS = ["All", "Vegetables", "Poori", "Chapati", "Dry Grocery", "Custom"] as const;

export const BillsEntriesSheet = ({
  open, onOpenChange, title, category, subcategory, floor, defaultLabel, lockLabel,
  entries, onSave, onUpdate, onDelete, onAddPayment,
}: Props) => {
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseEntry | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [otherFilter, setOtherFilter] = useState<(typeof OTHER_FILTERS)[number]>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return entries.filter(
      (e) => {
        const matchesKind = category !== "other" || otherFilter === "All" || (
          otherFilter === "Custom"
            ? !OTHER_FILTERS.slice(1, -1).some((label) => label.toLowerCase() === e.label.toLowerCase())
            : e.label.toLowerCase() === otherFilter.toLowerCase()
        );
        const matchesQuery = !query || e.label.toLowerCase().includes(query) ||
          Boolean(e.notes?.toLowerCase().includes(query)) ||
          format(new Date(e.entry_date), "dd MMM yyyy").toLowerCase().includes(query);
        return matchesKind && matchesQuery;
      }
    );
  }, [category, entries, otherFilter, searchQuery]);

  const totalAll = useMemo(() => entries.reduce((s, e) => s + e.amount, 0), [entries]);
  const totalFiltered = useMemo(() => filteredEntries.reduce((s, e) => s + e.amount, 0), [filteredEntries]);
  const selectedEntries = useMemo(() => entries.filter((e) => selectedIds.has(e.id)), [entries, selectedIds]);
  const totalSelected = useMemo(() => selectedEntries.reduce((s, e) => s + e.amount, 0), [selectedEntries]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEntries.length && filteredEntries.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntries.map((e) => e.id)));
    }
  };

  const initial: QuickExpenseInitial | null = editing
      ? { category, subcategory, floor, label: defaultLabel ?? editing.label, editing, lockLabel }
      : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="!w-screen !max-w-none !sm:max-w-none inset-0 flex h-[100dvh] min-h-[100dvh] border-0 bg-[#f8f9fd] p-0 shadow-none dark:bg-background [&>button]:hidden"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <SheetHeader className="sticky top-0 z-10 shrink-0 border-b bg-white px-3 py-2 dark:bg-card sm:px-4">
            <div className="flex min-h-12 items-center gap-2">
              <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={() => onOpenChange(false)} aria-label="Back to bills and budget">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-lg font-black">{title}</SheetTitle>
                <SheetDescription className="truncate text-xs font-semibold text-muted-foreground">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"} · Total ₹{totalAll.toLocaleString()}
                </SheetDescription>
              </div>
              <div className="text-right">
                <span className="block text-xs font-bold text-muted-foreground">Total</span>
                <span className="text-base font-black text-[#4936ef] dark:text-[#b6a2ff]">₹{totalAll.toLocaleString()}</span>
              </div>
            </div>

            {/* Filter Search Bar & Total Selected Card */}
            {entries.length > 0 && (
              <div className="mt-2 space-y-2 pb-1">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search bills, notes, dates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                  </div>
                </div>
                {category === "other" && (
                  <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Filter other bills">
                    {OTHER_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={cn(
                          "min-h-11 shrink-0 rounded-xl border px-3 text-[11px] font-black",
                          otherFilter === filter
                            ? "border-[#4936ef] bg-[#4936ef] text-white"
                            : "border-[#e0e2ea] bg-white text-muted-foreground dark:border-border dark:bg-card"
                        )}
                        onClick={() => setOtherFilter(filter)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 gap-1 rounded-xl text-xs font-bold"
                    onClick={toggleSelectAll}
                  >
                    {selectedIds.size === filteredEntries.length && filteredEntries.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-[#4936ef]" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    {selectedIds.size === filteredEntries.length && filteredEntries.length > 0 ? "Clear" : "Select all"}
                  </Button>
                  <button
                    type="button"
                    className={cn(
                      "flex h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold transition-colors border",
                      manageMode
                        ? "bg-[#4936ef] text-white border-[#4936ef]"
                        : "bg-white text-[#4936ef] border-gray-200 hover:bg-[#f1efff] dark:bg-card dark:text-[#b6a2ff]"
                    )}
                    onClick={() => setManageMode((prev) => !prev)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    {manageMode ? "Done" : "Manage"}
                  </button>
                </div>

                {/* Filter & Selected Summary Card */}
                {(category === "other" || selectedIds.size > 0 || searchQuery.trim()) && (
                  <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#f1efff] to-[#e8e4ff] px-3 py-2 text-xs font-bold text-[#4936ef] dark:from-[#2a2254] dark:to-[#1e193c] dark:text-[#b6a2ff]">
                    <span>
                      {selectedIds.size > 0
                        ? `Selected ${selectedIds.size} bill${selectedIds.size === 1 ? "" : "s"}`
                        : `${otherFilter === "All" ? "Visible" : otherFilter} · ${filteredEntries.length} bill${filteredEntries.length === 1 ? "" : "s"}`}
                    </span>
                    <span className="text-sm font-black">
                      ₹{(selectedIds.size > 0 ? totalSelected : totalFiltered).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-4">
            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm font-bold">{searchQuery ? "No matching bills found" : "No entries yet"}</p>
                <p className="text-xs text-muted-foreground mt-1">{searchQuery ? "Try a different search query." : "Tap the button below to add one."}</p>
              </div>
            ) : (
              filteredEntries.map((e) => {
                const isSelected = selectedIds.has(e.id);
                return (
                  <div
                    key={e.id}
                    className={cn(
                      "flex min-h-[68px] items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-sm",
                      isSelected
                        ? "border-[#4936ef] bg-[#f5f3ff] dark:border-[#7c6cff] dark:bg-[#27214d]"
                        : "border-[#e4e6ee] bg-white dark:border-border dark:bg-card"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(e.id)}
                      className="h-5 w-5 rounded-md border-gray-300 data-[state=checked]:bg-[#4936ef] data-[state=checked]:border-[#4936ef]"
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleSelect(e.id)}>
                      <div className="truncate text-sm font-black text-[#101426] dark:text-white">
                        {category === "current" ? format(new Date(e.entry_date), "dd MMM yyyy") : e.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(e.entry_date), "dd MMM yyyy")}
                        {e.notes && ` · ${e.notes}`}
                      </div>
                    </div>
                    <div className="font-black text-base shrink-0 text-[#101426] dark:text-white">₹{e.amount.toLocaleString()}</div>
                    {manageMode && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl"
                          aria-label={`Edit ${e.label}`}
                          onClick={() => setEditing(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${e.label}`}
                          onClick={() => setConfirmDelete(e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div
            className="sticky bottom-0 border-t bg-white px-3 pt-3 dark:bg-card sm:px-4"
            style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button
              className="h-12 w-full rounded-2xl bg-[linear-gradient(100deg,#3425e4,#563bfb)] font-black text-white hover:opacity-95 shadow-md"
              onClick={() => onAddPayment(selectedIds.size > 0 ? {
                amount: totalSelected,
                label: selectedEntries.length === 1 ? selectedEntries[0].label : `${selectedEntries.length} selected bills`,
              } : undefined)}
            >
              <Plus className="h-5 w-5 mr-1" /> {selectedIds.size > 0 ? `Pay selected · ₹${totalSelected.toLocaleString()}` : "Add Payment"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <QuickExpenseDialog
        open={!!initial}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        initial={initial}
        onSave={(data) => {
          if (editing) onUpdate(editing.id, data);
          else onSave(data);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.label} · ₹{confirmDelete?.amount.toLocaleString()}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDelete) { onDelete(confirmDelete.id); setConfirmDelete(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
};
