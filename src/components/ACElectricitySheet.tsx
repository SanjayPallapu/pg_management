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
            <div className="flex items-center justify-between mt-3 bg-cyan-500/5 p-2 rounded-lg border border-cyan-500/15">
              <Label className="text-xs font-semibold text-cyan-800 dark:text-cyan-300">AC Bill Month:</Label>
              <div className="flex items-center gap-1">
                <select
                  value={acMonth}
                  onChange={(e) => setAcMonth(parseInt(e.target.value))}
                  className="h-8 rounded border border-input bg-background px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={acYear}
                  onChange={(e) => setAcYear(parseInt(e.target.value))}
                  className="h-8 rounded border border-input bg-background px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
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
