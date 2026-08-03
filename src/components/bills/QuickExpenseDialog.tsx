import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluateAmountExpression, safeEvaluateExpression } from "@/features/bill-payments/calculator";
import type { ExpenseCategory, ExpenseEntry } from "@/hooks/useExpenseEntries";
import { useBackGesture } from "@/hooks/useBackGesture";

export interface QuickExpenseInitial {
  category: ExpenseCategory;
  subcategory?: string | null;
  label?: string;
  floor?: number | null;
  room_id?: string | null;
  editing?: ExpenseEntry;
  lockLabel?: boolean;
  title?: string;
  suggestedAmount?: number;
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

const PREDEFINED_LABELS = ["Vegetables", "Poori", "Chapati", "Dry Grocery"];

export const QuickExpenseDialog = ({ open, onOpenChange, initial, onSave }: Props) => {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(todayISO());
  const [calcOpen, setCalcOpen] = useState(false);

  useBackGesture(open, () => onOpenChange(false));

  useEffect(() => {
    if (!open || !initial) return;
    const e = initial.editing;

    setAmount(e ? String(e.amount) : "");
    setLabel(e?.label ?? initial.label ?? "");
    setNotes(e?.notes ?? "");
    setEntryDate(e?.entry_date ?? todayISO());
    setCalcOpen(false);
  }, [open, initial]);

  if (!initial) return null;

  const isCurrentBill = initial.category === "current";
  const isFixedCategory = !isCurrentBill && Boolean(initial.lockLabel && (initial.label || initial.subcategory));
  const showLabelField = !isCurrentBill && !isFixedCategory;

  const handleSave = () => {
    const amt = parseInt(amount) || 0;
    const resolvedLabel = isCurrentBill
      ? initial.editing?.label || initial.label || initial.subcategory || "Current bill"
      : isFixedCategory
        ? initial.editing?.label || initial.label || initial.subcategory || ""
      : label.trim() || initial.editing?.label || initial.label || initial.subcategory || initial.category;
    if (!resolvedLabel || amt <= 0) return;

    onSave({
      category: initial.category,
      subcategory: initial.subcategory ?? (initial.category === "utility" ? resolvedLabel : null),
      label: resolvedLabel,
      amount: amt,
      entry_date: entryDate,
      floor: initial.floor ?? null,
      room_id: isCurrentBill ? null : initial.editing?.room_id ?? initial.room_id ?? null,
      notes: isCurrentBill ? null : notes.trim() || null,
    });
  };

  const title = initial.editing ? "Edit Entry" : (initial.title || `Add ${initial.subcategory || initial.label || "Entry"}`);

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
          {/* Label Field with Predefined Chips */}
          {showLabelField && (
            <div>
              <Label className="text-xs">Label *</Label>
              <Input
                className="h-11 font-bold"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={!!initial.lockLabel && !initial.editing}
                placeholder="e.g. June water tanker"
                autoFocus
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PREDEFINED_LABELS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-bold transition-all border",
                      label === chip
                        ? "bg-[#4936ef] text-white border-[#4936ef]"
                        : "bg-white text-[#4936ef] border-[#e0e2ea] hover:bg-[#f1efff] dark:bg-card dark:border-border dark:text-[#b6a2ff]"
                    )}
                    onClick={() => setLabel(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (₹) *</Label>
              <Input
                className="h-11 font-bold text-base"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus={isCurrentBill}
              />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input className="h-11 font-medium" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
          </div>

          {/* Calculator toggle button placed down below input fields */}
          <div className="flex justify-start pt-1">
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 text-xs font-black transition-all px-3 py-1.5 rounded-xl border border-dashed",
                calcOpen
                  ? "bg-[#f1efff] text-[#4936ef] border-[#4936ef]/40 dark:bg-[#302858] dark:text-[#b6a2ff]"
                  : "text-[#4936ef] hover:bg-[#f1efff] border-[#4936ef]/30 dark:text-[#b6a2ff] dark:hover:bg-[#302858]"
              )}
              onClick={() => setCalcOpen((prev) => !prev)}
            >
              <Calculator className="h-3.5 w-3.5" />
              {calcOpen ? "Hide Calculator" : "Use Calculator"}
            </button>
          </div>

          {/* Mini Calculator (collapsible) */}
          {calcOpen && (
            <MiniCalcPanel
              onApply={(val) => {
                setAmount(val);
                setCalcOpen(false);
              }}
              initialExpr={amount}
            />
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

const MiniCalcPanel = ({
  onApply,
  initialExpr,
}: {
  onApply: (val: string) => void;
  initialExpr: string;
}) => {
  const [expr, setExpr] = useState(initialExpr || "");

  const evalResult = useMemo(() => {
    return safeEvaluateExpression(expr);
  }, [expr]);

  const handleKey = (key: string) => {
    if (key === "C") setExpr("");
    else if (key === "⌫") setExpr((prev) => prev.slice(0, -1));
    else if (key === "=") {
      if (evalResult !== "Error") setExpr(evalResult);
    } else setExpr((prev) => prev + key);
  };

  const keys = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", ".", "=", "+"],
  ];

  return (
    <div className="rounded-2xl border bg-slate-50 p-3 dark:bg-card">
      <div className="mb-2 rounded-xl bg-slate-900 p-3 text-right text-white">
        <div className="h-4 text-[10px] text-slate-400 font-mono truncate">{expr || "0"}</div>
        <div className="text-xl font-black font-mono text-emerald-400">₹{evalResult}</div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <button
          type="button"
          className="col-span-2 min-h-9 rounded-lg bg-rose-100 text-rose-700 font-black text-[10px] hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50"
          onClick={() => handleKey("C")}
        >
          Clear
        </button>
        <button
          type="button"
          className="col-span-2 min-h-9 rounded-lg bg-slate-200 text-slate-800 font-black text-[10px] hover:bg-slate-300 dark:bg-slate-800 dark:text-white"
          onClick={() => handleKey("⌫")}
        >
          Delete ⌫
        </button>
        {keys.flat().map((k) => {
          const isOp = ["/", "*", "-", "+"].includes(k);
          return (
            <button
              key={k}
              type="button"
              className={cn(
                "min-h-9 rounded-lg text-sm font-black transition-all active:scale-95",
                isOp
                  ? "bg-[#f1efff] text-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]"
                  : k === "="
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                  : "bg-white text-slate-900 hover:bg-slate-200 dark:bg-card dark:text-white"
              )}
              onClick={() => handleKey(k)}
            >
              {k}
            </button>
          );
        })}
      </div>
      <Button
        className="mt-2 h-9 w-full rounded-xl bg-[#4936ef] text-white text-xs font-black hover:bg-[#3827d7]"
        onClick={() => evalResult !== "Error" && onApply(evalResult)}
      >
        Use ₹{evalResult}
      </Button>
    </div>
  );
};

