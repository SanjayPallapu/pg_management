import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Plus, Inbox } from "lucide-react";
import { format } from "date-fns";
import type { ExpenseCategory, ExpenseEntry } from "@/hooks/useExpenseEntries";
import { QuickExpenseDialog, type QuickExpenseInitial } from "./QuickExpenseDialog";
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

export const BillsEntriesSheet = ({
  open, onOpenChange, title, category, subcategory, floor, defaultLabel, lockLabel,
  entries, rooms, onSave, onUpdate, onDelete,
}: Props) => {
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ExpenseEntry | null>(null);

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const initial: QuickExpenseInitial | null = adding
    ? { category, subcategory, floor, label: defaultLabel, lockLabel }
    : editing
      ? { category, subcategory, floor, label: editing.label, editing }
      : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="p-0 flex flex-col">
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
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
              entries.map((e) => (
                <div key={e.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(e.entry_date), "dd MMM")}
                      {e.notes && ` · ${e.notes}`}
                    </div>
                  </div>
                  <div className="font-semibold text-sm shrink-0">₹{e.amount.toLocaleString()}</div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => setEditing(e)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => setConfirmDelete(e)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t bg-background">
            <Button className="w-full" onClick={() => setAdding(true)}>
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
    </>
  );
};