import { useState } from 'react';
import { Room } from '@/types';
import { useMonthContext } from '@/contexts/MonthContext';
import { isTenantActiveInMonth, isTenantActiveNow } from '@/utils/dateOnly';
import { RoomCard } from './RoomCard';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { TenantSearchResults } from './TenantSearchResults';

interface RoomDirectoryProps {
  rooms: Room[];
  onViewDetails: (room: Room) => void;
}

export const RoomDirectory = ({ rooms, onViewDetails }: RoomDirectoryProps) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const [searchQuery, setSearchQuery] = useState('');

  const isSelectedCurrentMonth = (() => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  })();

  const occupiedCountForMonth = (room: Room) =>
    room.tenants.filter(t =>
      isSelectedCurrentMonth
        ? isTenantActiveNow(t.startDate, t.endDate)
        : isTenantActiveInMonth(t.startDate, t.endDate, selectedYear, selectedMonth)
    ).length;

  const roomsByFloor = {
    1: rooms.filter(room => room.floor === 1).sort((a, b) => a.roomNo.localeCompare(b.roomNo)),
    2: rooms.filter(room => room.floor === 2).sort((a, b) => a.roomNo.localeCompare(b.roomNo)),
    3: rooms.filter(room => room.floor === 3).sort((a, b) => a.roomNo.localeCompare(b.roomNo))
  };
  const floorNames = {
    1: '1st Floor (101-109)',
    2: '2nd Floor (201-209)',
    3: '3rd Floor (301-305)'
  };

  return <div className="space-y-8">
      <div>
        <h2 className="font-bold tracking-tight text-lg">Room Directory</h2>
        <p className="text-muted-foreground mb-3">Overview of all rooms organized by floor</p>
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

      {([1, 2, 3] as const).map(floor => <div key={floor} className="space-y-4">
          <div className="border-l-4 border-primary pl-4">
            <h3 className="font-semibold text-lg">{floorNames[floor]}</h3>
            <p className="text-sm text-muted-foreground">
              {roomsByFloor[floor].filter(r => occupiedCountForMonth(r) === r.capacity).length} fully occupied,{' '}
              {roomsByFloor[floor].filter(r => {
                const c = occupiedCountForMonth(r);
                return c > 0 && c < r.capacity;
              }).length} partially occupied,{' '}
              {roomsByFloor[floor].filter(r => occupiedCountForMonth(r) === 0).length} vacant
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roomsByFloor[floor].map(room => <RoomCard key={room.roomNo} room={room} onViewDetails={onViewDetails} />)}
          </div>
        </div>)}
    </div>;
};
