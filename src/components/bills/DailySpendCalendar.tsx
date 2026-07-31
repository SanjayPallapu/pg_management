import { useMemo, useState } from "react";
import { format, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Receipt, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MONTHS } from "@/constants/pricing";
import { cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseEntry } from "@/hooks/useExpenseEntries";

interface Props {
  month: number;
  year: number;
  entries: ExpenseEntry[];
}

const CAT_COLORS: Record<ExpenseCategory, string> = {
  current: "#4c37ed",
  utility: "#16b8d4",
  other: "#31b85b",
  family: "#f6a11a",
};

const formatShortCurrency = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${Math.round(val)}`;
};

const formatFullCurrency = (val: number) => `₹${Math.round(val).toLocaleString("en-IN")}`;

export const DailySpendCalendar = ({ month, year, entries }: Props) => {
  const [selectedDayEntries, setSelectedDayEntries] = useState<{ day: number; entries: ExpenseEntry[] } | null>(null);

  const monthDate = useMemo(() => new Date(year, month - 1, 1), [month, year]);
  const daysInMonth = useMemo(() => getDaysInMonth(monthDate), [monthDate]);

  // 0 = Sunday, 1 = Monday ... convert to Monday-start (0 = Mon, 6 = Sun)
  const startDayOffset = useMemo(() => {
    const rawDay = getDay(startOfMonth(monthDate));
    return (rawDay + 6) % 7;
  }, [monthDate]);

  // Map entries by day number (1 .. 31)
  const dayMap = useMemo(() => {
    const map = new Map<number, ExpenseEntry[]>();
    entries.forEach((e) => {
      const d = new Date(e.entry_date).getDate();
      const list = map.get(d) || [];
      list.push(e);
      map.set(d, list);
    });
    return map;
  }, [entries]);

  // Calculations
  const activeDaysCount = dayMap.size;
  const totalMonthSpend = entries.reduce((s, e) => s + e.amount, 0);
  const avgDailySpend = activeDaysCount > 0 ? Math.round(totalMonthSpend / activeDaysCount) : 0;

  const highestSpendDay = useMemo(() => {
    let maxDay = 0;
    let maxTotal = 0;
    dayMap.forEach((list, day) => {
      const tot = list.reduce((s, e) => s + e.amount, 0);
      if (tot > maxTotal) {
        maxTotal = tot;
        maxDay = day;
      }
    });
    return { day: maxDay, amount: maxTotal };
  }, [dayMap]);

  return (
    <div className="space-y-4">
      {/* Calendar Summary Bar */}
      <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-[#e2e4ed] bg-white p-3 shadow-sm dark:border-border dark:bg-card">
        <div className="text-center">
          <p className="text-[11px] font-semibold text-muted-foreground">Active days</p>
          <p className="text-base font-black text-[#101426] dark:text-white">{activeDaysCount} days</p>
        </div>
        <div className="border-x border-[#e2e4ed] px-2 text-center dark:border-border">
          <p className="text-[11px] font-semibold text-muted-foreground">Avg / active day</p>
          <p className="text-base font-black text-[#4936ef] dark:text-[#b6a2ff]">{formatShortCurrency(avgDailySpend)}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-semibold text-muted-foreground">Peak day</p>
          <p className="text-base font-black text-[#101426] dark:text-white">
            {highestSpendDay.day ? `Day ${highestSpendDay.day}` : "None"}
          </p>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="rounded-[24px] border border-[#e2e4ed] bg-white p-4 shadow-[0_14px_34px_-28px_rgba(25,30,58,.7)] dark:border-border dark:bg-card">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black">{MONTHS[month - 1]?.label} {year} Calendar</h3>
              <p className="text-xs text-muted-foreground">Daily expense breakdown</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-[#4936ef] dark:text-[#b6a2ff]">{formatFullCurrency(totalMonthSpend)}</span>
          </div>
        </div>

        {/* Weekday Labels */}
        <div className="mb-2 grid grid-cols-7 text-center text-xs font-black text-muted-foreground">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Offset blank cells */}
          {Array.from({ length: startDayOffset }).map((_, idx) => (
            <div key={`offset-${idx}`} className="h-14 rounded-xl bg-muted/20" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayEntries = dayMap.get(dayNum) || [];
            const dayTotal = dayEntries.reduce((s, e) => s + e.amount, 0);
            const hasSpend = dayEntries.length > 0;

            // Categories present on this day
            const categoriesOnDay = Array.from(new Set(dayEntries.map((e) => e.category)));

            return (
              <button
                key={dayNum}
                type="button"
                className={cn(
                  "flex h-14 flex-col items-center justify-between rounded-xl p-1 transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4936ef]",
                  hasSpend
                    ? "border border-[#4936ef]/30 bg-[#f1efff]/70 hover:bg-[#e4e0ff] dark:border-[#b6a2ff]/40 dark:bg-[#302858]/60 dark:hover:bg-[#302858]"
                    : "border border-transparent bg-muted/30 hover:bg-muted/60"
                )}
                onClick={() => hasSpend && setSelectedDayEntries({ day: dayNum, entries: dayEntries })}
                disabled={!hasSpend}
              >
                <span className={cn("text-xs font-bold", hasSpend ? "text-[#4936ef] dark:text-[#b6a2ff]" : "text-muted-foreground")}>
                  {dayNum}
                </span>

                {hasSpend ? (
                  <>
                    <span className="truncate text-[10px] font-black text-[#101426] dark:text-white">
                      {formatShortCurrency(dayTotal)}
                    </span>
                    <div className="flex gap-0.5 pb-0.5">
                      {categoriesOnDay.map((cat) => (
                        <span
                          key={cat}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: CAT_COLORS[cat] }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground/40">-</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Bills Dialog */}
      <Dialog open={Boolean(selectedDayEntries)} onOpenChange={(o) => !o && setSelectedDayEntries(null)}>
        <DialogContent className="max-w-[calc(100%-32px)] rounded-[26px] p-4 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <CalendarDays className="h-5 w-5 text-[#4936ef]" />
              {selectedDayEntries?.day} {MONTHS[month - 1]?.label} {year} Spending
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-2 max-h-[60vh] overflow-y-auto">
            {selectedDayEntries?.entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.label}</p>
                  <p className="text-xs text-muted-foreground capitalize">{e.category} {e.notes ? `· ${e.notes}` : ""}</p>
                </div>
                <p className="text-sm font-black shrink-0">{formatFullCurrency(e.amount)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t pt-3 font-black text-sm">
            <span>Day Total</span>
            <span className="text-[#4936ef] dark:text-[#b6a2ff]">
              {formatFullCurrency(selectedDayEntries?.entries.reduce((s, e) => s + e.amount, 0) || 0)}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
