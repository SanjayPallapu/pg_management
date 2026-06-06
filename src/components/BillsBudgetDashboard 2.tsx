import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Droplet, Receipt, Home, Wallet, IndianRupee, Plus, Settings, Snowflake,
  Flame, Egg, Milk, Drumstick, Coffee, ShoppingBag, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMonthContext } from "@/contexts/MonthContext";
import { useExpenseEntries, type ExpenseCategory, type ExpenseEntry } from "@/hooks/useExpenseEntries";
import { useMonthlyBudget } from "@/hooks/useMonthlyBudget";
import { useElectricityReadings, calcAcShare } from "@/hooks/useElectricityReadings";
import { usePG } from "@/contexts/PGContext";
import { MONTHS } from "@/constants/pricing";
import { Room } from "@/types";
import { QuickExpenseDialog, type QuickExpenseInitial } from "./bills/QuickExpenseDialog";
import { BillsEntriesSheet } from "./bills/BillsEntriesSheet";
import { BillsAnalytics } from "./bills/BillsAnalytics";
import { ACBillTemplate, type ACBillData } from "./ACBillTemplate";
import { generateReceiptImage } from "@/utils/generateReceiptImage";
import { toast } from "@/hooks/use-toast";
import { isTenantActiveInMonth } from "@/utils/dateOnly";

interface Props { rooms: Room[]; }

const FLOOR_NAMES: Record<number, string> = {
  0: "Ground Floor",
  1: "1st Floor",
  2: "2nd Floor",
  3: "3rd Floor",
  4: "4th Floor",
};

const UTILITY_PRESETS = [
  { key: "Water Tank", icon: Droplet },
  { key: "Gas Cylinder", icon: Flame },
  { key: "Water Can", icon: Coffee },
  { key: "Milk & Curd", icon: Milk },
  { key: "Rice Bags", icon: ShoppingBag },
  { key: "Palm Oil", icon: Droplet },
  { key: "Chicken", icon: Drumstick },
  { key: "Eggs", icon: Egg },
];

