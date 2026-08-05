import { useState, useMemo } from 'react';
import { parseDateOnly } from '@/utils/dateOnly';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, UserMinus, Phone, MessageCircle, ArrowLeft } from 'lucide-react';
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
  const [movementMonth, setMovementMonth] = useState(selectedMonth);
  const [movementYear, setMovementYear] = useState(selectedYear);
  const [activeTab, setActiveTab] = useState<'joined' | 'left'>('joined');
  const isMobile = useIsMobile();

  const { joined, left, joinedTenants, leftTenants, joinedTotal, leftTotal } = useMemo(() => {
    const joinedList: TenantWithRoom[] = [];
    const leftList: TenantWithRoom[] = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        const startDate = parseDateOnly(tenant.startDate);
        const startMonth = startDate.getMonth() + 1;
        const startYear = startDate.getFullYear();

        if (startMonth === movementMonth && startYear === movementYear) {
          joinedList.push({ ...tenant, roomNo: room.roomNo, floor: room.floor });
        }

        if (tenant.endDate) {
          const endDate = parseDateOnly(tenant.endDate);
          const endMonth = endDate.getMonth() + 1;
          const endYear = endDate.getFullYear();

          if (endMonth === movementMonth && endYear === movementYear) {
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
  }, [rooms, movementMonth, movementYear]);

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
            <SheetHeader className="px-4 pt-4 pb-3 border-b bg-background shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { setSheetOpen(false); onClose?.(); }}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <SheetTitle className="flex-1 text-base text-foreground font-bold text-left">
                  Tenant Movement
                </SheetTitle>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="movement-month" className="sr-only">Movement month</label>
                  <select id="movement-month" value={movementMonth} onChange={(event) => setMovementMonth(Number(event.target.value))} className="h-9 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary">
                    {months.map((month, index) => <option key={month} value={index + 1}>{month.slice(0, 3)}</option>)}
                  </select>
                  <label htmlFor="movement-year" className="sr-only">Movement year</label>
                  <select id="movement-year" value={movementYear} onChange={(event) => setMovementYear(Number(event.target.value))} className="h-9 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-primary">
                    {Array.from({ length: 5 }, (_, index) => selectedYear - 2 + index).map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>
              <p className="pl-10 text-left text-xs text-muted-foreground">{months[movementMonth - 1]} {movementYear} · Joined and left tenants</p>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
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
                        className={`p-4 rounded-lg border ${
                          activeTab === 'joined' 
                            ? 'bg-paid/5 border-paid/20 text-foreground' 
                            : 'bg-pending/5 border-pending/20 text-foreground'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{tenant.name}</span>
                              {tenant.phone && tenant.phone !== '••••••••••' && (
                                <>
                                  <a 
                                    href={`tel:${tenant.phone}`}
                                    className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                  >
                                    <Phone className="h-4 w-4" />
                                  </a>
                                  <a 
                                    href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
                                  >
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Room {tenant.roomNo} • Floor {tenant.floor}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">₹{tenant.monthlyRent.toLocaleString()}/mo</p>
                            <p className="text-xs text-muted-foreground">
                              {activeTab === 'joined' 
                                ? `Joined: ${format(new Date(tenant.startDate), 'dd MMM yyyy')}`
                                : `Left: ${format(new Date(tenant.endDate!), 'dd MMM yyyy')}`
                              }
                            </p>
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
