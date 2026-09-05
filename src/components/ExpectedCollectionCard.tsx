import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronDown, MessageCircle, Phone, User, ArrowLeft, CalendarClock, Clock, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMonthContext } from '@/contexts/MonthContext';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useRooms } from '@/hooks/useRooms';
import { isTenantActiveInMonth, hasTenantLeftNow, parseDateOnly } from '@/utils/dateOnly';
import { format } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TenantsByDueDaySheet } from './TenantsByDueDaySheet';

export const ExpectedCollectionCard = ({ 
  defaultOpen = false, 
  open,
  onOpenChange,
  onClose, 
  showSummaryCard = true 
}: { 
  defaultOpen?: boolean; 
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void; 
  showSummaryCard?: boolean;
}) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { payments } = useTenantPayments();
  const { rooms } = useRooms();
  const isMobile = useIsMobile();
  
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const isOpen = open !== undefined ? open : localOpen;
  
  const setIsOpen = (val: boolean) => {
    if (onOpenChange) {
      onOpenChange(val);
    } else {
      setLocalOpen(val);
    }
    if (!val) {
      onClose?.();
    }
  };

  const today = new Date();
  const todayDate = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;
  const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth);

  const [activeFilter, setActiveFilter] = useState<'all' | 'delayed' | 'upcoming' | 'past-due' | 'custom'>('all');
  const [collectionFromDay, setCollectionFromDay] = useState<number>(1);
  const [collectionToDay, setCollectionToDay] = useState<number>(31);
  const [selectedDueDay, setSelectedDueDay] = useState<number | null>(null);
  const [dueDaySheetOpen, setDueDaySheetOpen] = useState(false);

  type DueTenant = {
    id: string;
    name: string;
    phone: string;
    roomNo: string;
    monthlyRent: number;
    amountPaid: number;
    balance: number;
    isPartial: boolean;
    startDate: string;
    joinDay: number;
    paymentDueDay?: number | null;
    paymentDelayDays?: number | null;
    hasAgreedDelay: boolean;
    isDelayedWithinGrace: boolean;
    isOverduePastAgreed: boolean;
    isStandardOverdue: boolean;
    isDueToday: boolean;
  };

  const collectionScheduleData = useMemo(() => {
    const scheduleByDay: Record<number, { 
      day: number; 
      expected: number; 
      tenants: number; 
      delayedCount: number;
      regularCount: number;
      delayedExpected: number;
      regularExpected: number;
      list: DueTenant[] 
    }> = {};

    const allTenants = rooms.flatMap(room =>
      room.tenants
        .filter(tenant =>
          !tenant.isLocked &&
          isTenantActiveInMonth(tenant.startDate, tenant.endDate, selectedYear, selectedMonth) &&
          !hasTenantLeftNow(tenant.endDate)
        )
        .map(tenant => ({ ...tenant, roomNo: room.roomNo }))
    );

    allTenants.forEach(tenant => {
      const payment = payments.find(p =>
        p.tenantId === tenant.id && p.month === selectedMonth && p.year === selectedYear
      );

      const status = payment?.paymentStatus;
      const isPaid = status === 'Paid';
      if (isPaid) return;

      const amountPaid = payment?.amountPaid || 0;
      const balance = Math.max(0, tenant.monthlyRent - amountPaid);
      if (balance === 0) return;

      const joinDate = parseDateOnly(tenant.startDate);
      const joinDay = joinDate.getDate();
      const hasAgreedDelay = typeof tenant.paymentDueDay === 'number' && tenant.paymentDueDay >= 1 && tenant.paymentDueDay <= 31;
      const effectiveDueDay = hasAgreedDelay ? tenant.paymentDueDay! : joinDay;

      const isDueToday = isCurrentMonth && effectiveDueDay === todayDate;
      const isDelayedWithinGrace = Boolean(hasAgreedDelay && isCurrentMonth && todayDate <= effectiveDueDay);
      const isOverduePastAgreed = Boolean(hasAgreedDelay && (isPastMonth || (isCurrentMonth && todayDate > effectiveDueDay)));
      const isStandardOverdue = Boolean(!hasAgreedDelay && (isPastMonth || (isCurrentMonth && todayDate > effectiveDueDay)));

      if (!scheduleByDay[effectiveDueDay]) {
        scheduleByDay[effectiveDueDay] = { 
          day: effectiveDueDay, 
          expected: 0, 
          tenants: 0, 
          delayedCount: 0,
          regularCount: 0,
          delayedExpected: 0,
          regularExpected: 0,
          list: [] 
        };
      }
      scheduleByDay[effectiveDueDay].expected += balance;
      scheduleByDay[effectiveDueDay].tenants++;
      if (hasAgreedDelay) {
        scheduleByDay[effectiveDueDay].delayedCount++;
        scheduleByDay[effectiveDueDay].delayedExpected += balance;
      } else {
        scheduleByDay[effectiveDueDay].regularCount++;
        scheduleByDay[effectiveDueDay].regularExpected += balance;
      }

      scheduleByDay[effectiveDueDay].list.push({
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        roomNo: tenant.roomNo,
        monthlyRent: tenant.monthlyRent,
        amountPaid,
        balance,
        isPartial: amountPaid > 0,
        startDate: tenant.startDate,
        joinDay,
        paymentDueDay: tenant.paymentDueDay,
        paymentDelayDays: tenant.paymentDelayDays,
        hasAgreedDelay,
        isDelayedWithinGrace,
        isOverduePastAgreed,
        isStandardOverdue,
        isDueToday,
      });
    });

    return Object.values(scheduleByDay).sort((a, b) => a.day - b.day);
  }, [rooms, payments, selectedMonth, selectedYear, isCurrentMonth, isPastMonth, todayDate]);

  // Overall Month Totals & Delayed Stats
  const monthTotals = useMemo(() => {
    let totalExpected = 0;
    let totalTenants = 0;
    let delayedExpected = 0;
    let delayedTenants = 0;
    let upcomingExpected = 0;
    let upcomingTenants = 0;
    let pastDueExpected = 0;
    let pastDueTenants = 0;

    collectionScheduleData.forEach(item => {
      totalExpected += item.expected;
      totalTenants += item.tenants;

      item.list.forEach(t => {
        if (t.hasAgreedDelay) {
          delayedExpected += t.balance;
          delayedTenants++;
        }
        if (isCurrentMonth) {
          if (item.day >= todayDate) {
            upcomingExpected += t.balance;
            upcomingTenants++;
          } else {
            pastDueExpected += t.balance;
            pastDueTenants++;
          }
        } else if (isPastMonth) {
          pastDueExpected += t.balance;
          pastDueTenants++;
        } else {
          upcomingExpected += t.balance;
          upcomingTenants++;
        }
      });
    });

    return {
      totalExpected,
      totalTenants,
      delayedExpected,
      delayedTenants,
      upcomingExpected,
      upcomingTenants,
      pastDueExpected,
      pastDueTenants,
    };
  }, [collectionScheduleData, isCurrentMonth, isPastMonth, todayDate]);

  // Filtered days based on active filter
  const filteredData = useMemo(() => {
    if (activeFilter === 'delayed') {
      return collectionScheduleData
        .filter(item => item.delayedCount > 0)
        .map(item => ({
          ...item,
          expected: item.delayedExpected,
          tenants: item.delayedCount,
          list: item.list.filter(t => t.hasAgreedDelay)
        }));
    }
    if (activeFilter === 'upcoming') {
      if (!isCurrentMonth) return collectionScheduleData;
      return collectionScheduleData.filter(item => item.day >= todayDate);
    }
    if (activeFilter === 'past-due') {
      if (!isCurrentMonth) return isPastMonth ? collectionScheduleData : [];
      return collectionScheduleData.filter(item => item.day < todayDate);
    }
    if (activeFilter === 'custom') {
      return collectionScheduleData.filter(
        item => item.day >= collectionFromDay && item.day <= collectionToDay
      );
    }
    // 'all'
    return collectionScheduleData;
  }, [collectionScheduleData, activeFilter, isCurrentMonth, isPastMonth, todayDate, collectionFromDay, collectionToDay]);

  const filteredTotal = useMemo(() => filteredData.reduce((sum, item) => sum + item.expected, 0), [filteredData]);
  const filteredTenantCount = useMemo(() => filteredData.reduce((sum, item) => sum + item.tenants, 0), [filteredData]);

  const openWhatsAppChat = (tenant: DueTenant) => {
    const formattedPhone = tenant.phone.replace(/\D/g, '');
    const phoneWithCode = formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`;
    let msg = '';
    if (tenant.hasAgreedDelay) {
      if (tenant.isDelayedWithinGrace) {
        msg = `Hi ${tenant.name}, friendly reminder for your agreed rent payment of ₹${tenant.balance.toLocaleString()} for Room ${tenant.roomNo}, scheduled for the ${tenant.paymentDueDay}th. Thank you!`;
      } else {
        msg = `Hi ${tenant.name}, your agreed rent payment of ₹${tenant.balance.toLocaleString()} for Room ${tenant.roomNo} was due on the ${tenant.paymentDueDay}th and is now pending. Please clear it at your earliest convenience. Thank you!`;
      }
    } else {
      msg = `Hi ${tenant.name}, your rent payment of ₹${tenant.balance.toLocaleString()} for Room ${tenant.roomNo} is pending. Please pay at your earliest convenience. Thank you!`;
    }
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (collectionScheduleData.length === 0) return null;

  return (
    <>
      {showSummaryCard && (
        <Card 
          className="cursor-pointer transition-all hover:shadow-md border bg-card hover:bg-muted/30"
          onClick={() => setIsOpen(true)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 shrink-0">
                <Calendar className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-sm text-foreground">Expected Collection Schedule</h3>
                <p className="text-xs text-muted-foreground">
                  ₹{monthTotals.totalExpected.toLocaleString()} from {monthTotals.totalTenants} tenants
                  {monthTotals.delayedTenants > 0 && ` (${monthTotals.delayedTenants} agreed delayed)`}
                </p>
              </div>
            </div>
            <span className="text-xs text-primary font-medium shrink-0">View details →</span>
          </CardContent>
        </Card>
      )}

      <Sheet open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) onClose?.(); }}>
        <SheetContent side="right" className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden" : "w-full sm:max-w-xl p-0"}>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header */}
            <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setIsOpen(false)} aria-label="Back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <SheetTitle className="text-base text-foreground font-bold truncate">
                      Expected Rent Schedule
                    </SheetTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {months[selectedMonth - 1]} {selectedYear} • Cash Flow Timeline
                  </p>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-3">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Total Expected */}
                <div className="p-3 bg-card rounded-xl border border-border/70 shadow-xs">
                  <div className="text-[11px] font-medium text-muted-foreground">Total Expected</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    ₹{monthTotals.totalExpected.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {monthTotals.totalTenants} tenant(s) pending
                  </div>
                </div>

                {/* Agreed Delayed */}
                <div 
                  onClick={() => setActiveFilter('delayed')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
                    activeFilter === 'delayed'
                      ? 'bg-purple-500/15 border-purple-500 ring-2 ring-purple-500/30'
                      : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Agreed Delayed
                    </span>
                    {activeFilter === 'delayed' && (
                      <span className="text-[9px] font-bold uppercase text-purple-700 dark:text-purple-300 bg-purple-200/80 dark:bg-purple-900 px-1 rounded">Active</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-0.5">
                    ₹{monthTotals.delayedExpected.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-purple-700/80 dark:text-purple-400 mt-0.5">
                    {monthTotals.delayedTenants} tenant(s) promised
                  </div>
                </div>

                {/* Upcoming / Ahead */}
                <div 
                  onClick={() => setActiveFilter('upcoming')}
                  className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs col-span-2 sm:col-span-1 ${
                    activeFilter === 'upcoming'
                      ? 'bg-blue-500/15 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Today Onwards
                    </span>
                    {activeFilter === 'upcoming' && (
                      <span className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-300 bg-blue-200/80 dark:bg-blue-900 px-1 rounded">Active</span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">
                    ₹{monthTotals.upcomingExpected.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-blue-700/80 dark:text-blue-400 mt-0.5">
                    {monthTotals.upcomingTenants} due ahead
                  </div>
                </div>
              </div>

              {/* Quick Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <Button
                  type="button"
                  size="sm"
                  variant={activeFilter === 'all' ? 'default' : 'outline'}
                  className={`h-7 text-xs px-2.5 rounded-full shrink-0 font-medium ${activeFilter === 'all' ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  All Month (31d)
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={activeFilter === 'delayed' ? 'default' : 'outline'}
                  className={`h-7 text-xs px-2.5 rounded-full shrink-0 font-semibold gap-1 ${
                    activeFilter === 'delayed'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100'
                  }`}
                  onClick={() => setActiveFilter('delayed')}
                >
                  <CalendarClock className="h-3 w-3" />
                  Agreed Delay ({monthTotals.delayedTenants})
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant={activeFilter === 'upcoming' ? 'default' : 'outline'}
                  className={`h-7 text-xs px-2.5 rounded-full shrink-0 font-medium ${activeFilter === 'upcoming' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                  onClick={() => setActiveFilter('upcoming')}
                >
                  Upcoming ({monthTotals.upcomingTenants})
                </Button>

                {monthTotals.pastDueTenants > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant={activeFilter === 'past-due' ? 'default' : 'outline'}
                    className={`h-7 text-xs px-2.5 rounded-full shrink-0 font-medium ${
                      activeFilter === 'past-due'
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300'
                    }`}
                    onClick={() => setActiveFilter('past-due')}
                  >
                    Past Due ({monthTotals.pastDueTenants})
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant={activeFilter === 'custom' ? 'default' : 'outline'}
                  className="h-7 text-xs px-2.5 rounded-full shrink-0"
                  onClick={() => setActiveFilter('custom')}
                >
                  Custom Range
                </Button>
              </div>

              {/* Custom Date Range Picker (shown when custom filter is active) */}
              {activeFilter === 'custom' && (
                <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-xl border border-border/50 text-xs">
                  <span className="font-semibold text-muted-foreground">Range:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Day</span>
                    <Select value={collectionFromDay.toString()} onValueChange={(v) => setCollectionFromDay(parseInt(v))}>
                      <SelectTrigger className="w-16 h-7 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-muted-foreground">to</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Day</span>
                    <Select value={collectionToDay.toString()} onValueChange={(v) => setCollectionToDay(parseInt(v))}>
                      <SelectTrigger className="w-16 h-7 text-xs bg-background">
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
                    className="h-7 text-xs px-2 ml-auto"
                    onClick={() => { setCollectionFromDay(1); setCollectionToDay(31); }}
                  >
                    Reset
                  </Button>
                </div>
              )}

              {/* Active Filter Summary Bar */}
              <div className="flex items-center justify-between px-3 py-2 bg-card rounded-xl border border-border/50">
                <div className="text-xs">
                  <span className="text-muted-foreground">Showing: </span>
                  <span className="font-semibold text-foreground">
                    {activeFilter === 'delayed'
                      ? 'Agreed Delayed Tenants'
                      : activeFilter === 'upcoming'
                        ? 'Today & Upcoming Collections'
                        : activeFilter === 'past-due'
                          ? 'Past Due Collections'
                          : activeFilter === 'custom'
                            ? `Days ${collectionFromDay} - ${collectionToDay}`
                            : 'All Collections in Month'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-primary">
                    ₹{filteredTotal.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-1">
                    ({filteredTenantCount} tenants)
                  </span>
                </div>
              </div>

              {/* Chart */}
              {filteredData.length > 0 && (
                <div className="h-44 bg-card rounded-xl p-2.5 border border-border/50">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => `${d}`} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={35} />
                      <Tooltip
                        formatter={(value: number, _name: string, props: any) => {
                          const payload = props?.payload;
                          const delayed = payload?.delayedCount || 0;
                          const regular = payload?.regularCount || 0;
                          return [
                            `₹${value.toLocaleString()} (${regular} regular, ${delayed} delayed)`,
                            'Expected'
                          ];
                        }}
                        labelFormatter={(day) => `Due on Day ${day}`}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="expected" radius={[4, 4, 0, 0]}>
                        {filteredData.map((entry) => {
                          const hasDelayed = entry.delayedCount > 0;
                          const isPast = isCurrentMonth && entry.day < todayDate;
                          const isToday = isCurrentMonth && entry.day === todayDate;
                          const color = isToday 
                            ? '#10b981' 
                            : hasDelayed 
                              ? '#9333ea' 
                              : isPast 
                                ? '#f59e0b' 
                                : '#6366f1';
                          return <Cell key={`cell-${entry.day}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Day Groupings List */}
              <div className="space-y-2.5 pt-1">
                {filteredData.length === 0 ? (
                  <div className="text-center py-10 bg-card rounded-xl border border-dashed text-muted-foreground space-y-1">
                    <CalendarClock className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm font-medium">No collections matching this filter</p>
                    <p className="text-xs opacity-75">Try switching to "All Month" to view full schedule.</p>
                  </div>
                ) : (
                  filteredData.map(item => {
                    const isToday = isCurrentMonth && item.day === todayDate;
                    const isPast = isCurrentMonth && item.day < todayDate;
                    const daysRemaining = item.day - todayDate;

                    return (
                      <div
                        key={item.day}
                        className={`rounded-2xl border transition-all overflow-hidden bg-card ${
                          item.delayedCount > 0
                            ? 'border-purple-300 dark:border-purple-800/80 shadow-xs'
                            : isToday
                              ? 'border-emerald-500/60 ring-2 ring-emerald-500/20'
                              : 'border-border/60 shadow-xs'
                        }`}
                      >
                        {/* Day header */}
                        <button
                          className={`w-full flex items-center justify-between gap-2 p-3 text-left transition-colors ${
                            item.delayedCount > 0
                              ? 'bg-purple-500/10 hover:bg-purple-500/15'
                              : isToday
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                                : 'bg-muted/30 hover:bg-muted/50'
                          }`}
                          onClick={() => {
                            setSelectedDueDay(item.day);
                            setDueDaySheetOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm shrink-0 shadow-xs ${
                              item.delayedCount > 0
                                ? 'bg-purple-600 text-white'
                                : isToday
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-primary/10 text-primary'
                            }`}>
                              {item.day}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-foreground">
                                  {isToday ? `Due Today (${item.day}th)` : `Day ${item.day} Collections`}
                                </span>
                                {item.delayedCount > 0 && (
                                  <Badge className="h-4 px-1.5 text-[9px] font-bold bg-purple-600 text-white border-0 gap-0.5">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {item.delayedCount} Delayed Promise{item.delayedCount > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {isToday && (
                                  <Badge className="h-4 px-1.5 text-[9px] font-bold bg-emerald-600 text-white border-0">
                                    Today
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {isCurrentMonth && (
                                  isToday ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Scheduled for collection today</span>
                                  ) : isPast ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">Missed {todayDate - item.day} day(s) ago</span>
                                  ) : (
                                    <span>Due in {daysRemaining} day(s)</span>
                                  )
                                )}
                                <span className="mx-1">•</span>
                                <span>{item.tenants} tenant(s)</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-foreground">
                              ₹{item.expected.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-primary font-medium">View all →</div>
                          </div>
                        </button>

                        {/* Inline tenant list */}
                        <div className="divide-y divide-border/40">
                          {item.list.map(tenant => (
                            <div
                              key={tenant.id}
                              className={`p-3 space-y-2 transition-colors ${
                                tenant.hasAgreedDelay ? 'bg-purple-50/40 dark:bg-purple-950/20' : 'bg-card'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                    tenant.hasAgreedDelay ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300' : 'bg-muted text-muted-foreground'
                                  }`}>
                                    <User className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-bold text-foreground truncate">{tenant.name}</span>
                                      <span className="text-xs text-muted-foreground font-medium">Room {tenant.roomNo}</span>
                                      <Badge
                                        variant="secondary"
                                        className={`h-4 px-1.5 text-[9px] font-semibold ${
                                          tenant.isPartial
                                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                            : 'bg-red-500/15 text-red-700 dark:text-red-300'
                                        }`}
                                      >
                                        {tenant.isPartial ? 'Partial' : 'Pending'}
                                      </Badge>
                                    </div>

                                    {/* Agreed Delay or Standard Due Explanation */}
                                    {tenant.hasAgreedDelay ? (
                                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                          <CalendarClock className="h-3 w-3" />
                                          Agreed Delay: {tenant.paymentDueDay}th
                                          {tenant.paymentDelayDays ? ` (+${tenant.paymentDelayDays}d)` : ''}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          Joined {format(parseDateOnly(tenant.startDate), 'd MMM')}
                                        </span>
                                        {isCurrentMonth && (
                                          tenant.isDueToday ? (
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                              • Due Today!
                                            </span>
                                          ) : tenant.isDelayedWithinGrace ? (
                                            <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400">
                                              • On delay promise (in {tenant.paymentDueDay! - todayDate}d)
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-medium text-destructive">
                                              • Agreed date passed by {todayDate - tenant.paymentDueDay!}d
                                            </span>
                                          )
                                        )}
                                      </div>
                                    ) : (
                                      <div className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1">
                                        <span>Standard due: Joined {format(parseDateOnly(tenant.startDate), 'd MMM yyyy')}</span>
                                        {isCurrentMonth && isPast && (
                                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                                            (Overdue {todayDate - item.day}d)
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Amount & Contact */}
                                <div className="flex flex-col items-end shrink-0">
                                  <div className="text-sm font-bold text-destructive">
                                    ₹{tenant.balance.toLocaleString()}
                                  </div>
                                  {tenant.isPartial && (
                                    <div className="text-[10px] text-muted-foreground">
                                      Paid: ₹{tenant.amountPaid.toLocaleString()}
                                    </div>
                                  )}
                                  {tenant.phone && tenant.phone !== '••••••••••' && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openWhatsAppChat(tenant);
                                        }}
                                        className="h-7 w-7 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center transition-colors"
                                        aria-label={`WhatsApp ${tenant.name}`}
                                        title={tenant.hasAgreedDelay ? "Send Agreed Delay Reminder" : "Share on WhatsApp"}
                                      >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                      </button>
                                      <a
                                        href={`tel:${tenant.phone}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-7 w-7 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center transition-colors"
                                        aria-label={`Call ${tenant.name}`}
                                        title={`Call ${tenant.name}`}
                                      >
                                        <Phone className="h-3.5 w-3.5" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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