const SectionHeader = ({
  title, icon: Icon, color = "text-primary", onSettings, onAdd,
}: { title: string; icon: React.ElementType; color?: string; onSettings?: () => void; onAdd?: () => void }) => (
  <div className="flex items-center justify-between px-1">
    <h3 className="text-sm font-semibold flex items-center gap-2">
      <Icon className={cn("h-4 w-4", color)} /> {title}
    </h3>
    <div className="flex items-center gap-1">
      {onSettings && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onSettings}>
          <Settings className="h-3.5 w-3.5" />
        </Button>
      )}
      {onAdd && (
        <Button variant="default" size="sm" className="h-7 px-3 text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      )}
    </div>
  </div>
);

const Tile = ({
  icon: Icon, label, sub, total, onAdd, color = "text-muted-foreground",
}: { icon: React.ElementType; label: string; sub: string; total: number; onAdd: () => void; color?: string }) => (
  <button
    onClick={onAdd}
    className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left w-full"
  >
    <div className={cn("h-9 w-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0", color)}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium truncate">{label}</div>
      <div className="text-xs text-muted-foreground truncate">{sub}</div>
    </div>
    <div className="text-right shrink-0">
      {total > 0 && <div className="text-sm font-semibold">₹{total.toLocaleString()}</div>}
      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary inline-block ml-1" />
    </div>
  </button>
);

const TotalBar = ({ label, total, tone }: { label: string; total: number; tone: string }) => (
  <div className={cn("rounded-lg p-3 flex items-center justify-between", tone)}>
    <span className="text-xs font-medium">{label}</span>
    <span className="text-base font-bold">₹{total.toLocaleString()}</span>
  </div>
);

export const BillsBudgetDashboard = ({ rooms }: Props) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG } = usePG();
  const {
    entries, byCategory, totalFor, grandTotal,
    addEntry, updateEntry, deleteEntry,
  } = useExpenseEntries(selectedMonth, selectedYear);
  const { amount: budgetAmount, setBudget } = useMonthlyBudget(selectedMonth, selectedYear);
  const { byRoom: acByRoom, setReading } = useElectricityReadings(selectedMonth, selectedYear);

  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [quickAdd, setQuickAdd] = useState<QuickExpenseInitial | null>(null);
  const [sheetState, setSheetState] = useState<{
    title: string; category: ExpenseCategory; subcategory?: string | null;
    floor?: number | null; defaultLabel?: string; lockLabel?: boolean;
  } | null>(null);

  // Floors derived from rooms (+ Motor as a fixed "common" tile)
  const floors = useMemo(() => {
    const set = new Set<number>();
    rooms.forEach((r) => set.add(r.floor));
    return Array.from(set).sort();
  }, [rooms]);

  const currentBillTiles = useMemo(() => {
    const tiles: { key: string; label: string; subcategory: string; floor: number | null }[] =
      floors.map((f) => ({
        key: `floor-${f}`, label: FLOOR_NAMES[f] || `Floor ${f}`,
        subcategory: FLOOR_NAMES[f] || `Floor ${f}`, floor: f,
      }));
    tiles.push({ key: "motor", label: "Motor Bill", subcategory: "Motor", floor: null });
    return tiles;
  }, [floors]);

  const utilityTotal = totalFor("utility");
  const otherTotal = totalFor("other");
  const familyTotal = totalFor("family");
  const currentTotal = totalFor("current");

  const percentUsed = budgetAmount > 0 ? Math.min(100, (grandTotal / budgetAmount) * 100) : 0;
  const remaining = budgetAmount - grandTotal;
  const barTone =
    percentUsed >= 100 ? "bg-destructive"
      : percentUsed >= 70 ? "bg-orange-500" : "bg-emerald-500";

  // entries by subcategory helper
  const entriesBySub = (cat: ExpenseCategory, sub: string) =>
    byCategory(cat).filter((e) => (e.subcategory ?? "") === sub);

  // AC rooms with active tenants
  const acRooms = useMemo(() => {
    return rooms
      .filter((r) => r.isAc)
      .map((r) => {
        const activeTenants = r.tenants.filter((t) =>
          isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
        );
        const reading = acByRoom.get(r.id);
        const units = reading?.units ?? 0;
        const unitPrice = reading?.unit_price ?? (currentPG as any)?.electricityUnitPrice ?? 12;
        const total = units * unitPrice;
        const share = calcAcShare(units, unitPrice, activeTenants.length);
        return { room: r, activeTenants, units, unitPrice, total, share };
      });
  }, [rooms, acByRoom, selectedMonth, selectedYear, currentPG]);

  const acTemplateRef = useState<HTMLDivElement | null>(null);
  const [acShareData, setAcShareData] = useState<ACBillData | null>(null);

  const handleShareAC = async (item: typeof acRooms[number]) => {
    if (item.units <= 0) {
      toast({ title: "Enter units first", variant: "destructive" });
      return;
    }
    setAcShareData({
      roomNo: item.room.roomNo,
      units: item.units,
      unitPrice: item.unitPrice,
      totalAmount: item.total,
      tenants: item.activeTenants.map((t) => ({ name: t.name, share: item.share })),
      monthLabel: `${MONTHS[selectedMonth - 1]?.label} ${selectedYear}`,
      pgName: currentPG?.name,
      pgLogoUrl: currentPG?.logoUrl,
    });
    // Wait one tick for the template to render
    setTimeout(async () => {
      const el = document.getElementById("ac-bill-template-host");
      if (!el) return;
      try {
        const dataUrl = await generateReceiptImage(el);
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `ac-bill-${item.room.roomNo}.png`, { type: "image/png" });
        if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({ files: [file], title: "AC Electricity Bill" });
        } else {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `ac-bill-${item.room.roomNo}.png`;
          a.click();
          toast({ title: "Image downloaded", description: "Share manually via WhatsApp." });
        }
      } catch (e: any) {
        toast({ title: "Share failed", description: e?.message ?? "", variant: "destructive" });
      } finally {
        setAcShareData(null);
      }
    }, 250);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Bills Management</h2>
          <p className="text-xs text-muted-foreground">{MONTHS[selectedMonth - 1]?.label} {selectedYear}</p>
        </div>
      </div>

      {/* Monthly Budget */}
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-semibold">Monthly Budget</div>
                <div className="text-xs text-muted-foreground">Track your spending limit</div>
              </div>
            </div>
            {!editingBudget ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs"
                onClick={() => { setBudgetDraft(String(budgetAmount)); setEditingBudget(true); }}>
                <Settings className="h-3.5 w-3.5 mr-1" /> {budgetAmount > 0 ? `₹${budgetAmount.toLocaleString()}` : "Set"}
              </Button>
            ) : null}
          </div>

          {editingBudget ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Budget Amount (₹)</Label>
                <Input type="number" value={budgetDraft} onChange={(e) => setBudgetDraft(e.target.value)}
                  placeholder="e.g. 80000" className="mt-1" autoFocus />
              </div>
              <Button size="sm" onClick={() => { setBudget.mutate(parseInt(budgetDraft) || 0); setEditingBudget(false); }}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingBudget(false)}>Cancel</Button>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between text-xs mb-1">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-semibold">₹{grandTotal.toLocaleString()} / ₹{budgetAmount.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full transition-all", barTone)} style={{ width: `${percentUsed}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-muted-foreground">{percentUsed.toFixed(1)}% used</span>
                <span className={cn("font-medium", remaining < 0 ? "text-destructive" : "text-emerald-500")}>
                  ₹{Math.abs(remaining).toLocaleString()} {remaining < 0 ? "over" : "remaining"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-primary font-semibold uppercase tracking-wide">Grand Total (All Bills)</div>
            <div className="text-2xl font-bold flex items-center mt-1">
              <IndianRupee className="h-5 w-5" />{grandTotal.toLocaleString()}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{entries.length} entries</div>
          </div>
        </CardContent>
      </Card>

      {/* Current Bills */}
      <section className="space-y-2">
        <SectionHeader
          title="Current Bills"
          icon={Building2}
          color="text-amber-500"
          onSettings={() => setSheetState({
            title: "Current Bills · All Entries", category: "current",
          })}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {currentBillTiles.map((t) => {
            const items = entriesBySub("current", t.subcategory);
            const total = items.reduce((s, e) => s + e.amount, 0);
            return (
              <Tile
                key={t.key}
                icon={Building2}
                color="text-amber-500"
                label={t.label}
                sub={`${items.length} ${items.length === 1 ? "entry" : "entries"}`}
                total={total}
                onAdd={() => setQuickAdd({
                  category: "current",
                  subcategory: t.subcategory,
                  floor: t.floor,
                  label: `${t.label} - ${MONTHS[selectedMonth - 1]?.label}`,
                  title: `Add ${t.label}`,
                })}
              />
            );
          })}
        </div>
        <TotalBar label="Total Current Bills" total={currentTotal} tone="bg-amber-500/10 text-amber-700 dark:text-amber-300" />
      </section>

      {/* Utility Bills */}
      <section className="space-y-2">
        <SectionHeader
          title="Utility Bills"
          icon={Droplet}
          color="text-sky-500"
          onSettings={() => setSheetState({ title: "Utility Bills · All Entries", category: "utility" })}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {UTILITY_PRESETS.map((p) => {
            const items = entriesBySub("utility", p.key);
            const total = items.reduce((s, e) => s + e.amount, 0);
            return (
              <Tile
                key={p.key}
                icon={p.icon}
                color="text-sky-500"
                label={p.key}
                sub={`${items.length} ${items.length === 1 ? "entry" : "entries"}`}
                total={total}
                onAdd={() => setQuickAdd({
                  category: "utility", subcategory: p.key, label: p.key,
                  title: `Add ${p.key}`,
                })}
              />
            );
          })}
        </div>
        <TotalBar label="Total Utility Bills" total={utilityTotal} tone="bg-sky-500/10 text-sky-700 dark:text-sky-300" />
      </section>

      {/* Other Bills */}
      <section className="space-y-2">
        <SectionHeader
          title="Other Bills"
          icon={Receipt}
          color="text-violet-500"
          onSettings={() => setSheetState({ title: "Other Bills", category: "other" })}
          onAdd={() => setQuickAdd({ category: "other", title: "Add Other Bill" })}
        />
        {byCategory("other").length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
            <Receipt className="h-6 w-6 mx-auto mb-1 opacity-40" />
            No other bills added yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {byCategory("other").slice(0, 3).map((e) => (
              <Tile key={e.id} icon={Receipt} color="text-violet-500" label={e.label}
                sub={e.notes ?? ""} total={e.amount}
                onAdd={() => setSheetState({ title: "Other Bills", category: "other" })} />
            ))}
            {byCategory("other").length > 3 && (
              <Button variant="ghost" size="sm" className="w-full text-xs"
                onClick={() => setSheetState({ title: "Other Bills", category: "other" })}>
                View all {byCategory("other").length} →
              </Button>
            )}
          </div>
        )}
        <TotalBar label="Total Other Bills" total={otherTotal} tone="bg-violet-500/10 text-violet-700 dark:text-violet-300" />
      </section>

      {/* Family Expenses */}
      <section className="space-y-2">
        <SectionHeader
          title="Family Expenses"
          icon={Home}
          color="text-pink-500"
          onSettings={() => setSheetState({ title: "Family Expenses", category: "family" })}
          onAdd={() => setQuickAdd({ category: "family", title: "Add Family Expense" })}
        />
        {byCategory("family").length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-xs text-muted-foreground">
            <Home className="h-6 w-6 mx-auto mb-1 opacity-40" />
            No family expenses added yet
          </div>
        ) : (
          <div className="space-y-1.5">
            {byCategory("family").slice(0, 3).map((e) => (
              <Tile key={e.id} icon={Home} color="text-pink-500" label={e.label}
                sub={e.notes ?? ""} total={e.amount}
                onAdd={() => setSheetState({ title: "Family Expenses", category: "family" })} />
            ))}
            {byCategory("family").length > 3 && (
              <Button variant="ghost" size="sm" className="w-full text-xs"
                onClick={() => setSheetState({ title: "Family Expenses", category: "family" })}>
                View all {byCategory("family").length} →
              </Button>
            )}
          </div>
        )}
        <TotalBar label="Total Family Expenses" total={familyTotal} tone="bg-pink-500/10 text-pink-700 dark:text-pink-300" />
      </section>

      {/* AC Electricity */}
      {acRooms.length > 0 && (
        <section className="space-y-2">
          <SectionHeader title="AC Electricity" icon={Snowflake} color="text-cyan-500" />
          <div className="space-y-2">
            {acRooms.map((item) => (
              <ACRoomCard
                key={item.room.id}
                roomNo={item.room.roomNo}
                tenantCount={item.activeTenants.length}
                units={item.units}
                unitPrice={item.unitPrice}
                total={item.total}
                share={item.share}
                onUnitsChange={(units) => setReading.mutate({ roomId: item.room.id, units, unitPrice: item.unitPrice })}
                onPriceChange={(unitPrice) => setReading.mutate({ roomId: item.room.id, units: item.units, unitPrice })}
                onShare={() => handleShareAC(item)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick add dialog */}
      <QuickExpenseDialog
        open={!!quickAdd}
        onOpenChange={(o) => !o && setQuickAdd(null)}
        initial={quickAdd}
        rooms={rooms}
        onSave={(data) => {
          addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear });
          setQuickAdd(null);
        }}
      />

      {/* Settings sheet for category */}
      {sheetState && (
        <BillsEntriesSheet
          open={!!sheetState}
          onOpenChange={(o) => !o && setSheetState(null)}
          title={sheetState.title}
          category={sheetState.category}
          subcategory={sheetState.subcategory ?? null}
          floor={sheetState.floor ?? null}
          defaultLabel={sheetState.defaultLabel}
          lockLabel={sheetState.lockLabel}
          entries={
            sheetState.subcategory
              ? entriesBySub(sheetState.category, sheetState.subcategory)
              : byCategory(sheetState.category)
          }
          rooms={rooms}
          onSave={(data) => addEntry.mutate({ ...data, month: selectedMonth, year: selectedYear })}
          onUpdate={(id, patch) => updateEntry.mutate({ id, ...patch })}
          onDelete={(id) => deleteEntry.mutate(id)}
        />
      )}

      {/* Hidden AC bill template host for image generation */}
      {acShareData && (
        <div
          id="ac-bill-template-host"
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            transform: "translateX(-200vw)",
            zIndex: -1,
            pointerEvents: "none",
          }}
        >
          <ACBillTemplate data={acShareData} />
        </div>
      )}

      {/* Analytics dashboard */}
      <BillsAnalytics />
    </div>
  );
};

