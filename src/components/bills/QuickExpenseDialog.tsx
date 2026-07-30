import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ExpenseCategory, ExpenseEntry } from "@/hooks/useExpenseEntries";

export interface QuickExpenseInitial {
  category: ExpenseCategory;
  subcategory?: string | null;
  label?: string;
  floor?: number | null;
  room_id?: string | null;
  editing?: ExpenseEntry;
  lockLabel?: boolean;
  title?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: QuickExpenseInitial | null;
  onSave: (data: Omit<ExpenseEntry, "id" | "pg_id" | "month" | "year">) => void;
}

const todayISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const QuickExpenseDialog = ({ open, onOpenChange, initial, onSave }: Props) => {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(todayISO());

  useEffect(() => {
    if (!open || !initial) return;
    const e = initial.editing;

    setAmount(e ? String(e.amount) : "");
    setLabel(e?.label ?? initial.label ?? "");
    setNotes(e?.notes ?? "");
    setEntryDate(e?.entry_date ?? todayISO());
  }, [open, initial]);

  if (!initial) return null;

  const handleSave = () => {
    const amt = parseInt(amount) || 0;
    const isCurrentBill = initial.category === "current";
    const resolvedLabel = isCurrentBill
      ? initial.editing?.label || initial.label || initial.subcategory || "Current bill"
      : label.trim();
    if (!resolvedLabel || amt <= 0) return;

    onSave({
      category: initial.category,
      subcategory: initial.subcategory ?? null,
      label: resolvedLabel,
      amount: amt,
      entry_date: entryDate,
      floor: initial.floor ?? null,
      room_id: isCurrentBill ? null : initial.editing?.room_id ?? initial.room_id ?? null,
      notes: isCurrentBill ? null : notes.trim() || null,
    });
  };

  const title = initial.editing ? "Edit Entry" : (initial.title || `Add ${initial.subcategory || initial.label || "Entry"}`);
  const isCurrentBill = initial.category === "current";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-[calc(100%-24px)] overflow-y-auto rounded-[24px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs">
            {isCurrentBill ? "Enter the bill amount and date." : "Quick entry — only what's needed."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!isCurrentBill && (
            <div>
              <Label className="text-xs">Label *</Label>
              <Input
                className="h-11"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={!!initial.lockLabel && !initial.editing}
                placeholder="e.g. June water tanker"
                autoFocus
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (₹) *</Label>
              <Input
                className="h-11"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus={isCurrentBill}
              />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input className="h-11" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>
          {!isCurrentBill && (
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Input className="h-11" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="..." />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button className="h-11" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-11" onClick={handleSave}>{initial.editing ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
