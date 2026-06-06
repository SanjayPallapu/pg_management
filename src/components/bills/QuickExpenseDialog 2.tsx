import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Room } from "@/types";
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
  rooms: Room[];
  onSave: (data: Omit<ExpenseEntry, "id" | "pg_id" | "month" | "year">) => void;
}

const todayISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const QuickExpenseDialog = ({ open, onOpenChange, initial, rooms, onSave }: Props) => {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(todayISO());
  const [roomId, setRoomId] = useState<string>("");

  useEffect(() => {
    if (!open || !initial) return;
    const e = initial.editing;
    setAmount(e ? String(e.amount) : "");
    setLabel(e?.label ?? initial.label ?? "");
    setNotes(e?.notes ?? "");
    setEntryDate(e?.entry_date ?? todayISO());
    setRoomId(e?.room_id ?? initial.room_id ?? "");
  }, [open, initial]);

  if (!initial) return null;

  const handleSave = () => {
    const amt = parseInt(amount) || 0;
    if (!label.trim() || amt <= 0) return;
    onSave({
      category: initial.category,
      subcategory: initial.subcategory ?? null,
      label: label.trim(),
      amount: amt,
      entry_date: entryDate,
      floor: initial.floor ?? null,
      room_id: roomId || null,
      notes: notes.trim() || null,
    });
  };

  const title = initial.editing ? "Edit Entry" : (initial.title || `Add ${initial.subcategory || initial.label || "Entry"}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs">Quick entry — only what's needed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Label *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={!!initial.lockLabel && !initial.editing}
              placeholder="e.g. June water tanker"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>
          {initial.category === "current" && rooms.length > 0 && (
            <div>
              <Label className="text-xs">Room (optional)</Label>
              <Select value={roomId || "none"} onValueChange={(v) => setRoomId(v === "none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {rooms
                    .filter((r) => initial.floor == null || r.floor === initial.floor)
                    .map((r) => <SelectItem key={r.id} value={r.id}>Room {r.roomNo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{initial.editing ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};