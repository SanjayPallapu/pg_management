import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Plus, Inbox, Settings2 } from "lucide-react";
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
  onAddPayment: () => void;
}

export const BillsEntriesSheet = ({
  open, onOpenChange, title, category, subcategory, floor, defaultLabel, lockLabel,
  entries, onSave, onUpdate, onDelete, onAddPayment,
}: Props) => {
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseEntry | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const total = entries.reduce((s, e) => s + e.amount, 0);

  const initial: QuickExpenseInitial | null = editing
      ? { category, subcategory, floor, label: defaultLabel ?? editing.label, editing, lockLabel }
      : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex h-[92dvh] flex-col rounded-t-[28px] p-0 animate-in duration-300 [&>button]:hidden [&>div:last-child]:px-0 [&>div:last-child]:pb-0"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <SheetHeader className="border-b px-3 pb-2 pt-3 sm:px-4">
            <SheetTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={() => onOpenChange(false)} aria-label="Back to bills and budget">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <span className="flex-1 truncate">{title}</span>
              <span className="shrink-0 text-base font-black text-[#4936ef] dark:text-[#b6a2ff]">₹{total.toLocaleString()}</span>
            </SheetTitle>
            <SheetDescription className="ml-10 flex items-center justify-between">
              <span>{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
              {entries.length > 0 && (
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-colors",
                    manageMode
                      ? "bg-[#4936ef] text-white"
                      : "text-[#4936ef] hover:bg-[#f1efff] dark:text-[#b6a2ff] dark:hover:bg-[#302858]"
                  )}
                  onClick={() => setManageMode((prev) => !prev)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {manageMode ? "Done" : "Manage"}
                </button>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-4">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm font-bold">No entries yet</p>
                <p className="text-xs text-muted-foreground mt-1">Tap the button below to add one.</p>
              </div>
            ) : (
              entries.map((e) => (
                  <div key={e.id}
                    className="flex min-h-[68px] items-center justify-between gap-2 rounded-2xl border bg-card p-3 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-bold">
                        {category === "current" ? format(new Date(e.entry_date), "dd MMM yyyy") : e.label}
                      </div>
                      {category !== "current" && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(e.entry_date), "dd MMM")}
                          {e.notes && ` · ${e.notes}`}
                        </div>
                      )}
                    </div>
                    <div className="font-black text-sm shrink-0">₹{e.amount.toLocaleString()}</div>
                    {manageMode && (
                      <>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl"
                          aria-label={`Edit ${e.label}`}
                          onClick={() => setEditing(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Delete ${e.label}`}
                          onClick={() => setConfirmDelete(e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
              ))
            )}
          </div>

          <div
            className="border-t bg-background px-3 pt-4 sm:px-4"
            style={{ paddingBottom: "calc(81px + env(safe-area-inset-bottom, 0px))" }}
          >
            <Button className="h-12 w-full rounded-xl bg-[linear-gradient(100deg,#3425e4,#563bfb)] font-black text-white hover:opacity-95" onClick={onAddPayment}>
              <Plus className="h-4 w-4 mr-1" /> Add Payment
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
