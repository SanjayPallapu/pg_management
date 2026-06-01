import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Room, TenantPayment } from "@/types";
import { cn } from "@/lib/utils";
import { isTenantActiveInMonth } from "@/utils/dateOnly";

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
        (t) => !t.isLocked && isTenantActiveInMonth(t.startDate, t.endDate, year, month),
      );
      if (active.length === 0) return { roomNo: room.roomNo, status: "vacant" as Status };

      const statuses = active.map<Status>((t) => {
        const p = payments.find((pp) => pp.tenantId === t.id && pp.month === month && pp.year === year);
        const paid = p?.amountPaid || 0;
        if (paid >= t.monthlyRent && t.monthlyRent > 0) return "paid";
        if (paid > 0) return "partial";
        if (!isCurrent || (isCurrent && todayDate >= new Date(t.startDate).getDate())) return "overdue";
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
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="text-xs font-semibold text-muted-foreground mb-2">Quick Room Access</div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <button
              key={item.roomNo}
              onClick={() => onSelect(item.roomNo)}
              className={cn(
                "min-w-[44px] px-2 py-1.5 text-xs font-semibold rounded-md border transition-all hover:scale-105 active:scale-95",
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
      </CardContent>
    </Card>
  );
};
