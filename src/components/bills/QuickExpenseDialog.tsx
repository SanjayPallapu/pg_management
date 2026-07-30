import { useEffect, useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Room } from "@/types";
import type { ExpenseCategory, ExpenseEntry } from "@/hooks/useExpenseEntries";
import { calculateAPCommercialBill } from "@/hooks/useElectricityReadings";

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
  const [useTariff, setUseTariff] = useState(false);
  const [units, setUnits] = useState("");

  useEffect(() => {
    if (!open || !initial) return;
    const e = initial.editing;
    
    // Parse units out of notes
    let initialNotes = e?.notes ?? "";
    let initialUnits = "";
    let isTariff = false;

    if (initialNotes.startsWith("Units: ")) {
      const match = initialNotes.match(/^Units:\s*(\d+)(?:\s*\|\s*(.*))?$/);
      if (match) {
        initialUnits = match[1];
        initialNotes = match[2] ?? "";
        isTariff = true;
      }
    } else if (initial.category === "current" && !e) {
      isTariff = true;
    }

    setAmount(e ? String(e.amount) : "");
    setLabel(e?.label ?? initial.label ?? "");
    setNotes(initialNotes);
    setEntryDate(e?.entry_date ?? todayISO());
    setRoomId(e?.room_id ?? initial.room_id ?? "");
    setUseTariff(isTariff);
    setUnits(initialUnits);
  }, [open, initial]);

  const calculatedBill = useMemo(() => {
    if (!useTariff || !units) return null;
    const val = parseInt(units) || 0;
    return calculateAPCommercialBill(val);
  }, [useTariff, units]);

  useEffect(() => {
    if (useTariff && calculatedBill) {
      setAmount(String(Math.round(calculatedBill.totalBill)));
    }
  }, [useTariff, calculatedBill]);

  if (!initial) return null;

  const handleSave = () => {
    const amt = parseInt(amount) || 0;
    if (!label.trim() || amt <= 0) return;

    let finalNotes = notes.trim();
    if (useTariff && units) {
      finalNotes = `Units: ${units}` + (finalNotes ? ` | ${finalNotes}` : "");
    }

    onSave({
      category: initial.category,
      subcategory: initial.subcategory ?? null,
      label: label.trim(),
      amount: amt,
      entry_date: entryDate,
      floor: initial.floor ?? null,
      room_id: roomId || null,
      notes: finalNotes || null,
    });
  };

  const title = initial.editing ? "Edit Entry" : (initial.title || `Add ${initial.subcategory || initial.label || "Entry"}`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-[calc(100%-24px)] overflow-y-auto rounded-[24px] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-xs">Quick entry — only what's needed.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
          
          {initial.category === "current" && (
            <div className="flex items-center space-x-2 py-1">
              <Checkbox
                id="use-tariff"
                checked={useTariff}
                onCheckedChange={(checked) => {
                  setUseTariff(!!checked);
                  if (!checked) {
                    setUnits("");
                  }
                }}
              />
              <Label htmlFor="use-tariff" className="text-xs cursor-pointer select-none">
                Calculate from units (AP Commercial LT-II)
              </Label>
            </div>
          )}

          {initial.category === "current" && useTariff && (
            <div>
              <Label className="text-xs">Units Consumed *</Label>
              <Input
                className="h-11"
                type="number"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
          )}

          {initial.category === "current" && useTariff && calculatedBill && (
            <div className="text-xs p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/30 space-y-1 text-amber-900 dark:text-amber-200">
              <div className="font-semibold flex justify-between">
                <span>AP LT-II Commercial Tariff</span>
                <span>{units} units</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 text-[11px] text-amber-800 dark:text-amber-300">
                <span>Energy Charges:</span>
                <span className="text-right">₹{Math.round(calculatedBill.energyCharges)}</span>
                <span>Fixed Charges:</span>
                <span className="text-right">₹{calculatedBill.fixedCharges}</span>
                <span className="font-medium">Total Calculated:</span>
                <span className="text-right font-medium">₹{Math.round(calculatedBill.totalBill)}</span>
              </div>
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
                disabled={useTariff}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input className="h-11" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
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
            <Input className="h-11" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="..." />
          </div>
        </div>
        <DialogFooter>
          <Button className="h-11" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-11" onClick={handleSave}>{initial.editing ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
