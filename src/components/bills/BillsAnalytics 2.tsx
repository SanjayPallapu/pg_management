import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/proxyClient";
import { usePG } from "@/contexts/PGContext";
import { MONTHS } from "@/constants/pricing";
import { useMonthContext } from "@/contexts/MonthContext";
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { BarChart3, PieChart as PieIcon, TrendingUp, Activity } from "lucide-react";
import { ExpenseEntry } from "@/hooks/useExpenseEntries";

const CAT_COLORS: Record<string, string> = {
  current: "hsl(38 92% 50%)",
  utility: "hsl(199 89% 48%)",
  other: "hsl(262 83% 58%)",
  family: "hsl(330 81% 60%)",
};
const CAT_LABEL: Record<string, string> = {
  current: "Current", utility: "Utility", other: "Other", family: "Family",
};

export const BillsAnalytics = () => {
  const { currentPG } = usePG();
  const { selectedMonth, selectedYear } = useMonthContext();

  // Pull last 6 months of expenses for trend
  const { data: yearEntries = [] } = useQuery({
    queryKey: ["expense_entries_year", currentPG?.id, selectedYear, selectedMonth],
    queryFn: async () => {
      if (!currentPG?.id) return [];
      const { data, error } = await supabase
        .from("expense_entries").select("*")
        .eq("pg_id", currentPG.id)
        .order("entry_date", { ascending: true });
      if (error) throw error;
      return (data || []) as ExpenseEntry[];
    },
    enabled: !!currentPG?.id,
  });

  // Last 6 months window (ending selected)
  const trend = useMemo(() => {
    const out: { month: string; current: number; utility: number; other: number; family: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = selectedMonth - i, y = selectedYear;
      while (m <= 0) { m += 12; y--; }
      const rows = yearEntries.filter((e) => e.month === m && e.year === y);
      const sum = (cat: string) => rows.filter((r) => r.category === cat).reduce((s, r) => s + r.amount, 0);
      out.push({
        month: `${MONTHS[m - 1]?.label.slice(0, 3)} ${String(y).slice(-2)}`,
        current: sum("current"), utility: sum("utility"),
        other: sum("other"), family: sum("family"),
        total: rows.reduce((s, r) => s + r.amount, 0),
      });
    }
    return out;
  }, [yearEntries, selectedMonth, selectedYear]);

  // Current month breakdown for pie
  const currentBreakdown = useMemo(() => {
    const t = trend[trend.length - 1];
    if (!t) return [];
    return (["current", "utility", "other", "family"] as const).map((cat) => ({
      name: CAT_LABEL[cat], value: t[cat] as number, cat,
    })).filter((d) => d.value > 0);
  }, [trend]);

  // Daily spend for current month
  const dailySpend = useMemo(() => {
    const rows = yearEntries.filter((e) => e.month === selectedMonth && e.year === selectedYear);
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const d = r.entry_date?.slice(8, 10) || "01";
      map.set(d, (map.get(d) || 0) + r.amount);
    });
    return Array.from(map.entries())
      .map(([day, amount]) => ({ day, amount }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [yearEntries, selectedMonth, selectedYear]);

  const totalThis = trend[trend.length - 1]?.total ?? 0;
  const totalPrev = trend[trend.length - 2]?.total ?? 0;
  const delta = totalPrev > 0 ? ((totalThis - totalPrev) / totalPrev) * 100 : 0;
  const avg = trend.reduce((s, t) => s + t.total, 0) / Math.max(1, trend.length);

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-bold tracking-tight">Analytics</h2>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="This Month" value={`₹${totalThis.toLocaleString()}`} sub={`${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)}% vs prev`} tone={delta >= 0 ? "text-orange-500" : "text-emerald-500"} />
        <StatTile label="6-mo Avg" value={`₹${Math.round(avg).toLocaleString()}`} sub="Average monthly spend" tone="text-primary" />
      </div>

      {/* 6-month trend area chart */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> 6-Month Trend</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#gTotal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category split pie + bar */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="p-3">
            <span className="text-xs font-semibold flex items-center gap-1"><PieIcon className="h-3 w-3" /> Category Split</span>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={currentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={2}>
                  {currentBreakdown.map((d) => (
                    <Cell key={d.cat} fill={CAT_COLORS[d.cat]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <span className="text-xs font-semibold flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Categories x Month</span>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Bar dataKey="current" stackId="a" fill={CAT_COLORS.current} />
                <Bar dataKey="utility" stackId="a" fill={CAT_COLORS.utility} />
                <Bar dataKey="other" stackId="a" fill={CAT_COLORS.other} />
                <Bar dataKey="family" stackId="a" fill={CAT_COLORS.family} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily spend line */}
      <Card>
        <CardContent className="p-3">
          <span className="text-xs font-semibold flex items-center gap-1"><Activity className="h-3 w-3" /> Daily Spend (this month)</span>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailySpend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const StatTile = ({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) => (
  <Card>
    <CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
      <div className={`text-[11px] mt-0.5 ${tone}`}>{sub}</div>
    </CardContent>
  </Card>
);