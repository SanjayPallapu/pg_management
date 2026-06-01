import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Droplet, Home, Receipt, Plus, Pencil, Trash2, ChevronDown, Wallet, IndianRupee,
} from "lucide-react";
import { useMonthContext } from "@/contexts/MonthContext";
import { useExpenseEntries, type ExpenseCategory, type ExpenseEntry } from "@/hooks/useExpenseEntries";
import { useMonthlyBudget } from "@/hooks/useMonthlyBudget";
import { Room } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MONTHS } from "@/constants/pricing";

interface Props {
  rooms: Room[];
}

const CATEGORIES: { key: ExpenseCategory; label: string; icon: React.ElementType; color: string; subcats?: string[] }[] = [
  { key: "current", label: "Current Bills (by Floor/Unit)", icon: Building2, color: "text-amber-500" },
  { key: "utility", label: "Utility Bills", icon: Droplet, color: "text-sky-500", subcats: ["Water", "Gas", "Groceries", "Milk", "Internet", "Maintenance"] },
  { key: "other", label: "Other Bills", icon: Receipt, color: "text-violet-500" },
  { key: "family", label: "Family Expenses", icon: Home, color: "text-pink-500" },
];

export const BillsBudgetDashboard = ({ rooms }: Props) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { entries, isLoading, byCategory, totalFor, grandTotal, addEntry, updateEntry, deleteEntry } =
    useExpenseEntries(selectedMonth, selectedYear);
  const { amount: budgetAmount, setBudget } = useMonthlyBudget(selectedMonth, selectedYear);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [dialogState, setDialogState] = useState<{ category: ExpenseCategory; editing?: ExpenseEntry } | null>(null);

  const percentUsed = budgetAmount > 0 ? Math.min(100, (grandTotal / budgetAmount) * 100) : 0;
  const remaining = budgetAmount - grandTotal;
  const barTone =
    percentUsed >= 100 ? "bg-destructive"
      : percentUsed >= 70 ? "bg-orange-500"
        : "bg-green-500";

  return (
    <div className="space-y-4">
      {/* Budget Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" />
              Monthly Budget — {MONTHS[selectedMonth - 1]?.label} {selectedYear}
            </CardTitle>
            {!editingBudget ? (
              <Button variant="ghost" size="sm" className="h-7" onClick={() => { setBudgetDraft(String(budgetAmount)); setEditingBudget(true); }}>
                <Pencil className="h-3 w-3 mr-1" /> {budgetAmount > 0 ? "Edit" : "Set Budget"}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {editingBudget ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Budget Amount (₹)</Label>
                <Input
                  type="number"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  placeholder="e.g. 80000"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <Button size="sm" onClick={() => { setBudget.mutate(parseInt(budgetDraft) || 0); setEditingBudget(false); }}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingBudget(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold flex items-center">
                    <IndianRupee className="h-5 w-5" />{grandTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    spent of ₹{budgetAmount.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-semibold", remaining < 0 ? "text-destructive" : "text-paid")}>
                    ₹{Math.abs(remaining).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{remaining < 0 ? "over budget" : "remaining"}</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full transition-all", barTone)} style={{ width: `${percentUsed}%` }} />
                </div>
                <div className="text-xs text-muted-foreground text-right">{percentUsed.toFixed(1)}% used</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {CATEGORIES.map((c) => {
          const items = byCategory(c.key);
          const total = totalFor(c.key);
          const Icon = c.icon;
          return (
            <Card key={c.key}>
              <Collapsible defaultOpen={items.length > 0}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Icon className={cn("h-4 w-4", c.color)} />
                        {c.label}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">₹{total.toLocaleString()}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No entries this month</p>
                    ) : (
                      items.map((e) => (
                        <div key={e.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40 hover:bg-muted transition-colors text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{e.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(e.entry_date), "dd MMM")}
                              {e.subcategory && ` · ${e.subcategory}`}
                              {e.floor != null && ` · Floor ${e.floor}`}
                              {e.notes && ` · ${e.notes}`}
                            </div>
                          </div>
                          <div className="font-semibold">₹{e.amount.toLocaleString()}</div>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setDialogState({ category: c.key, editing: e })}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => deleteEntry.mutate(e.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setDialogState({ category: c.key })}>
                      <Plus className="h-3 w-3 mr-1" /> Add Entry
                    </Button>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Grand Total */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="p-3 flex items-center justify-between">
          <span className="text-sm font-semibold">Grand Total ({entries.length} entries)</span>
          <span className="text-xl font-bold text-primary">₹{grandTotal.toLocaleString()}</span>
        </CardContent>
      </Card>

      <ExpenseEntryDialog
        state={dialogState}
        onClose={() => setDialogState(null)}
        rooms={rooms}
        onSave={(data) => {
          if (dialogState?.editing) {
            updateEntry.mutate({ id: dialogState.editing.id, ...data });
          } else {
            addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear });
          }
          setDialogState(null);
        }}
      />
    </div>
  );
};

// ---------- Add/Edit Entry Dialog ----------
interface DialogState {
  category: ExpenseCategory;
  editing?: ExpenseEntry;
}
interface ExpenseEntryDialogProps {
  state: DialogState | null;
  onClose: () => void;
  rooms: Room[];
  onSave: (data: Omit<ExpenseEntry, "id" | "pg_id" | "month" | "year">) => void;
}

const ExpenseEntryDialog = ({ state, onClose, rooms, onSave }: ExpenseEntryDialogProps) => {
  const isOpen = !!state;
  const cat = state?.category;
  const editing = state?.editing;
  const catCfg = CATEGORIES.find((c) => c.key === cat);

  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [floor, setFloor] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState<string>(() => {
    const d = new Date(); const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  });

  // Sync when opening
  useMemo(() => {
    if (!isOpen) return;
    setLabel(editing?.label ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setSubcategory(editing?.subcategory ?? (catCfg?.subcats?.[0] ?? ""));
    setFloor(editing?.floor != null ? String(editing.floor) : "");
    setRoomId(editing?.room_id ?? "");
    setNotes(editing?.notes ?? "");
    if (editing) setEntryDate(editing.entry_date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing?.id]);

  if (!cat) return null;

  const floors = [...new Set(rooms.map((r) => r.floor))].sort();

  const save = () => {
    const amt = parseInt(amount) || 0;
    if (!label.trim() || amt <= 0) return;
    onSave({
      category: cat,
      subcategory: subcategory || null,
      label: label.trim(),
      amount: amt,
      entry_date: entryDate,
      floor: floor ? parseInt(floor) : null,
      room_id: roomId || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit" : "Add"} {catCfg?.label}</DialogTitle>
          <DialogDescription>Track every rupee — keep your monthly view clean.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {catCfg?.subcats && (
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catCfg.subcats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Label *</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder={catCfg?.subcats ? "e.g. Monthly water tanker" : "Description"} />
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
          {cat === "current" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Floor</Label>
                <Select value={floor || "all"} onValueChange={(v) => setFloor(v === "all" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((f) => <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Room (optional)</Label>
                <Select value={roomId || "none"} onValueChange={(v) => setRoomId(v === "none" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {rooms
                      .filter((r) => !floor || r.floor === parseInt(floor))
                      .map((r) => <SelectItem key={r.id} value={r.id}>Room {r.roomNo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any details..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{editing ? "Update" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
