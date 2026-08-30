import { useMemo, useState } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bed, Users, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import vacancyImg from "@/assets/pg-hub/editorial/fill-vacancy.jpg";

interface RoomStat {
  roomNo: string;
  capacity: number;
  occupied: number;
  emptyBeds: number;
  reservedBeds?: number;
  perBedRent: number;
  potentialAdditionalRent: number;
  floor: number;
}

interface EmptyBedsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomStats: RoomStat[];
  totalEmptyBeds: number;
  totalPotentialRevenue: number;

}

export const EmptyBedsSheet = ({
  open,
  onOpenChange,
  roomStats,
  totalEmptyBeds,
  totalPotentialRevenue,
}: EmptyBedsSheetProps) => {
  const isMobile = useIsMobile();
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [sharingFilter, setSharingFilter] = useState<number | null>(null);

  // Handle OS back gesture to close sheet
  useBackGesture(open, () => onOpenChange(false));

  // Filter rooms with empty beds and sort by sharing type (highest first), then by room number
  const roomsWithEmptyBeds = useMemo(() => {
    return roomStats
      .filter(r => r.emptyBeds > 0)
      .filter(r => floorFilter === null || r.floor === floorFilter)
      .filter(r => sharingFilter === null || r.capacity === sharingFilter)
      .sort((a, b) => b.capacity - a.capacity || a.roomNo.localeCompare(b.roomNo));
  }, [roomStats, floorFilter, sharingFilter]);

  // Group by sharing type (from all rooms with empty beds, not filtered)
  const bySharing = useMemo(() => {
    const allRoomsWithEmptyBeds = roomStats.filter(r => r.emptyBeds > 0);

    return allRoomsWithEmptyBeds.reduce(
      (acc, room) => {
        const key = room.capacity;
        const perBedRate = room.perBedRent;
        if (!acc[key]) {
          acc[key] = { beds: 0, revenue: 0, perBed: perBedRate };
        }
        acc[key].beds += room.emptyBeds;
        acc[key].revenue += room.emptyBeds * perBedRate;
        return acc;
      },
      {} as Record<number, { beds: number; revenue: number; perBed: number }>
    );
  }, [roomStats]);

  // Floor-wise summary (all rooms, not just empty)
  const floorSummary = useMemo(() => {
    const floorsWithEmpty = [...new Set(roomStats.filter(r => r.emptyBeds > 0).map(r => r.floor))].sort();
    return floorsWithEmpty.map(floor => {
      const allRoomsOnFloor = roomStats.filter(r => r.floor === floor);
      const emptyBeds = allRoomsOnFloor.reduce((sum, r) => sum + r.emptyBeds, 0);
      const totalCapacity = allRoomsOnFloor.reduce((sum, r) => sum + r.capacity, 0);
      return { floor, emptyBeds, totalCapacity };
    });
  }, [roomStats]);

  // Get unique floors from rooms with empty beds (unfiltered)
  const availableFloors = useMemo(() => {
    return floorSummary.map(f => f.floor);
  }, [floorSummary]);

  // Get unique sharing types sorted descending
  const availableSharingTypes = useMemo(() => {
    return [...new Set(roomStats.filter(r => r.emptyBeds > 0).map(r => r.capacity))].sort((a, b) => b - a);
  }, [roomStats]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-2 pt-4 pb-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Bed className="h-4 w-4 text-primary shrink-0" />
                <SheetTitle className="text-base text-foreground font-bold truncate">
                  Empty Beds Breakdown
                </SheetTitle>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-1.5 py-2.5 space-y-3">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-primary/10 rounded-lg p-2">
            <div className="text-xl sm:text-2xl font-bold text-primary">{totalEmptyBeds}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Total Empty Beds</p>
          </div>
          <div className="bg-paid/10 rounded-lg p-2">
            <div className="text-xl sm:text-2xl font-bold text-paid">₹{Math.round(totalPotentialRevenue).toLocaleString()}</div>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Potential Revenue</p>
          </div>
        </div>

        {/* By Sharing Type with Filters & Vacancy Image */}
        <div className="mb-2.5 p-2.5 rounded-2xl border border-border/80 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-bold text-foreground">By Sharing Type</h3>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-1.5 rounded-lg">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="sr-only">Filters</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Sharing type</div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={sharingFilter === null ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSharingFilter(null)}
                      >
                        All
                      </Button>
                      {availableSharingTypes.map(capacity => (
                        <Button
                          key={capacity}
                          variant={sharingFilter === capacity ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setSharingFilter(sharingFilter === capacity ? null : capacity)}
                        >
                          {capacity}S
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">Floor</div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={floorFilter === null ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setFloorFilter(null)}
                      >
                        All
                      </Button>
                      {availableFloors.map(floor => (
                        <Button
                          key={floor}
                          variant={floorFilter === floor ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setFloorFilter(floor)}
                        >
                          F{floor}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between gap-2.5">
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {Object.entries(bySharing)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([capacity, data]) => (
                  <button
                    key={capacity}
                    onClick={() => setSharingFilter(sharingFilter === Number(capacity) ? null : Number(capacity))}
                    className="inline-block"
                  >
                    <Badge
                      variant="outline"
                      className={`py-1.5 px-2.5 rounded-xl cursor-pointer transition-all text-xs ${
                        sharingFilter === Number(capacity)
                          ? 'bg-primary/15 border-primary text-primary font-extrabold shadow-xs'
                          : 'hover:bg-accent/50 font-semibold'
                      }`}
                    >
                      <span className="font-bold">{capacity}-sharing</span>
                      <span className="mx-1 text-muted-foreground">•</span>
                      <span className="font-semibold">{data.beds} beds</span>
                      <span className="mx-1 text-muted-foreground">•</span>
                      <span className="text-paid font-bold">₹{data.perBed.toLocaleString()}/bed</span>
                    </Badge>
                  </button>
                ))}
            </div>

            {/* Rightmost Fill Vacancy Editorial Card matching Rent Tab */}
            <div className="w-[84px] sm:w-[96px] shrink-0 flex flex-col items-center select-none">
              <div className="w-full h-[96px] sm:h-[110px] rounded-t-[3rem] rounded-b-xl bg-gradient-to-b from-teal-200 via-emerald-100 to-cyan-100 dark:from-teal-950 dark:via-emerald-900/40 dark:to-cyan-950 flex items-center justify-center p-1 shadow-sm border border-black/5 dark:border-white/10 relative overflow-hidden">
                <img
                  src={vacancyImg}
                  alt="Fill Vacancy"
                  className="w-full h-full object-cover object-center rounded-t-[2.75rem] rounded-b-lg shadow-xs"
                />
              </div>
              <span className="font-semibold text-[10px] sm:text-xs text-foreground text-center leading-tight mt-1 px-0.5 line-clamp-2 max-w-[84px] sm:max-w-[96px]">
                Fill Vacancy
              </span>
            </div>
          </div>
        </div>

        {/* Room List */}
        <div className="mb-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-foreground mb-2">Available Rooms ({roomsWithEmptyBeds.length})</h3>
          <div className="space-y-1.5">
            {roomsWithEmptyBeds.map(room => (
              <div
                key={room.roomNo}
                className="flex items-center justify-between p-2.5 rounded-xl border bg-card hover:bg-accent/30 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-sm font-black text-primary">{room.roomNo.replace(/^R/i, "")}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold">
                        {room.capacity}-sharing
                      </Badge>
                      {room.reservedBeds && room.reservedBeds > 0 ? (
                        <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-[11px] py-0 px-1.5 font-bold">
                          {room.reservedBeds} Reserved
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-foreground mt-0.5">
                      <Users className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-extrabold text-foreground tracking-tight">{room.occupied}/{room.capacity} occupied</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-sm sm:text-base font-bold text-pending">
                    <Bed className="h-4 w-4" />
                    <span>{room.emptyBeds} empty</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                    ₹{Math.round(room.perBedRent).toLocaleString()}/bed
                  </div>
                  <div className="text-sm sm:text-base font-bold text-paid">
                    +₹{Math.round(room.potentialAdditionalRent).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            {roomsWithEmptyBeds.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Bed className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs sm:text-sm">All beds are occupied!</p>
              </div>
            )}
          </div>
        </div>

        {/* Floor-wise Vacancy (Moved to Bottom) */}
        <div className="mb-2.5 p-2.5 rounded-2xl border border-border/80 bg-card/60 shadow-xs">
          <h3 className="text-xs sm:text-sm font-bold text-foreground mb-2">Floor-wise Vacancy</h3>
          <div className="space-y-1.5">
            {floorSummary.map(({ floor, emptyBeds, totalCapacity }) => {
              const isExpanded = floorFilter === floor;
              const floorRooms = roomStats.filter(r => r.emptyBeds > 0 && r.floor === floor)
                .sort((a, b) => a.roomNo.localeCompare(b.roomNo));
              return (
                <div key={floor} className={`rounded-xl border transition-colors ${isExpanded ? 'bg-primary/10 border-primary' : 'bg-card'}`}>
                  <button
                    onClick={() => setFloorFilter(isExpanded ? null : floor)}
                    className="w-full p-2.5 text-left flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground">Floor {floor}</div>
                      <div className="text-sm sm:text-base font-bold text-foreground">
                        {emptyBeds} <span className="text-xs font-normal text-muted-foreground">/ {totalCapacity} total</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 sm:w-20 bg-muted rounded-full h-2">
                        <div className="bg-pending h-2 rounded-full transition-all" style={{ width: `${(emptyBeds / totalCapacity) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 space-y-1">
                      {floorRooms.map(room => (
                        <div key={room.roomNo} className="flex items-center justify-between bg-background/60 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{room.roomNo.replace(/^R/i, "")}</span>
                            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-bold">{room.capacity}-sharing</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-pending font-bold text-xs">
                            <Bed className="h-3 w-3" />
                            <span>{room.emptyBeds} empty</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  </SheetContent>
</Sheet>
);
};
