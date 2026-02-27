import { useState, useMemo, useCallback } from 'react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { isTenantActiveInMonth, isTenantActiveNow } from '@/utils/dateOnly';
import { RoomCard } from './RoomCard';
import { Input } from '@/components/ui/input';
import { Search, X, Plus, Settings2, Trash2, Edit2 } from 'lucide-react';
import { TenantSearchResults } from './TenantSearchResults';
import { usePG } from '@/contexts/PGContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getPricePerBed } from '@/constants/pricing';
import { AddRoomsDialog } from './AddRoomsDialog';
import { RoomEditDialog } from './RoomEditDialog';
import { FloorManagementSheet } from './FloorManagementSheet';
import { useDayGuests } from '@/hooks/useDayGuests';

interface RoomDirectoryProps {
  rooms: Room[];
  onViewDetails: (room: Room) => void;
}

const getFloorName = (floor: number, roomsOnFloor: Room[]): string => {
  if (roomsOnFloor.length === 0) return `Floor ${floor}`;
  const roomNos = roomsOnFloor.map(r => r.roomNo).sort();
  const first = roomNos[0];
  const last = roomNos[roomNos.length - 1];
  const ordinal = floor === 1 ? '1st' : floor === 2 ? '2nd' : floor === 3 ? '3rd' : `${floor}th`;
  return `${ordinal} Floor (${first}-${last})`;
};

export const RoomDirectory = ({ rooms, onViewDetails }: RoomDirectoryProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { currentPG, refreshPGs } = usePG();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [addRoomsDialogOpen, setAddRoomsDialogOpen] = useState(false);
  const [selectedFloorForRooms, setSelectedFloorForRooms] = useState<number>(1);
  const [floorManagementOpen, setFloorManagementOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  // Fetch all day guests once at directory level to avoid N+1 queries
  const { dayGuests: allDayGuests } = useDayGuests();
  
  // Group day guests by room_id for efficient lookup
  const dayGuestsByRoom = useMemo(() => {
    const map: Record<string, typeof allDayGuests> = {};
    allDayGuests.forEach(guest => {
      if (!map[guest.room_id]) {
        map[guest.room_id] = [];
      }
      map[guest.room_id].push(guest);
    });
    return map;
  }, [allDayGuests]);

  const isSelectedCurrentMonth = useMemo(() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  }, [selectedMonth, selectedYear]);

  const occupiedCountForMonth = useCallback((room: Room) =>
    room.tenants.filter(t =>
      isSelectedCurrentMonth
        ? isTenantActiveNow(t.startDate, t.endDate)
        : isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
    ).length, [isSelectedCurrentMonth, selectedMonth, selectedYear]);

  // Dynamically determine floors from actual room data
  const floorData = useMemo(() => {
    const floorsFromRooms = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
    // If no rooms, use PG floors setting or default to 1
    const pgFloors = currentPG?.floors || 3;
    const allFloors = floorsFromRooms.length > 0 
      ? floorsFromRooms 
      : Array.from({ length: pgFloors }, (_, i) => i + 1);
    
    // Also include floors from PG setting that might be empty
    const maxFloor = Math.max(...floorsFromRooms, pgFloors);
    const combinedFloors = Array.from({ length: maxFloor }, (_, i) => i + 1);
    
    return combinedFloors.map(floor => {
      const roomsOnFloor = rooms.filter(r => r.floor === floor).sort((a, b) => a.roomNo.localeCompare(b.roomNo));
      return {
        floor,
        rooms: roomsOnFloor,
        name: getFloorName(floor, roomsOnFloor),
      };
    });
  }, [rooms, currentPG?.floors]);

  const openAddRoomsDialog = useCallback((floor: number) => {
    setSelectedFloorForRooms(floor);
    setAddRoomsDialogOpen(true);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-3 rounded-xl p-4 bg-gradient-to-r from-primary/15 via-primary/8 to-accent/10 border border-primary/20">
          <div>
            <h2 className="font-bold tracking-tight text-lg">Room Directory</h2>
            <p className="text-muted-foreground">Overview of all rooms organized by floor</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFloorManagementOpen(true)}
            className="flex items-center gap-1 bg-background/70 backdrop-blur-sm"
          >
            <Settings2 className="h-4 w-4" />
            Manage Floors
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or room no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {searchQuery.trim() && (
        <TenantSearchResults rooms={rooms} searchQuery={searchQuery} onNavigateToRoom={onViewDetails} />
      )}

      {floorData.map(({ floor, rooms: roomsOnFloor, name }, index) => {
        const floorColors = [
          'from-blue-500/12 via-indigo-500/8 to-purple-500/6 border-blue-500/20',
          'from-emerald-500/12 via-teal-500/8 to-cyan-500/6 border-emerald-500/20',
          'from-amber-500/12 via-orange-500/8 to-yellow-500/6 border-amber-500/20',
          'from-rose-500/12 via-pink-500/8 to-fuchsia-500/6 border-rose-500/20',
          'from-violet-500/12 via-purple-500/8 to-indigo-500/6 border-violet-500/20',
        ];
        const colorClass = floorColors[index % floorColors.length];

        return (
        <div key={floor} className="space-y-4">
          <div className={`flex items-center justify-between rounded-xl p-4 bg-gradient-to-r ${colorClass} border`}>
            <div className="border-l-4 border-primary pl-4">
              <h3 className="font-semibold text-lg">{name}</h3>
              <p className="text-sm text-muted-foreground">
                {roomsOnFloor.filter(r => occupiedCountForMonth(r) === r.capacity).length} fully occupied,{' '}
                {roomsOnFloor.filter(r => {
                  const c = occupiedCountForMonth(r);
                  return c > 0 && c < r.capacity;
                }).length} partially occupied,{' '}
                {roomsOnFloor.filter(r => occupiedCountForMonth(r) === 0).length} vacant
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddRoomsDialog(floor)}
              className="flex items-center gap-1 bg-background/60 backdrop-blur-sm"
            >
              <Plus className="h-4 w-4" />
              Add Rooms
            </Button>
          </div>
          
          {roomsOnFloor.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {roomsOnFloor.map(room => (
                <RoomCard 
                  key={room.roomNo} 
                  room={room} 
                  onViewDetails={onViewDetails}
                  onEditRoom={setEditingRoom}
                  dayGuests={dayGuestsByRoom[room.id] || []}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/30 rounded-lg">
              <p className="text-muted-foreground mb-3">No rooms on this floor yet</p>
              <Button variant="outline" onClick={() => openAddRoomsDialog(floor)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rooms ({floor}01 - {floor}09)
              </Button>
            </div>
          )}
        </div>
        );
      })}

      <AddRoomsDialog
        open={addRoomsDialogOpen}
        onOpenChange={setAddRoomsDialogOpen}
        floor={selectedFloorForRooms}
        existingRoomNos={rooms.map(r => r.roomNo)}
      />
      
      <RoomEditDialog
        open={!!editingRoom}
        onOpenChange={(open) => !open && setEditingRoom(null)}
        room={editingRoom}
      />
      
      <FloorManagementSheet
        open={floorManagementOpen}
        onOpenChange={setFloorManagementOpen}
        rooms={rooms}
      />
    </div>
  );
};
