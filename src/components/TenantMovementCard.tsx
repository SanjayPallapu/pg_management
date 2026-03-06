import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, UserMinus, Phone, MessageCircle } from 'lucide-react';
import { Room, Tenant } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { format } from 'date-fns';

interface TenantMovementCardProps {
  rooms: Room[];
}

interface TenantWithRoom extends Tenant {
  roomNo: string;
  floor: number;
}

export const TenantMovementCard = ({ rooms }: TenantMovementCardProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const [sheetType, setSheetType] = useState<'joined' | 'left' | null>(null);

  const { joined, left, joinedTenants, leftTenants } = useMemo(() => {
    const joinedList: TenantWithRoom[] = [];
    const leftList: TenantWithRoom[] = [];

    rooms.forEach(room => {
      room.tenants.forEach(tenant => {
        const startDate = new Date(tenant.startDate);
        const startMonth = startDate.getMonth() + 1;
        const startYear = startDate.getFullYear();

        if (startMonth === selectedMonth && startYear === selectedYear) {
          joinedList.push({ ...tenant, roomNo: room.roomNo, floor: room.floor });
        }

        if (tenant.endDate) {
          const endDate = new Date(tenant.endDate);
          const endMonth = endDate.getMonth() + 1;
          const endYear = endDate.getFullYear();

          if (endMonth === selectedMonth && endYear === selectedYear) {
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
  }, [rooms, selectedMonth, selectedYear]);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div 
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => joined > 0 && setSheetType('joined')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Joined</span>
                <UserPlus className="h-4 w-4 text-paid" />
              </div>
              <div className="text-2xl font-bold text-paid">{joined}</div>
              <p className="text-xs text-muted-foreground">₹{joinedTotal.toLocaleString()}/mo total</p>
            </div>
            <div 
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => left > 0 && setSheetType('left')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Left</span>
                <UserMinus className="h-4 w-4 text-pending" />
              </div>
              <div className="text-2xl font-bold text-pending">{left}</div>
              <p className="text-xs text-muted-foreground">₹{leftTotal.toLocaleString()}/mo total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={sheetType !== null} onOpenChange={() => setSheetType(null)}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>
              {sheetType === 'joined' ? 'Tenants Joined' : 'Tenants Left'} in {months[selectedMonth - 1]} {selectedYear}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(70vh-80px)] mt-4">
            <div className="space-y-3 pr-4">
              {(sheetType === 'joined' ? joinedTenants : leftTenants).map(tenant => (
                <div 
                  key={tenant.id} 
                  className={`p-4 rounded-lg border ${
                    sheetType === 'joined' 
                      ? 'bg-paid-muted border-paid/30' 
                      : 'bg-pending-muted border-pending/30'
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
                      <p className="font-medium">₹{tenant.monthlyRent.toLocaleString()}/mo</p>
                      <p className="text-xs text-muted-foreground">
                        {sheetType === 'joined' 
                          ? `Joined: ${format(new Date(tenant.startDate), 'dd MMM yyyy')}`
                          : `Left: ${format(new Date(tenant.endDate!), 'dd MMM yyyy')}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {(sheetType === 'joined' ? joinedTenants : leftTenants).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No tenants {sheetType === 'joined' ? 'joined' : 'left'} this month
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};