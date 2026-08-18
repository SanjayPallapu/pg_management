import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, UserMinus, Phone, MessageCircle, ArrowLeft, Calendar, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Room, Tenant } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { format } from 'date-fns';

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
  const { selectedMonth, selectedYear } = useMonthContext();
  const [sheetOpen, setSheetOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'joined' | 'left'>('joined');
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

  const { joined, left, joinedTenants, leftTenants, joinedTotal, leftTotal } = useMemo(() => {
    const joinedList: TenantWithRoom[] = [];
    const leftList: TenantWithRoom[] = [];

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
      });
    });

    // Sort by date
    joinedList.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    leftList.sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime());

    const joinedTotal = joinedList.reduce((sum, t) => sum + t.monthlyRent, 0);
    const leftTotal = leftList.reduce((sum, t) => sum + t.monthlyRent, 0);

    return { 
      joined: joinedList.length, 
      left: leftList.length,
      joinedTenants: joinedList,
      leftTenants: leftList,
      joinedTotal,
      leftTotal,
    };
  }, [rooms, viewMonth, viewYear]);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'joined' | 'left');
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
            <div className="grid grid-cols-2 gap-2 text-sm">
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
                <TabsList className="grid w-full grid-cols-2 shrink-0">
                  <TabsTrigger value="joined" className="gap-1">
                    <UserPlus className="h-3.5 w-3.5 text-paid" />
                    Joined ({joined})
                  </TabsTrigger>
                  <TabsTrigger value="left" className="gap-1">
                    <UserMinus className="h-3.5 w-3.5 text-pending" />
                    Left ({left})
                  </TabsTrigger>
                </TabsList>
                
                <ScrollArea className="flex-1 mt-4">
                  <div className="space-y-3 pb-12">
                    {(activeTab === 'joined' ? joinedTenants : leftTenants).map(tenant => (
                      <div 
                        key={tenant.id} 
                        className={`p-4 rounded-2xl border shadow-sm ${
                          activeTab === 'joined' 
                            ? 'bg-paid/5 border-paid/20 text-foreground' 
                            : 'bg-pending/5 border-pending/20 text-foreground'
                        }`}
                      >
                        <div className="flex items-stretch justify-between gap-3">
                          {/* Left Div */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate text-base font-bold text-foreground">{tenant.name}</span>
                                <span className="text-slate-400 font-medium text-sm">•</span>
                                <span className="text-slate-500 dark:text-slate-400 font-medium text-sm shrink-0">R{tenant.roomNo}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Floor {tenant.floor}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center">
                              <span className="text-xs text-muted-foreground font-medium">
                                {activeTab === 'joined' 
                                  ? `Joined: ${format(new Date(tenant.startDate), 'dd MMM yyyy')}`
                                  : `Left: ${format(new Date(tenant.endDate!), 'dd MMM yyyy')}`
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

                            {/* Middle: Action icons */}
                            {tenant.phone && tenant.phone !== '••••••••••' ? (
                              <div className="w-[84px] flex items-center justify-between my-2">
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
                              </div>
                            ) : (
                              <div className="w-[84px] my-2" />
                            )}

                            {/* Bottom: Status Badge */}
                            <div className="w-[84px]">
                              <span className={`w-full px-0 text-center block text-xs font-semibold py-1 rounded-lg shrink-0 ${
                                activeTab === 'joined'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              }`}>
                                {activeTab === 'joined' ? 'Joined' : 'Left'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(activeTab === 'joined' ? joinedTenants : leftTenants).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No tenants {activeTab === 'joined' ? 'joined' : 'left'} this month
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
