import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bed, Users } from 'lucide-react';

interface RoomStat {
  roomNo: string;
  capacity: number;
  occupied: number;
  emptyBeds: number;
  perBedRent: number;
  potentialAdditionalRent: number;
  floor: 1 | 2 | 3;
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
  const [selectedSharing, setSelectedSharing] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  // Filter rooms with empty beds
  const roomsWithEmptyBeds = roomStats.filter(r => r.emptyBeds > 0);
  
  // Apply filters and sort by potential revenue (highest first)
  const filteredRooms = roomsWithEmptyBeds
    .filter(r => selectedSharing === null || r.capacity === selectedSharing)
    .filter(r => selectedFloor === null || r.floor === selectedFloor)
    .sort((a, b) => b.potentialAdditionalRent - a.potentialAdditionalRent);

  // Group by sharing type for summary
  const bySharing = roomsWithEmptyBeds.reduce((acc, room) => {
    const key = room.capacity;
    if (!acc[key]) {
      acc[key] = { beds: 0, revenue: 0, perBedRent: room.perBedRent };
    }
    acc[key].beds += room.emptyBeds;
    acc[key].revenue += room.potentialAdditionalRent;
    return acc;
  }, {} as Record<number, { beds: number; revenue: number; perBedRent: number }>);

  // Get unique floors with empty beds
  const floorsWithEmptyBeds = [...new Set(roomsWithEmptyBeds.map(r => r.floor))].sort();
  const sharingTypes = Object.keys(bySharing).map(Number).sort((a, b) => b - a);

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

        {/* Filters Row */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-4">
            {/* Sharing Type Filter */}
            <div className="flex-1">
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5">By Sharing</h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge 
                  variant={selectedSharing === null ? "default" : "outline"}
                  className="cursor-pointer py-1 px-2 text-xs"
                  onClick={() => setSelectedSharing(null)}
                >
                  All
                </Badge>
                {sharingTypes.map(type => (
                  <Badge 
                    key={type}
                    variant={selectedSharing === type ? "default" : "outline"}
                    className="cursor-pointer py-1 px-2 text-xs"
                    onClick={() => setSelectedSharing(selectedSharing === type ? null : type)}
                  >
                    {type}-share ({bySharing[type].beds})
                  </Badge>
                ))}
              </div>
            </div>

            {/* Floor Filter */}
            <div className="flex-1">
              <h3 className="text-xs font-medium text-muted-foreground mb-1.5">By Floor</h3>
              <div className="flex flex-wrap gap-1.5">
                <Badge 
                  variant={selectedFloor === null ? "default" : "outline"}
                  className="cursor-pointer py-1 px-2 text-xs"
                  onClick={() => setSelectedFloor(null)}
                >
                  All
                </Badge>
                {floorsWithEmptyBeds.map(floor => (
                  <Badge 
                    key={floor}
                    variant={selectedFloor === floor ? "default" : "outline"}
                    className="cursor-pointer py-1 px-2 text-xs"
                    onClick={() => setSelectedFloor(selectedFloor === floor ? null : floor)}
                  >
                    Floor {floor}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* By Sharing Type Summary */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary by Sharing Type</h3>
          <div className="flex flex-wrap gap-2">
            {sharingTypes.map(type => (
              <Badge key={type} variant="outline" className="py-1.5 px-3">
                <span className="font-medium">{type}-sharing</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span>{bySharing[type].beds} beds</span>
                <span className="mx-2 text-muted-foreground">•</span>
                <span className="text-paid">₹{Math.round(bySharing[type].perBedRent).toLocaleString()}/bed</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Room List */}
        <ScrollArea className="h-[calc(80vh-300px)]">
          <div className="space-y-2">
            {filteredRooms.map(room => (
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
                      <Badge variant="outline" className="text-xs">
                        F{room.floor}
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

            {filteredRooms.length === 0 && roomsWithEmptyBeds.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bed className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>No rooms match the selected filters</p>
              </div>
            )}

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
