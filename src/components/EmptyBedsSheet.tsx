import { useMemo, useState } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bed, Users, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface RoomStat {
  roomNo: string;
  capacity: number;
  occupied: number;
  emptyBeds: number;
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

  // Fixed per-bed rates by sharing type
  const getPerBedRate = (capacity: number): number => {
    switch (capacity) {
      case 5: return 4000;
      case 4: return 4500;
      case 3: return 5000;
      case 2: return 6000;
      case 1: return 11500;
      default: return 4000;
    }
  };

  // Group by sharing type (from all rooms with empty beds, not filtered)
  const bySharing = useMemo(() => {
    const allRoomsWithEmptyBeds = roomStats.filter(r => r.emptyBeds > 0);

    return allRoomsWithEmptyBeds.reduce(
      (acc, room) => {
        const key = room.capacity;
        const perBedRate = getPerBedRate(key);
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

  // Get unique floors from rooms with empty beds (unfiltered)
  const availableFloors = useMemo(() => {
    return [...new Set(roomStats.filter(r => r.emptyBeds > 0).map(r => r.floor))].sort();
  }, [roomStats]);

  // Get unique sharing types sorted descending
  const availableSharingTypes = useMemo(() => {
    return [...new Set(roomStats.filter(r => r.emptyBeds > 0).map(r => r.capacity))].sort((a, b) => b - a);
  }, [roomStats]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isMobile ? "right" : "bottom"} 
        className={isMobile ? "w-full max-w-full sm:max-w-full h-full p-4 [&>button]:hidden" : "h-[80vh]"}
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5 text-primary" />
              Empty Beds Breakdown
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className={`${isMobile ? 'h-[calc(100vh-100px)] overflow-y-auto scrollbar-none' : ''}`}>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">{totalEmptyBeds}</div>
            <p className="text-xs text-muted-foreground">Total Empty Beds</p>
          </div>
          <div className="bg-paid/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-paid">₹{Math.round(totalPotentialRevenue).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Potential Revenue</p>
          </div>
        </div>

        {/* By Sharing Type with Filters */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">By Sharing Type</h3>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <SlidersHorizontal className="h-4 w-4" />
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

          <div className="flex flex-wrap gap-2">
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
                    className={`py-1.5 px-3 cursor-pointer transition-colors ${
                      sharingFilter === Number(capacity)
                        ? 'bg-primary/15 border-primary'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <span className="font-medium">{capacity}-sharing</span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span>{data.beds} beds</span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-paid">₹{data.perBed.toLocaleString()}/bed</span>
                  </Badge>
                </button>
              ))}
          </div>
        </div>

        {/* Room List */}
        <ScrollArea className={isMobile ? "h-[calc(100vh-380px)]" : "h-[calc(80vh-220px)]"}>
          <div className="space-y-2">
            {roomsWithEmptyBeds.map(room => (
              <div
                key={room.roomNo}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{room.roomNo}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Room {room.roomNo}</span>
                      <Badge variant="secondary" className="text-xs">
                        {room.capacity}-sharing
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{room.occupied}/{room.capacity} occupied</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-medium text-pending">
                    <Bed className="h-3.5 w-3.5" />
                    <span>{room.emptyBeds} empty</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ₹{Math.round(room.perBedRent).toLocaleString()}/bed
                  </div>
                  <div className="text-sm font-semibold text-paid">
                    +₹{Math.round(room.potentialAdditionalRent).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            {roomsWithEmptyBeds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bed className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>All beds are occupied!</p>
              </div>
            )}
          </div>
        </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
