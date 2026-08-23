import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, UserMinus, Phone, MessageCircle, ArrowLeft, Calendar, ChevronDown, CalendarClock, UserCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Room, Tenant } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { format } from 'date-fns';
import { isTenantUpcoming, getDaysUntilJoining, parseDateOnly } from '@/utils/dateOnly';
import { useRooms } from '@/hooks/useRooms';
import { toast } from 'sonner';

interface TenantMovementCardProps {
  rooms: Room[];
  defaultOpen?: boolean;
  onClose?: () => void;
  showSummaryCard?: boolean;
}

interface TenantWithRoom extends Tenant {
  roomNo: string;
  floor: number;
}

export const TenantMovementCard = ({ rooms, defaultOpen = false, onClose, showSummaryCard = true }: TenantMovementCardProps) => {
  const { updateTenant } = useRooms();
  const { selectedMonth, selectedYear } = useMonthContext();
  const [sheetOpen, setSheetOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'joined' | 'left' | 'upcoming'>('joined');
  const isMobile = useIsMobile();

  // Local month/year for browsing movement history inside the sheet
  const [viewMonth, setViewMonth] = useState(selectedMonth);
  const [viewYear, setViewYear] = useState(selectedYear);

  useEffect(() => {
    if (sheetOpen) {
      setViewMonth(selectedMonth);
      setViewYear(selectedYear);
    }
  }, [sheetOpen, selectedMonth, selectedYear]);

  const years = useMemo(() => {
    const currentYr = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYr - 2 + i);
  }, []);

  const { joined, left, upcoming, joinedTenants, leftTenants, upcomingTenants, joinedTotal, leftTotal, upcomingTotal } = useMemo(() => {
    const joinedList: TenantWithRoom[] = [];
    const leftList: TenantWithRoom[] = [];
    const upcomingList: TenantWithRoom[] = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        const startDate = new Date(tenant.startDate);
        const startMonth = startDate.getMonth() + 1;
        const startYear = startDate.getFullYear();

        if (startMonth === viewMonth && startYear === viewYear) {
          joinedList.push({ ...tenant, roomNo: room.roomNo, floor: room.floor });
        }

        if (tenant.endDate) {
          const endDate = new Date(tenant.endDate);
          const endMonth = endDate.getMonth() + 1;
          const endYear = endDate.getFullYear();

          if (endMonth === viewMonth && endYear === viewYear) {
            leftList.push({ ...tenant, roomNo: room.roomNo, floor: room.floor });
          }
        }

        if (isTenantUpcoming(tenant.startDate, tenant.endDate)) {
          upcomingList.push({ ...tenant, roomNo: room.roomNo, floor: room.floor });
        }
      });
    });

    // Sort by date
    joinedList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    leftList.sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());
    upcomingList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    const joinedTotal = joinedList.reduce((sum, t) => sum + t.monthlyRent, 0);
    const leftTotal = leftList.reduce((sum, t) => sum + t.monthlyRent, 0);
    const upcomingTotal = upcomingList.reduce((sum, t) => sum + t.monthlyRent, 0);

    return { 
      joined: joinedList.length, 
      left: leftList.length,
      upcoming: upcomingList.length,
      joinedTenants: joinedList,
      leftTenants: leftList,
      upcomingTenants: upcomingList,
      joinedTotal,
      leftTotal,
      upcomingTotal,
    };
  }, [rooms, viewMonth, viewYear]);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'joined' | 'left' | 'upcoming');
  };

  return (
    <>
      {showSummaryCard && (
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setSheetOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
            <CardTitle className="text-sm font-medium">Tenant Movement</CardTitle>
            <UserPlus className="h-4 w-4 text-paid" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="p-2 rounded-lg bg-green-500/10">
                <div className="text-xs text-muted-foreground">Joined</div>
                <div className="font-bold text-paid">{joined}</div>
                <div className="text-xs text-muted-foreground">₹{joinedTotal.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-pending-muted">
                <div className="text-xs text-muted-foreground">Left</div>
                <div className="font-bold text-pending">{left}</div>
                <div className="text-xs text-muted-foreground">₹{leftTotal.toLocaleString()}</div>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <div className="text-xs text-muted-foreground">Reserved</div>
                <div className="font-bold text-amber-600 dark:text-amber-400">{upcoming}</div>
                <div className="text-xs text-muted-foreground">₹{upcomingTotal.toLocaleString()}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Tap to view movement details</p>
          </CardContent>
        </Card>
      )}

      <Sheet open={sheetOpen} onOpenChange={(val) => { setSheetOpen(val); if (!val) onClose?.(); }}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full p-0 [&>button]:hidden bg-background" : "w-full sm:max-w-xl p-0 bg-background"}
        >
          <div className="flex flex-col h-full bg-background">
            <SheetHeader className="mx-auto w-full max-w-screen-2xl shrink-0 border-b bg-background px-2 pb-3 pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSheetOpen(false); onClose?.(); }} aria-label="Back">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0 text-left">
                    <SheetTitle className="text-base font-bold">Tenant Movement</SheetTitle>
                    <p className="truncate text-xs text-muted-foreground">
                      {months[viewMonth - 1]} {viewYear} activity
                    </p>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-primary/30 bg-primary/10 px-2.5 font-bold text-primary dark:text-primary">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs">{months[viewMonth - 1]?.slice(0, 3)} {viewYear}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="end">
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-muted-foreground">Select Month & Year</div>
                      <div className="flex gap-2">
                        <Select value={viewMonth.toString()} onValueChange={(val) => setViewMonth(parseInt(val))}>
                          <SelectTrigger className="h-9 w-[120px] text-xs">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {months.map((m, idx) => (
                              <SelectItem key={m} value={(idx + 1).toString()} className="text-xs">{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={viewYear.toString()} onValueChange={(val) => setViewYear(parseInt(val))}>
                          <SelectTrigger className="h-9 w-[85px] text-xs">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-1.5 py-4 bg-background">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-3 shrink-0">
                  <TabsTrigger value="joined" className="gap-1 text-xs">
                    <UserPlus className="h-3.5 w-3.5 text-paid" />
                    Joined ({joined})
                  </TabsTrigger>
                  <TabsTrigger value="left" className="gap-1 text-xs">
                    <UserMinus className="h-3.5 w-3.5 text-pending" />
                    Left ({left})
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="gap-1 text-xs">
                    <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                    Reserved ({upcoming})
                  </TabsTrigger>
                </TabsList>
                
                <ScrollArea className="flex-1 mt-4">
                  <div className="space-y-3 pb-12">
                    {(activeTab === 'joined' ? joinedTenants : activeTab === 'left' ? leftTenants : upcomingTenants).map(tenant => {
                      const isUpcomingTab = activeTab === 'upcoming';
                      const daysLeft = isUpcomingTab ? getDaysUntilJoining(tenant.startDate) : 0;

                      return (
                      <div 
                        key={tenant.id} 
                        className={`p-3 rounded-2xl border shadow-sm ${
                          activeTab === 'joined' 
                            ? 'bg-paid/5 border-paid/20 text-foreground' 
                            : activeTab === 'left'
                            ? 'bg-pending/5 border-pending/20 text-foreground'
                            : 'bg-amber-500/10 border-amber-500/30 text-foreground'
                        }`}
                      >
                        <div className="flex items-stretch justify-between gap-3">
                          {/* Left Div */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <span className="truncate text-base font-bold text-foreground block">{tenant.name}</span>
                              <span className="text-slate-500 dark:text-slate-400 font-medium text-xs">Room {tenant.roomNo}</span>
                            </div>
                            <div className="mt-1.5 flex items-center">
                              <span className="text-xs text-muted-foreground font-medium">
                                {activeTab === 'joined' 
                                  ? `Joined: ${format(new Date(tenant.startDate), 'dd MMM yyyy')}`
                                  : activeTab === 'left'
                                  ? `Left: ${format(new Date(tenant.endDate!), 'dd MMM yyyy')}`
                                  : `Joining: ${format(parseDateOnly(tenant.startDate), 'dd MMM yyyy')} (${daysLeft > 0 ? `in ${daysLeft} days` : 'Today'})`
                                }
                              </span>
                            </div>
                          </div>

                          {/* Right Div */}
                          <div className="flex flex-col justify-between items-end shrink-0 ml-auto text-right">
                            {/* Rent amount */}
                            <div className="w-[84px] text-center">
                              <p className="text-base font-extrabold text-foreground">₹{tenant.monthlyRent.toLocaleString()}</p>
                            </div>

                            {/* Action icons */}
                            <div className="w-[84px] flex items-center justify-between my-1">
                              {isUpcomingTab ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 w-full text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold"
                                  onClick={() => {
                                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                                    updateTenant(tenant.id, { startDate: todayStr });
                                    toast.success(`${tenant.name} checked in successfully!`);
                                  }}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" /> Check In
                                </Button>
                              ) : tenant.phone && tenant.phone !== '••••••••••' ? (
                                <>
                                  <a 
                                    href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
                                    title="WhatsApp"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                  <a 
                                    href={`tel:${tenant.phone}`}
                                    className="grid h-9 w-9 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 transition-colors hover:bg-blue-500/20 dark:text-blue-400"
                                    title={`Call ${tenant.name}`}
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );})}

                    {(activeTab === 'joined' ? joinedTenants : activeTab === 'left' ? leftTenants : upcomingTenants).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No tenants {activeTab === 'joined' ? 'joined' : activeTab === 'left' ? 'left' : 'reserved'} this month
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
