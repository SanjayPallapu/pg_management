import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Room, TenantPayment } from "@/types";
import { cn } from "@/lib/utils";
import { isTenantActiveInMonth, hasTenantLeftNow } from "@/utils/dateOnly";
import { ChevronDown } from "lucide-react";

interface Props {
  rooms: Room[];
  payments: TenantPayment[];
  month: number;
  year: number;
  onSelect: (roomNo: string) => void;
}

type Status = "paid" | "partial" | "overdue" | "not-due" | "vacant";

const colorFor: Record<Status, string> = {
  paid: "bg-paid-muted text-paid border-paid/40",
  partial: "bg-partial-muted text-partial border-partial/40",
  overdue: "bg-overdue-muted text-overdue border-overdue/40",
  "not-due": "bg-not-due-muted text-not-due border-not-due/40",
  vacant: "bg-muted text-muted-foreground border-border",
};

export const RoomQuickNav = ({ rooms, payments, month, year, onSelect }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const items = useMemo(() => {
    const today = new Date();
    const isCurrent = today.getMonth() + 1 === month && today.getFullYear() === year;
    const todayDate = today.getDate();

    const sorted = [...rooms].sort((a, b) => {
      if (a.floor !== b.floor) return a.floor - b.floor;
      return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
    });

    return sorted.map((room) => {
      const active = room.tenants.filter(
        (t) => !t.isLocked && isTenantActiveInMonth(t.startDate, t.endDate, year, month) && !hasTenantLeftNow(t.endDate),
      );

      if (active.length === 0) return { roomNo: room.roomNo, status: "vacant" as Status };

      const statuses = active.map<Status>((t) => {
        const p = payments.find((pp) => pp.tenantId === t.id && pp.month === month && pp.year === year);
        if (p?.paymentStatus === "Paid") return "paid";
        
        let paid = p?.amountPaid || 0;
        if (paid === 0 && p?.paymentEntries?.length) {
          paid = p.paymentEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0);
        }
        if (paid >= t.monthlyRent && t.monthlyRent > 0) return "paid";
        if (p?.paymentStatus === "Partial" || paid > 0) return "partial";
        
        const isPast = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth() + 1);
        if (isPast || (isCurrent && todayDate >= new Date(t.startDate).getDate())) return "overdue";
        
        return "not-due";
      });
      // worst-of (overdue > partial > not-due > paid) so urgent rooms stand out
      if (statuses.includes("overdue")) return { roomNo: room.roomNo, status: "overdue" as Status };
      if (statuses.includes("partial")) return { roomNo: room.roomNo, status: "partial" as Status };
      if (statuses.includes("not-due") && !statuses.every((s) => s === "paid"))
        return { roomNo: room.roomNo, status: "not-due" as Status };
      return { roomNo: room.roomNo, status: "paid" as Status };
    });
  }, [rooms, payments, month, year]);

  if (rooms.length === 0) return null;

  return (
    <Card className="mb-3 rounded-xl border-border/60">
      <CardContent className="p-2.5">
        <button
          type="button"
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground mb-0 cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Quick Room Access</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", isExpanded && "rotate-180")} />
        </button>
        <div className={cn("quick-room-strip", isExpanded ? "expanded mt-2" : "collapsed")}>
          <div className="grid grid-cols-7 gap-1.5 p-2 sm:p-3 rounded-xl bg-muted/20 border border-border/40">
            {items.map((item) => (
              <button
                key={item.roomNo}
                onClick={() => onSelect(item.roomNo)}
                type="button"
                className={cn(
                  "w-full h-9 px-1 text-xs font-bold rounded-lg border transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-sm cursor-pointer",
                  colorFor[item.status],
                )}
                title={`Room ${item.roomNo} • ${item.status}`}
              >
                {item.roomNo}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-paid" />Paid</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-partial" />Partial</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-overdue" />Overdue</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-not-due" />Not due</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
