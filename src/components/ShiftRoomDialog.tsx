import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { Room, Tenant } from "@/types";
import { useRooms } from "@/hooks/useRooms";
import { isTenantActiveNow } from "@/utils/dateOnly";
import { toast } from "@/hooks/use-toast";
import { useBackGesture } from "@/hooks/useBackGesture";

interface ShiftRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  currentRoom: Room | null;
}

export const ShiftRoomDialog = ({ open, onOpenChange, tenant, currentRoom }: ShiftRoomDialogProps) => {
  const { rooms, updateTenant } = useRooms();
  const [targetRoomId, setTargetRoomId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useBackGesture(open, () => onOpenChange(false));

  const availableRooms = useMemo(() => {
    return rooms
      .filter((r) => r.id !== currentRoom?.id)
      .map((r) => {
        const activeCount = r.tenants.filter((t) => isTenantActiveNow(t.startDate, t.endDate)).length;
        return { ...r, activeCount, hasSpace: activeCount < r.capacity };
      })
      .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }));
  }, [rooms, currentRoom?.id]);

  const targetRoom = availableRooms.find((r) => r.id === targetRoomId);

  const handleShift = async () => {
    if (!tenant || !targetRoom) return;
    if (!targetRoom.hasSpace) {
      toast({ title: "Room is full", description: `Room ${targetRoom.roomNo} has no empty bed.`, variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      // Compute new monthly rent based on per-bed rate of target room (room rent / capacity)
      const perBed = Math.round(targetRoom.rentAmount / Math.max(1, targetRoom.capacity));
      await updateTenant.mutateAsync({
        tenantId: tenant.id,
        tenantName: tenant.name,
        updates: { roomId: targetRoom.id, monthlyRent: perBed } as any,
      });
      toast({
        title: "Tenant shifted",
        description: `${tenant.name} moved to Room ${targetRoom.roomNo}. New rent: ₹${perBed.toLocaleString()}`,
      });
      onOpenChange(false);
      setTargetRoomId("");
    } catch (err) {
      console.error("Shift failed", err);
      toast({ title: "Failed to shift tenant", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!tenant || !currentRoom) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Shift Room
          </DialogTitle>
          <DialogDescription>
            Move <span className="font-semibold text-foreground">{tenant.name}</span> from Room{" "}
            <span className="font-semibold text-foreground">{currentRoom.roomNo}</span> to another room. Payment history
            and security deposit are preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Select new room</Label>
            <Select value={targetRoomId} onValueChange={setTargetRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a room" />
              </SelectTrigger>
              <SelectContent>
                {availableRooms.map((r) => (
                  <SelectItem key={r.id} value={r.id} disabled={!r.hasSpace}>
                    Room {r.roomNo} • {r.activeCount}/{r.capacity}{" "}
                    {!r.hasSpace ? "(Full)" : `• ₹${Math.round(r.rentAmount / Math.max(1, r.capacity)).toLocaleString()}/bed`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetRoom && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium">
                  Room {currentRoom.roomNo} • ₹{tenant.monthlyRent.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">To</span>
                <span className="font-medium">
                  Room {targetRoom.roomNo} • ₹
                  {Math.round(targetRoom.rentAmount / Math.max(1, targetRoom.capacity)).toLocaleString()}/mo
                </span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Rent will be updated to the per-bed rate of the new room. Existing payments stay attached to the tenant.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleShift} disabled={!targetRoomId || isSaving || !targetRoom?.hasSpace}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Shifting...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Shift Tenant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
