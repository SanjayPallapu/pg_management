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
  // Filter rooms with empty beds and sort by potential revenue (highest first)
  const roomsWithEmptyBeds = roomStats
    .filter(r => r.emptyBeds > 0)
    .sort((a, b) => b.potentialAdditionalRent - a.potentialAdditionalRent);

  // Group by sharing type
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

        {/* By Sharing Type */}
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
