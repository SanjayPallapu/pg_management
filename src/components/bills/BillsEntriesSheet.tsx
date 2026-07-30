import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Plus, Inbox, Receipt } from "lucide-react";
import { format } from "date-fns";
import type { ExpenseCategory, ExpenseEntry } from "@/hooks/useExpenseEntries";
import { QuickExpenseDialog, type QuickExpenseInitial } from "./QuickExpenseDialog";
import { CurrentBillReceiptDialog } from "./CurrentBillReceiptDialog";
import { Room } from "@/types";

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
  rooms: Room[];
  onSave: (data: Omit<ExpenseEntry, "id" | "pg_id" | "month" | "year">) => void;
  onUpdate: (id: string, patch: Partial<ExpenseEntry>) => void;
  onDelete: (id: string) => void;
}

const parseUnitsAndNotes = (notesStr: string | null | undefined) => {
  if (!notesStr) return { units: 0, notes: "" };
  if (notesStr.startsWith("Units: ")) {
    const match = notesStr.match(/^Units:\s*(\d+)(?:\s*\|\s*(.*))?$/);
    if (match) {
      return {
        units: parseInt(match[1]) || 0,
        notes: match[2] ?? "",
      };
    }
  }
  return { units: 0, notes: notesStr };
};

export const BillsEntriesSheet = ({
  open, onOpenChange, title, category, subcategory, floor, defaultLabel, lockLabel,
  entries, rooms, onSave, onUpdate, onDelete,
}: Props) => {
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseEntry | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{
    entry: ExpenseEntry;
    units: number;
    notes: string;
  } | null>(null);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const initial: QuickExpenseInitial | null = adding
    ? { category, subcategory, floor, label: defaultLabel, lockLabel }
    : editing
      ? { category, subcategory, floor, label: editing.label, editing }
      : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[92dvh] flex-col rounded-t-[28px] p-0 animate-in duration-300 [&>button]:hidden">
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl" onClick={() => onOpenChange(false)} aria-label="Back to bills and budget">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {title}
            </SheetTitle>
            <SheetDescription className="ml-10 flex items-center justify-between">
              <span>{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
              <span className="font-semibold text-foreground">₹{total.toLocaleString()}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No entries yet</p>
              </div>
            ) : (
              entries.map((e) => {
                const { units, notes: cleanNotes } = parseUnitsAndNotes(e.notes);
                return (
                  <div key={e.id}
                    className="flex min-h-[68px] items-center justify-between gap-2 rounded-2xl border bg-card p-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        {e.label}
                        {units > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] py-0 px-1.5 font-normal border-amber-200/50 hover:bg-amber-100">
                            ⚡ {units} units
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(e.entry_date), "dd MMM")}
                        {cleanNotes && ` · ${cleanNotes}`}
                      </div>
                    </div>
                    <div className="font-semibold text-sm shrink-0">₹{e.amount.toLocaleString()}</div>
                    {units > 0 && (
                      <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl text-amber-600 dark:text-amber-400"
                        aria-label={`View receipt for ${e.label}`}
                        onClick={() => setSelectedReceipt({ entry: e, units, notes: cleanNotes })}>
                        <Receipt className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl"
                      aria-label={`Edit ${e.label}`}
                      onClick={() => setEditing(e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl text-destructive"
                      aria-label={`Delete ${e.label}`}
                      onClick={() => setConfirmDelete(e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div
            className="border-t bg-background px-4 pt-4"
            style={{ paddingBottom: "calc(var(--bottom-nav-offset, 0px) + 12px)" }}
          >
            <Button className="h-12 w-full rounded-xl" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <QuickExpenseDialog
        open={!!initial}
        onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }}
        initial={initial}
        rooms={rooms}
        onSave={(data) => {
          if (editing) onUpdate(editing.id, data);
          else onSave(data);
          setAdding(false); setEditing(null);
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

      {selectedReceipt && (
        <CurrentBillReceiptDialog
          open={!!selectedReceipt}
          onOpenChange={(open) => {
            if (!open) setSelectedReceipt(null);
          }}
          entry={selectedReceipt.entry}
          units={selectedReceipt.units}
          originalNotes={selectedReceipt.notes}
        />
      )}
    </>
  );
};
