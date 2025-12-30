import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bed, Users, SlidersHorizontal } from 'lucide-react';

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
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [sharingFilter, setSharingFilter] = useState<number | null>(null);
  
  // Filter rooms with empty beds and sort by sharing type (highest first), then by room number
  const roomsWithEmptyBeds = roomStats
    .filter(r => r.emptyBeds > 0)
    .filter(r => floorFilter === null || r.floor === floorFilter)
    .filter(r => sharingFilter === null || r.capacity === sharingFilter)
    .sort((a, b) => b.capacity - a.capacity || a.roomNo.localeCompare(b.roomNo));

  // Group by sharing type (from all rooms with empty beds, not filtered)
  const allRoomsWithEmptyBeds = roomStats.filter(r => r.emptyBeds > 0);
  const bySharing = allRoomsWithEmptyBeds.reduce((acc, room) => {
    const key = room.capacity;
    if (!acc[key]) {
      acc[key] = { beds: 0, revenue: 0, perBedRent: room.perBedRent, capacity: room.capacity };
    }
    acc[key].beds += room.emptyBeds;
    acc[key].revenue += room.potentialAdditionalRent;
    return acc;
  }, {} as Record<number, { beds: number; revenue: number; perBedRent: number; capacity: number }>);

  // Get unique floors from rooms with empty beds (unfiltered)
  const availableFloors = [...new Set(roomStats.filter(r => r.emptyBeds > 0).map(r => r.floor))].sort();
  
  // Get unique sharing types sorted descending
  const availableSharingTypes = [...new Set(roomStats.filter(r => r.emptyBeds > 0).map(r => r.capacity))].sort((a, b) => b - a);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-primary" />
            Empty Beds Breakdown
          </SheetTitle>
        </SheetHeader>

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
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              {availableSharingTypes.map(capacity => (
                <Button
                  key={capacity}
                  variant={sharingFilter === capacity ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSharingFilter(sharingFilter === capacity ? null : capacity)}
                >
                  {capacity}S
                </Button>
              ))}
              <span className="mx-1 text-muted-foreground">|</span>
              <Button
                variant={floorFilter === null ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setFloorFilter(null)}
              >
                All
              </Button>
              {availableFloors.map(floor => (
                <Button
                  key={floor}
                  variant={floorFilter === floor ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setFloorFilter(floor)}
                >
                  F{floor}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bySharing)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([capacity, data]) => (
              <Badge key={capacity} variant="outline" className="py-1.5 px-3">
                <span className="font-medium">{capacity}-sharing</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span>{data.beds} beds</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-paid">₹{Math.round(data.perBedRent).toLocaleString()}/bed</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Room List */}
        <ScrollArea className="h-[calc(80vh-220px)]">
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
      </SheetContent>
    </Sheet>
  );
};
