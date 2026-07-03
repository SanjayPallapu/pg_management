import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Snowflake } from 'lucide-react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { RentACRoomCard } from './MonthlyRentSheet';

interface ACElectricitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  acRooms: any[];
  acMonth: number;
  acYear: number;
  setAcMonth: (m: number) => void;
  setAcYear: (y: number) => void;
  setReading: any;
  customModeRooms: Record<string, boolean>;
  setCustomModeRooms: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onShare: (
    item: any,
    units: number, 
    unitPrice: number, 
    startReading: number | null, 
    endReading: number | null, 
    splitType: string, 
    splitCount: number | null, 
    targetTenantName?: string
  ) => void;
  onTogglePaymentStatus?: (tenantId: string, currentStatus: 'Paid' | 'Pending') => void;
  months: { value: number; label: string }[];
  years: number[];
}

export const ACElectricitySheet = ({
  open,
  onOpenChange,
  acRooms,
  acMonth,
  acYear,
  setAcMonth,
  setAcYear,
  setReading,
  customModeRooms,
  setCustomModeRooms,
  onShare,
  onTogglePaymentStatus,
  months,
  years,
}: ACElectricitySheetProps) => {
  useBackGesture(open, () => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => onOpenChange(false)}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 shrink-0">
                <Snowflake className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              </div>
              <SheetTitle className="text-base text-cyan-800 dark:text-cyan-300 flex-1">
                AC Electricity Management
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1.5 mt-2 px-1 text-xs font-medium">
              <span className="text-muted-foreground mr-0.5">AC Bill Month:</span>
              <div className="relative inline-block">
                <select
                  value={acMonth}
                  onChange={(e) => setAcMonth(parseInt(e.target.value))}
                  className="h-6 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 px-3.5 pr-7 text-xs font-semibold border-none focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgb(6, 182, 212)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '12px'
                  }}
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value} className="text-foreground bg-background font-medium">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative inline-block">
                <select
                  value={acYear}
                  onChange={(e) => setAcYear(parseInt(e.target.value))}
                  className="h-6 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 px-3.5 pr-7 text-xs font-semibold border-none focus-visible:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='rgb(6, 182, 212)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '12px'
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y} className="text-foreground bg-background font-medium">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-1.5 pt-4">
            <div className="space-y-4 pb-12">
              {acRooms.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No AC Rooms configured.
                </div>
              ) : (
                acRooms.map((item) => (
                  <RentACRoomCard
                    key={item.room.id}
                    roomNo={item.room.roomNo}
                    tenantCount={item.activeTenants.length}
                    sharingCount={item.room.capacity}
                    units={item.units}
                    unitPrice={item.unitPrice}
                    total={item.total}
                    tenantShares={item.tenantShares}
                    isCustom={item.isCustom}
                    startReading={item.startReading}
                    endReading={item.endReading}
                    splitType={item.splitType}
                    splitCount={item.splitCount}
                    onModeToggle={(isCustom) => {
                      localStorage.setItem(`ac_bill_mode_${item.room.id}`, isCustom ? "custom" : "commercial");
                      setCustomModeRooms((prev) => ({ ...prev, [item.room.id]: isCustom }));
                    }}
                    onSaveReading={(units, unitPrice, startReading, endReading, splitType, splitCount) => {
                      setReading.mutate({
                        roomId: item.room.id,
                        units,
                        unitPrice,
                        startReading,
                        endReading,
                        splitType,
                        splitCount,
                      });
                    }}
                    onShare={(units, unitPrice, startReading, endReading, splitType, splitCount, targetTenantName) => {
                      onShare(item, units, unitPrice, startReading, endReading, splitType, splitCount, targetTenantName);
                    }}
                    onTogglePaymentStatus={onTogglePaymentStatus}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
