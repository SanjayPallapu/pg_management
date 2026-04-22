import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, ChevronDown, MessageCircle, Phone, User } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [collectionFromDay, setCollectionFromDay] = useState<number>(new Date().getDate());
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
  };

  const collectionScheduleData = useMemo(() => {
    const scheduleByDay: Record<number, { day: number; expected: number; tenants: number; list: DueTenant[] }> = {};

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

      const joinDay = new Date(tenant.startDate).getDate();
      if (!scheduleByDay[joinDay]) {
        scheduleByDay[joinDay] = { day: joinDay, expected: 0, tenants: 0, list: [] };
      }
      scheduleByDay[joinDay].expected += balance;
      scheduleByDay[joinDay].tenants++;
      scheduleByDay[joinDay].list.push({
        id: tenant.id,
        name: tenant.name,
        phone: tenant.phone,
        roomNo: tenant.roomNo,
        monthlyRent: tenant.monthlyRent,
        amountPaid,
        balance,
        isPartial: amountPaid > 0,
      });
    });

    return Object.values(scheduleByDay).sort((a, b) => a.day - b.day);
  }, [rooms, payments, selectedMonth, selectedYear]);

  const openWhatsAppChat = (phone: string) => {
    const formattedPhone = phone.replace(/\D/g, '');
    const phoneWithCode = formattedPhone.startsWith('91') ? formattedPhone : `91${formattedPhone}`;
    window.open(`https://wa.me/${phoneWithCode}`, '_blank');
  };

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
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full">
            <CardContent className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <div className="text-left">
                    <h3 className="font-semibold text-sm">Expected Collection by Due Date</h3>
                    <p className="text-xs text-muted-foreground">
                      {!isOpen ? `₹${filteredTotal.toLocaleString()} from ${filteredTenantCount} tenants` : 'Amount pending grouped by tenant joining day'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-4 pt-0 space-y-3">

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

          {/* Grouped tenants by due day */}
          <div className="space-y-2">
            {filteredData.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-6">
                No pending collections in this date range
              </div>
            ) : (
              filteredData.map(item => (
                <div
                  key={item.day}
                  className="rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden"
                >
                  {/* Day header */}
                  <button
                    className="w-full flex items-center justify-between gap-2 p-3 hover:bg-purple-500/10 transition-colors text-left"
                    onClick={() => {
                      setSelectedDueDay(item.day);
                      setDueDaySheetOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20">
                        <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{item.day}</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">Due on Day {item.day}</div>
                        <div className="text-xs text-muted-foreground">{item.tenants} tenant(s) pending</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        ₹{item.expected.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground">View all</div>
                    </div>
                  </button>

                  {/* Inline tenant list */}
                  <div className="divide-y divide-purple-500/10 border-t border-purple-500/10">
                    {item.list.map(tenant => (
                      <div
                        key={tenant.id}
                        className="flex items-center gap-2 px-3 py-2 bg-card/50"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{tenant.name}</span>
                            <Badge
                              variant="secondary"
                              className={`h-4 px-1.5 text-[9px] ${
                                tenant.isPartial
                                  ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
                                  : 'bg-red-500/15 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {tenant.isPartial ? 'Partial' : 'Pending'}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Room {tenant.roomNo} • ₹{tenant.balance.toLocaleString()} due
                            {tenant.isPartial && ` (Paid ₹${tenant.amountPaid.toLocaleString()})`}
                          </div>
                        </div>
                        {tenant.phone && tenant.phone !== '••••••••••' && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <a
                              href={`tel:${tenant.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              aria-label={`Call ${tenant.name}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openWhatsAppChat(tenant.phone); }}
                              className="p-1.5 rounded-full text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                              aria-label={`WhatsApp ${tenant.name}`}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
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