// -------- AC room card --------
const ACRoomCard = ({
  roomNo, tenantCount, units, unitPrice, total, share,
  onUnitsChange, onPriceChange, onShare,
}: {
  roomNo: string; tenantCount: number; units: number; unitPrice: number; total: number; share: number;
  onUnitsChange: (u: number) => void; onPriceChange: (p: number) => void; onShare: () => void;
}) => {
  const [u, setU] = useState(String(units || ""));
  const [p, setP] = useState(String(unitPrice || 12));
  return (
    <Card className="border-cyan-500/20">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="h-4 w-4 text-cyan-500" />
            <span className="text-sm font-semibold">Room {roomNo}</span>
            <span className="text-xs text-muted-foreground">· {tenantCount} tenants</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onShare}>
            <Send className="h-3 w-3 mr-1" /> Share Bill
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Units</Label>
            <Input
              type="number" value={u} onChange={(e) => setU(e.target.value)}
              onBlur={() => onUnitsChange(parseInt(u) || 0)}
              placeholder="0" className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">₹/unit</Label>
            <Input
              type="number" value={p} onChange={(e) => setP(e.target.value)}
              onBlur={() => onPriceChange(parseInt(p) || 0)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Total</Label>
            <div className="h-8 flex items-center text-sm font-semibold">₹{total.toLocaleString()}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-between bg-cyan-500/5 rounded px-2 py-1.5">
          <span>Per tenant</span>
          <span className="font-bold text-cyan-700 dark:text-cyan-300">₹{share.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};