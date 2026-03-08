import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { isTenantActiveInMonth, hasTenantLeftNow } from '@/utils/dateOnly';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TenantsByDueDaySheet } from './TenantsByDueDaySheet';

export const ExpectedCollectionCard = () => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const [collectionFromDay, setCollectionFromDay] = useState<number>(1);
  const [collectionToDay, setCollectionToDay] = useState<number>(31);
  const [selectedDueDay, setSelectedDueDay] = useState<number | null>(null);
  const [dueDaySheetOpen, setDueDaySheetOpen] = useState(false);

  const collectionScheduleData = useMemo(() => {
    const scheduleByDay: Record<number, { day: number; expected: number; tenants: number }> = {};
    
    const allTenants = rooms.flatMap(room =>
      room.tenants
        .filter(tenant =>
          isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth) &&
          !hasTenantLeftNow(tenant.endDate)
        )
        .map(tenant => ({ ...tenant, roomNo: room.roomNo }))
    );

    allTenants.forEach(tenant => {
      const payment = payments.find(p =>
        p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
      );
      
      if (!payment || payment.paymentStatus === 'Pending') {
        const joinDay = new Date(tenant.startDate).getDate();
        if (!scheduleByDay[joinDay]) {
          scheduleByDay[joinDay] = { day: joinDay, expected: 0, tenants: 0 };
        }
        scheduleByDay[joinDay].expected += tenant.monthlyRent;
        scheduleByDay[joinDay].tenants++;
      }
    });

    return Object.values(scheduleByDay).sort((a, b) => a.day - b.day);
  }, [rooms, payments, selectedMonth, selectedYear]);

  const filteredData = useMemo(() => {
    return collectionScheduleData.filter(
      item => item.day >= collectionFromDay && item.day <= collectionToDay
    );
  }, [collectionScheduleData, collectionFromDay, collectionToDay]);

  const filteredTotal = useMemo(() => filteredData.reduce((sum, item) => sum + item.expected, 0), [filteredData]);
  const filteredTenantCount = useMemo(() => filteredData.reduce((sum, item) => sum + item.tenants, 0), [filteredData]);

  if (collectionScheduleData.length === 0) return null;

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <div>
              <h3 className="font-semibold text-sm">Expected Collection by Due Date</h3>
              <p className="text-xs text-muted-foreground">Amount pending grouped by tenant joining day</p>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 flex-wrap p-2 bg-muted/30 rounded-lg">
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Day</span>
              <Select value={collectionFromDay.toString()} onValueChange={(v) => setCollectionFromDay(parseInt(v))}>
                <SelectTrigger className="w-16 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">to</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Day</span>
              <Select value={collectionToDay.toString()} onValueChange={(v) => setCollectionToDay(parseInt(v))}>
                <SelectTrigger className="w-16 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => { setCollectionFromDay(1); setCollectionToDay(31); }}
            >
              Reset
            </Button>
          </div>

          {/* Summary */}
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">
                  Expected from Day {collectionFromDay} to Day {collectionToDay}
                </div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  ₹{filteredTotal.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Tenants</div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {filteredTenantCount}
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 bg-muted/30 rounded-lg p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => `${d}`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={40} />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Expected']}
                  labelFormatter={(day) => `Due on ${day}th`}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="expected" fill="hsl(262, 83%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Day buttons grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {filteredData.map(item => (
              <button
                key={item.day}
                className="p-2 bg-purple-500/10 rounded-lg hover:bg-purple-500/20 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedDueDay(item.day);
                  setDueDaySheetOpen(true);
                }}
              >
                <div className="text-xs text-muted-foreground">Day {item.day}</div>
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">₹{item.expected.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{item.tenants} tenant(s)</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <TenantsByDueDaySheet
        open={dueDaySheetOpen}
        onOpenChange={setDueDaySheetOpen}
        day={selectedDueDay}
        rooms={rooms}
        payments={payments}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </>
  );
};
