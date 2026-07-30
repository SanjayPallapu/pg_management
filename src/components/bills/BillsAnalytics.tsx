import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, ChevronRight, PieChart as PieIcon, TrendingUp, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { MONTHS } from "@/constants/pricing";
import { useMonthContext } from "@/contexts/MonthContext";
import { cn } from "@/lib/utils";
import { ExpenseEntry } from "@/hooks/useExpenseEntries";

type Range = "1M" | "6M" | "1Y";

const CAT_COLORS: Record<string, string> = {
  current: "#4c37ed",
  utility: "#16b8d4",
  other: "#31b85b",
  family: "#f6a11a",
};

const CAT_LABEL: Record<string, string> = {
  current: "Current",
  utility: "Utilities",
  other: "Other",
  family: "Family",
};

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export const BillsAnalytics = () => {
  const { currentPG } = usePG();
  const { selectedMonth, selectedYear } = useMonthContext();
  const [range, setRange] = useState<Range>("6M");

  const { data: allEntries = [], isLoading, isError } = useQuery({
    queryKey: ["expense_entries_analytics", currentPG?.id],
    queryFn: async () => {
      if (!currentPG?.id) return [];
      const { data, error } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("pg_id", currentPG.id)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return (data || []) as ExpenseEntry[];
    },
    enabled: Boolean(currentPG?.id),
  });

  const monthsToShow = range === "1M" ? 1 : range === "6M" ? 6 : 12;
  const trend = useMemo(() => {
    const out: { month: string; current: number; utility: number; other: number; family: number; total: number }[] = [];
    for (let index = monthsToShow - 1; index >= 0; index -= 1) {
      let month = selectedMonth - index;
      let year = selectedYear;
      while (month <= 0) {
        month += 12;
        year -= 1;
      }
      const rows = allEntries.filter((entry) => entry.month === month && entry.year === year);
      const sum = (category: string) =>
        rows.filter((row) => row.category === category).reduce((total, row) => total + row.amount, 0);
      out.push({
        month: monthsToShow === 12
          ? MONTHS[month - 1]?.short
          : `${MONTHS[month - 1]?.short} ${String(year).slice(-2)}`,
        current: sum("current"),
        utility: sum("utility"),
        other: sum("other"),
        family: sum("family"),
        total: rows.reduce((total, row) => total + row.amount, 0),
      });
    }
    return out;
  }, [allEntries, monthsToShow, selectedMonth, selectedYear]);

  const currentRows = useMemo(
    () => allEntries.filter((entry) => entry.month === selectedMonth && entry.year === selectedYear),
    [allEntries, selectedMonth, selectedYear],
  );
  const currentBreakdown = useMemo(
    () =>
      (["current", "utility", "other", "family"] as const)
        .map((category) => ({
          name: CAT_LABEL[category],
          value: currentRows.filter((entry) => entry.category === category).reduce((total, entry) => total + entry.amount, 0),
          category,
        }))
        .filter((item) => item.value > 0),
    [currentRows],
  );
  const dailySpend = useMemo(() => {
    const map = new Map<string, number>();
    currentRows.forEach((entry) => {
      const day = entry.entry_date?.slice(8, 10) || "01";
      map.set(day, (map.get(day) || 0) + entry.amount);
    });
    return Array.from(map.entries())
      .map(([day, amount]) => ({ day, amount }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [currentRows]);

  const totalThisMonth = currentRows.reduce((total, entry) => total + entry.amount, 0);
  const previousMonth = trend.length > 1 ? trend[trend.length - 2]?.total ?? 0 : 0;
  const delta = previousMonth > 0 ? ((totalThisMonth - previousMonth) / previousMonth) * 100 : 0;
  const average = trend.reduce((total, item) => total + item.total, 0) / Math.max(1, trend.length);
  const hasTrendData = trend.some((item) => item.total > 0);
  const monthLabel = `${MONTHS[selectedMonth - 1]?.label} ${selectedYear}`;

  if (isLoading) {
    return (
      <div className="space-y-3 py-3" aria-label="Loading spending analytics">
        <div className="h-[52px] animate-pulse rounded-[18px] bg-[#e9eaf1]" />
        <div className="grid grid-cols-2 gap-2.5"><div className="h-28 animate-pulse rounded-[22px] bg-[#e9eaf1]" /><div className="h-28 animate-pulse rounded-[22px] bg-[#e9eaf1]" /></div>
        <div className="h-64 animate-pulse rounded-[24px] bg-[#e9eaf1]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="my-6 rounded-[24px] border border-[#f1c9cf] bg-white p-6 text-center dark:border-white/10 dark:bg-[#181a22]">
        <BarChart3 className="mx-auto h-8 w-8 text-[#4936ef]" />
        <p className="mt-3 font-black">Analytics could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">Your bill entries are still available from the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-3">
      <div className="mx-auto grid h-[52px] w-full max-w-[390px] grid-cols-3 rounded-[18px] border border-[#e0e2ea] bg-white p-1 dark:border-white/10 dark:bg-[#181a22]" role="tablist" aria-label="Analytics period">
        {(["1M", "6M", "1Y"] as Range[]).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={range === option}
            className={cn("min-h-11 rounded-[14px] text-sm font-black", range === option ? "bg-[#4936ef] text-white shadow-sm" : "text-[#515669] dark:text-white/70")}
            onClick={() => setRange(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          icon={WalletCards}
          label="This month"
          value={formatCurrency(totalThisMonth)}
          sub={previousMonth > 0 ? `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs previous` : "No change"}
        />
        <StatCard
          icon={BarChart3}
          label={`${range} average`}
          value={formatCurrency(average)}
          sub="Average monthly spend"
        />
      </div>

      <section className="rounded-[24px] border border-[#e2e4ed] bg-white p-4 shadow-[0_14px_34px_-28px_rgba(25,30,58,.7)] dark:border-white/10 dark:bg-[#181a22]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black">{range === "1M" ? "Monthly activity" : `${range === "6M" ? "6-month" : "12-month"} trend`}</h2>
            <p className="text-xs text-muted-foreground">Total spend over time</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef]"><TrendingUp className="h-5 w-5" /></div>
        </div>
        <div className="relative mt-2 h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 12, right: 8, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id="analyticsTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4c37ed" stopOpacity={0.26} />
                  <stop offset="95%" stopColor="#4c37ed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={10} stroke="#818699" />
              <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#818699" />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 14, border: "1px solid #e2e4ed", fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#4c37ed" fill="url(#analyticsTotal)" strokeWidth={3} dot={{ r: 3, fill: "#4c37ed" }} />
            </AreaChart>
          </ResponsiveContainer>
          {!hasTrendData && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1efff]/90 text-[#7563e9]"><TrendingUp className="h-6 w-6" /></div>
              <p className="mt-2 text-sm font-bold text-[#61667a]">Not enough data for a trend yet</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e2e4ed] bg-white p-4 shadow-[0_14px_34px_-28px_rgba(25,30,58,.7)] dark:border-white/10 dark:bg-[#181a22]">
        <div className="flex items-center justify-between">
          <div><h2 className="text-base font-black">Category split</h2><p className="text-xs text-muted-foreground">{monthLabel}</p></div>
          <PieIcon className="h-5 w-5 text-[#4936ef]" />
        </div>
        <div className="mt-3 flex min-h-[150px] items-center gap-3">
          <div className="relative h-[142px] w-[142px] shrink-0">
            {currentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={currentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3}>
                    {currentBreakdown.map((item) => <Cell key={item.category} fill={CAT_COLORS[item.category]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: 14, border: "1px solid #e2e4ed", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#f1efff]">
                <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full border border-dashed border-[#aaa0ef] bg-white text-[#9287dd] dark:bg-[#181a22]"><WalletCards className="h-6 w-6" /></div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#555a6e] dark:text-white/70">{currentBreakdown.length ? `${formatCurrency(totalThisMonth)} total` : `No category spending in ${MONTHS[selectedMonth - 1]?.label}`}</p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {Object.entries(CAT_LABEL).map(([category, label]) => (
                <div key={category} className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[category] }} /><span className="truncate">{label}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <button type="button" className="flex min-h-[76px] w-full items-center rounded-[20px] border border-[#e2e4ed] bg-white px-4 text-left dark:border-white/10 dark:bg-[#181a22]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef]"><CalendarDays className="h-5 w-5" /></div>
        <div className="ml-3 min-w-0 flex-1"><p className="text-sm font-black">Daily spend</p><p className="truncate text-xs text-muted-foreground">{dailySpend.length ? `${dailySpend.length} active ${dailySpend.length === 1 ? "day" : "days"} this month` : "No activity this month"}</p></div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
}) => (
  <div className="min-h-[116px] rounded-[22px] border border-[#e2e4ed] bg-white p-3.5 shadow-[0_12px_28px_-26px_rgba(25,30,58,.7)] dark:border-white/10 dark:bg-[#181a22]">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef]"><Icon className="h-5 w-5" /></div>
    <p className="mt-2 text-xs text-muted-foreground">{label}</p>
    <p className="text-xl font-black">{value}</p>
    <p className="truncate text-[10px] text-muted-foreground">{sub}</p>
  </div>
);
