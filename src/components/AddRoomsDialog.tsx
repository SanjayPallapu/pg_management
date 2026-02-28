import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePG } from '@/contexts/PGContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getPricePerBed } from '@/constants/pricing';

interface AddRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floor: number;
  existingRoomNos: string[];
}

export const AddRoomsDialog = ({ open, onOpenChange, floor, existingRoomNos }: AddRoomsDialogProps) => {
  const { currentPG } = usePG();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [roomStart, setRoomStart] = useState(`${floor}01`);
  const [roomEnd, setRoomEnd] = useState(`${floor}09`);
  const [capacity, setCapacity] = useState('3');

  const handleAddRooms = async () => {
    if (!currentPG) return;

    const floorStr = String(floor);
    const getRoomIndex = (value: string) => {
      const digits = value.replace(/\D/g, '');
      if (!digits) return 1;
      if (digits.startsWith(floorStr) && digits.length > floorStr.length) {
        return parseInt(digits.slice(floorStr.length), 10) || 1;
      }
      return parseInt(digits, 10) || 1;
    };

    // Parse room numbers - support formats like "201" or "01"
    const startNum = getRoomIndex(roomStart);
    const endNum = getRoomIndex(roomEnd) || startNum;

    if (startNum > endNum) {
      toast.error('Start room number must be less than or equal to end room number');
      return;
    }

    setIsAdding(true);
    try {
      const roomsToAdd = [];
      const cap = parseInt(capacity);

      for (let i = startNum; i <= endNum; i++) {
        // Generate room number based on floor and room index
        const roomNo = `${floor}${i.toString().padStart(2, '0')}`;

        // Skip if room already exists
        if (existingRoomNos.includes(roomNo)) {
          continue;
        }

        roomsToAdd.push({
          pg_id: currentPG.id,
          room_no: roomNo,
          floor: floor,
          capacity: cap,
          rent_amount: getPricePerBed(cap) * cap,
          status: 'Vacant'
        });
      }

      if (roomsToAdd.length === 0) {
        toast.info('All rooms in this range already exist');
        setIsAdding(false);
        return;
      }

      const { error } = await supabase.from('rooms').insert(roomsToAdd);

      if (error) throw error;

      // Immediate refetch for faster UX
      await queryClient.invalidateQueries({ queryKey: ['rooms'], refetchType: 'active' });
      await queryClient.refetchQueries({ queryKey: ['rooms'] });

      toast.success(`Added ${roomsToAdd.length} rooms (${roomsToAdd[0].room_no} to ${roomsToAdd[roomsToAdd.length - 1].room_no})`);
      onOpenChange(false);
    } catch (err) {
      console.error('Error adding rooms:', err);
      toast.error('Failed to add rooms');
    } finally {
      setIsAdding(false);
    }
  };

  // Generate preview of rooms to be added
  const floorStr = String(floor);
  const getRoomIndex = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 1;
    if (digits.startsWith(floorStr) && digits.length > floorStr.length) {
      return parseInt(digits.slice(floorStr.length), 10) || 1;
    }
    return parseInt(digits, 10) || 1;
  };
  const startNum = getRoomIndex(roomStart);
  const endNum = getRoomIndex(roomEnd) || startNum;
  const roomCount = Math.max(0, endNum - startNum + 1);
  const previewRooms = Array.from({ length: Math.min(roomCount, 5) }, (_, i) =>
  `${floor}${(startNum + i).toString().padStart(2, '0')}`
  );
  const hasMore = roomCount > 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Rooms to Floor {floor}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomStart">From Room</Label>
              <Input
                id="roomStart"
                value={roomStart}
                onChange={(e) => setRoomStart(e.target.value)}
                placeholder={`${floor}01`} />

            </div>
            <div className="space-y-2">
              <Label htmlFor="roomEnd">To Room</Label>
              <Input
                id="roomEnd"
                value={roomEnd}
                onChange={(e) => setRoomEnd(e.target.value)}
                placeholder={`${floor}09`} />

            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Room Capacity (Sharing Type)</Label>
            <Select value={capacity} onValueChange={setCapacity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Sharing (Single)</SelectItem>
                <SelectItem value="2">2 Sharing</SelectItem>
                <SelectItem value="3">3 Sharing</SelectItem>
                <SelectItem value="4">4 Sharing</SelectItem>
                <SelectItem value="5">5 Sharing</SelectItem>
                <SelectItem value="6">6 Sharing</SelectItem>
                <SelectItem value="7">7 Sharing</SelectItem>
                <SelectItem value="8">8 Sharing</SelectItem>
                <SelectItem value="9">9 Sharing</SelectItem>
                <SelectItem value="10">10 Sharing</SelectItem>
                <SelectItem value="11">11 Sharing</SelectItem>
                <SelectItem value="12">12 Sharing</SelectItem>
                <SelectItem value="13">13 Sharing</SelectItem>
                <SelectItem value="14">14 Sharing</SelectItem>
                <SelectItem value="15">15 Sharing</SelectItem>
                <SelectItem value="16">16 Sharing</SelectItem>
                <SelectItem value="17">17 Sharing</SelectItem>
                <SelectItem value="18">18 Sharing</SelectItem>
                <SelectItem value="19">19 Sharing</SelectItem>
                <SelectItem value="20">20 Sharing</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Rent per room: ₹{(getPricePerBed(parseInt(capacity)) * parseInt(capacity)).toLocaleString()}
            </p>
          </div>

          {roomCount > 0 &&
          <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium mb-2">Preview ({roomCount} rooms):</p>
              <div className="flex flex-wrap gap-1.5">
                {previewRooms.map((roomNo) =>
              <span
                key={roomNo}
                className={`px-2 py-1 rounded text-xs ${
                existingRoomNos.includes(roomNo) ?
                'bg-destructive/20 text-destructive line-through' :
                'bg-primary/20 text-primary'}`
                }>

                    {roomNo}
                  </span>
              )}
                {hasMore && <span className="px-2 py-1 text-xs text-muted-foreground">...+{roomCount - 5} more</span>}
              </div>
              {existingRoomNos.some((r) => previewRooms.includes(r)) &&
            <p className="text-xs text-muted-foreground mt-2">
                  Crossed out rooms already exist and will be skipped
                </p>
            }
            </div>
          }
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddRooms} disabled={isAdding || roomCount === 0} className="mb-[12px]">
            {isAdding ?
            <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </> :

            <>Add {roomCount} Room{roomCount !== 1 ? 's' : ''}</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

};