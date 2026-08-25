import { useMemo, useState } from 'react';
import { useBackGesture } from '@/hooks/useBackGesture';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Bed, 
  Users, 
  SlidersHorizontal, 
  ArrowLeft, 
  CalendarClock, 
  Phone, 
  CheckCircle2, 
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { parseDateOnly, getDaysUntilJoining } from '@/utils/dateOnly';

export interface ReservedTenantInfo {
  id: string;
  name: string;
  phone?: string;
  startDate: string;
  deposit?: number;
  rent?: number;
}

export interface RoomStat {
  roomNo: string;
  capacity: number;
  occupied: number;
  emptyBeds: number;
  reservedBeds?: number;
  upcomingTenants?: ReservedTenantInfo[];
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved'>('all');

  // Handle OS back gesture to close sheet
  useBackGesture(open, () => onOpenChange(false));

  const totalReservedBeds = useMemo(() => {
    return roomStats.reduce((sum, r) => sum + (r.reservedBeds || 0), 0);
  }, [roomStats]);

  const totalReadyToMoveBeds = Math.max(0, totalEmptyBeds - totalReservedBeds);

  // Filter rooms with empty beds and sort by sharing type (highest first), then by room number
  const roomsWithEmptyBeds = useMemo(() => {
    return roomStats
      .filter((r) => r.emptyBeds > 0)
      .filter((r) => floorFilter === null || r.floor === floorFilter)
      .filter((r) => sharingFilter === null || r.capacity === sharingFilter)
      .filter((r) => {
        if (statusFilter === 'available') return (r.emptyBeds - (r.reservedBeds || 0)) > 0;
        if (statusFilter === 'reserved') return (r.reservedBeds || 0) > 0;
        return true;
      })
      .sort((a, b) => b.capacity - a.capacity || a.roomNo.localeCompare(b.roomNo));
  }, [roomStats, floorFilter, sharingFilter, statusFilter]);

  // Group by sharing type (from all rooms with empty beds, not filtered)
  const bySharing = useMemo(() => {
    const allRoomsWithEmptyBeds = roomStats.filter((r) => r.emptyBeds > 0);

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
    const floorsWithEmpty = [...new Set(roomStats.filter((r) => r.emptyBeds > 0).map((r) => r.floor))].sort();
    return floorsWithEmpty.map((floor) => {
      const allRoomsOnFloor = roomStats.filter((r) => r.floor === floor);
      const emptyBeds = allRoomsOnFloor.reduce((sum, r) => sum + r.emptyBeds, 0);
      const reservedBeds = allRoomsOnFloor.reduce((sum, r) => sum + (r.reservedBeds || 0), 0);
      const totalCapacity = allRoomsOnFloor.reduce((sum, r) => sum + r.capacity, 0);
      return { floor, emptyBeds, reservedBeds, totalCapacity };
    });
  }, [roomStats]);

  // Get unique floors from rooms with empty beds (unfiltered)
  const availableFloors = useMemo(() => {
    return floorSummary.map((f) => f.floor);
  }, [floorSummary]);

