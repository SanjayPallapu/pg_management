import { Room } from "@/types";
import { RoomCard } from "./RoomCard";

interface RoomDirectoryProps {
  rooms: Room[];
  onViewDetails: (room: Room) => void;
}

export const RoomDirectory = ({ rooms, onViewDetails }: RoomDirectoryProps) => {
  const roomsByFloor = {
    1: rooms.filter((room) => room.floor === 1).sort((a, b) => a.roomNo.localeCompare(b.roomNo)),
    2: rooms.filter((room) => room.floor === 2).sort((a, b) => a.roomNo.localeCompare(b.roomNo)),
    3: rooms.filter((room) => room.floor === 3).sort((a, b) => a.roomNo.localeCompare(b.roomNo)),
  };

  const floorNames = {
    1: "1st Floor (101-109)",
    2: "2nd Floor (201-209)",
    3: "3rd Floor (301-305)",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Room Directory</h1>
        <p className="text-muted-foreground">Overview of all rooms organized by floor</p>
      </div>

      {([1, 2, 3] as const).map((floor) => (
        <div key={floor} className="space-y-4">
          <div className="border-l-4 border-primary pl-4">
            <h3 className="text-xl font-semibold">{floorNames[floor]}</h3>
            <p className="text-sm text-muted-foreground">
              {roomsByFloor[floor].filter((r) => r.tenants.length === r.capacity).length} fully occupied,{" "}
              {roomsByFloor[floor].filter((r) => r.tenants.length > 0 && r.tenants.length < r.capacity).length}{" "}
              partially occupied, {roomsByFloor[floor].filter((r) => r.tenants.length === 0).length} vacant
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {roomsByFloor[floor].map((room) => (
              <RoomCard key={room.roomNo} room={room} onViewDetails={onViewDetails} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
