import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bed, Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoomStat {
  roomNo: string;
  floor: number;
  capacity: number;
  occupied: number;
  emptyBeds: number;
  perBedRent: number;
  potentialAdditionalRent: number;
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
  const [selectedFloor, setSelectedFloor] = useState<string>('all');

  // Get unique floors
  const floors = [...new Set(roomStats.map(r => r.floor))].sort((a, b) => a - b);

  // Filter rooms with empty beds
  const roomsWithEmptyBeds = roomStats
    .filter(r => r.emptyBeds > 0)
    .filter(r => selectedFloor === 'all' || r.floor === parseInt(selectedFloor))
    .sort((a, b) => b.potentialAdditionalRent - a.potentialAdditionalRent);

  // Calculate filtered totals
  const filteredEmptyBeds = roomsWithEmptyBeds.reduce((sum, r) => sum + r.emptyBeds, 0);
  const filteredPotentialRevenue = roomsWithEmptyBeds.reduce((sum, r) => sum + r.potentialAdditionalRent, 0);

  // Group by sharing type (for filtered rooms)
  const bySharing = roomsWithEmptyBeds.reduce((acc, room) => {
    const key = `${room.capacity}-sharing`;
    if (!acc[key]) {
      acc[key] = { beds: 0, revenue: 0, perBedRent: room.perBedRent };
    }
    acc[key].beds += room.emptyBeds;
    acc[key].revenue += room.potentialAdditionalRent;
    return acc;
  }, {} as Record<string, { beds: number; revenue: number; perBedRent: number }>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5 text-primary" />
              Empty Beds Breakdown
            </SheetTitle>
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Floor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map(floor => (
                  <SelectItem key={floor} value={floor.toString()}>
                    Floor {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-primary">
              {selectedFloor === 'all' ? totalEmptyBeds : filteredEmptyBeds}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedFloor === 'all' ? 'Total Empty Beds' : `Floor ${selectedFloor} Empty Beds`}
            </p>
          </div>
          <div className="bg-paid/10 rounded-lg p-3">
            <div className="text-2xl font-bold text-paid">
              ₹{Math.round(selectedFloor === 'all' ? totalPotentialRevenue : filteredPotentialRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Potential Revenue</p>
          </div>
        </div>

        {/* By Sharing Type */}
        {Object.keys(bySharing).length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">By Sharing Type</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(bySharing).map(([type, data]) => (
                <Badge key={type} variant="outline" className="py-1.5 px-3">
                  <span className="font-medium">{type}</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span>{data.beds} beds</span>
                  <span className="mx-2 text-muted-foreground">•</span>
                  <span className="text-paid">₹{Math.round(data.perBedRent).toLocaleString()}/bed</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Room List */}
        <ScrollArea className="h-[calc(80vh-240px)]">
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

            {roomsWithEmptyBeds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bed className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>{selectedFloor === 'all' ? 'All beds are occupied!' : `No empty beds on Floor ${selectedFloor}`}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