  // Get unique sharing types sorted descending
  const availableSharingTypes = useMemo(() => {
    return [...new Set(roomStats.filter((r) => r.emptyBeds > 0).map((r) => r.capacity))].sort((a, b) => b - a);
  }, [roomStats]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-3 pt-4 pb-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Bed className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <SheetTitle className="text-base text-foreground font-bold truncate">
                    Empty Beds Breakdown
                  </SheetTitle>
                  <p className="text-[11px] text-muted-foreground">Detailed occupancy, available &amp; reserved beds</p>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {/* Top Summary Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-semibold">Empty Beds</span>
                  <Bed className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-xl font-extrabold text-primary mt-1">{totalEmptyBeds}</div>
                <p className="text-[10px] text-muted-foreground">Total Vacancies</p>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Ready Now</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {totalReadyToMoveBeds}
                </div>
                <p className="text-[10px] text-muted-foreground">Available to book</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">Reserved</span>
                  <CalendarClock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  {totalReservedBeds}
                </div>
                <p className="text-[10px] text-muted-foreground">Advance Booked</p>
              </div>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                    statusFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All ({totalEmptyBeds})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('available')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                    statusFilter === 'available'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Available Now ({totalReadyToMoveBeds})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('reserved')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                    statusFilter === 'reserved'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Reserved ({totalReservedBeds})
                </button>
              </div>

              {/* Filter Popover for Sharing & Floor */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs shrink-0 gap-1">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Filter</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-3 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1.5">Sharing Type</div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={sharingFilter === null ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSharingFilter(null)}
                      >
                        All
                      </Button>
                      {availableSharingTypes.map((capacity) => (
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
                    <div className="text-xs font-semibold text-muted-foreground mb-1.5">Floor</div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant={floorFilter === null ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setFloorFilter(null)}
                      >
                        All
                      </Button>
                      {availableFloors.map((floor) => (
                        <Button
                          key={floor}
                          variant={floorFilter === floor ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setFloorFilter(floor)}
                        >
                          Floor {floor}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Room List Breakdown */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
                <span>Rooms with Vacancies ({roomsWithEmptyBeds.length})</span>
                <span>Potential: +₹{Math.round(totalPotentialRevenue).toLocaleString()}/mo</span>
              </div>

              {roomsWithEmptyBeds.map((room) => {
                const reservedCount = room.reservedBeds || 0;
                const availableNowCount = Math.max(0, room.emptyBeds - reservedCount);
                const upcoming = room.upcomingTenants || [];

                return (
                  <div
                    key={room.roomNo}
                    className="p-3.5 rounded-xl border bg-card hover:border-primary/40 transition-all shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center border border-primary/20">
                          {room.roomNo}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">Room {room.roomNo}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                              Floor {room.floor} · {room.capacity}-sharing
                            </Badge>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Users className="h-3 w-3" />
                            <span>{room.occupied}/{room.capacity} occupied</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold text-foreground">
                          ₹{Math.round(room.perBedRent).toLocaleString()}
                          <span className="text-[10px] font-normal text-muted-foreground">/bed</span>
                        </div>
                        <div className="text-[11px] font-semibold text-paid">
                          +₹{Math.round(room.potentialAdditionalRent).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Bed Status Visual Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50 text-xs">
                      {availableNowCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/20 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{availableNowCount} Bed{availableNowCount > 1 ? 's' : ''} Ready to Move</span>
                        </div>
                      )}

                      {reservedCount > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30 text-[11px]">
                          <CalendarClock className="h-3 w-3" />
                          <span>{reservedCount} Bed{reservedCount > 1 ? 's' : ''} Reserved</span>
                        </div>
                      )}
                    </div>

                    {/* Reserved Tenant Details inside Room Card */}
                    {upcoming.length > 0 && (
                      <div className="space-y-1.5 bg-amber-500/5 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-300/40 dark:border-amber-800/40">
                        <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          Advance Bookings in this room:
                        </div>
                        {upcoming.map((t) => {
                          const daysLeft = getDaysUntilJoining(t.startDate);
                          return (
                            <div key={t.id} className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/50 dark:border-amber-900/30 first:border-t-0 first:pt-0">
                              <div>
                                <span className="font-bold text-amber-950 dark:text-amber-100">{t.name}</span>
                                <div className="text-[11px] text-amber-800 dark:text-amber-300">
                                  Joining {format(parseDateOnly(t.startDate), 'dd MMM yyyy')} ({daysLeft > 0 ? `in ${daysLeft} days` : 'Today'})
                                </div>
                                {t.deposit && t.deposit > 0 ? (
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                                    Advance: ₹{t.deposit.toLocaleString()}
                                  </span>
                                ) : null}
                              </div>

                              {t.phone && t.phone !== '••••••••••' && (
                                <a
                                  href={`tel:${t.phone}`}
                                  className="p-1 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
                                  title={`Call ${t.name}`}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {roomsWithEmptyBeds.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed p-6">
                  <Bed className="h-10 w-10 mx-auto mb-2 opacity-40 text-emerald-500" />
                  <p className="font-semibold text-sm">No vacant beds match the current filter</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All beds in this selection are fully occupied!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
