import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft, BedDouble } from "lucide-react";
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

  // A room chosen during an earlier attempt must never carry into the next shift.
  useEffect(() => {
    if (open) setTargetRoomId("");
  }, [open, tenant?.id]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setTargetRoomId("");
    onOpenChange(nextOpen);
  };

  useBackGesture(open, () => handleOpenChange(false));

  const availableRooms = useMemo(() => {
    return rooms
      .filter((r) => r.id !== currentRoom?.id)
      .map((r) => {
        const activeTenantIds = new Set(
          r.tenants.filter((t) => isTenantActiveNow(t.startDate, t.endDate)).map((t) => t.id),
        );
        const activeCount = activeTenantIds.size;
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

      toast({ title: "Tenant shifted", description: `${tenant.name} is now in Room ${targetRoom.roomNo}.` });
      handleOpenChange(false);
    } catch (err) {
      console.error("Shift failed", err);
      toast({ title: "Failed to shift tenant", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!tenant || !currentRoom) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-5 sm:p-6">
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
            <Label>Select a new room</Label>
            {availableRooms.length ? (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {availableRooms.map((r) => {
                  const perBed = Math.round(r.rentAmount / Math.max(1, r.capacity));
                  const isSelected = r.id === targetRoomId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!r.hasSpace || isSaving}
                      onClick={() => setTargetRoomId(r.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : r.hasSpace
                            ? "border-border bg-background hover:border-primary/50 hover:bg-muted/40"
                            : "cursor-not-allowed border-border bg-muted/40 opacity-55"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><BedDouble className="h-4 w-4" /></span>
                        <span>
                          <span className="block font-semibold">Room {r.roomNo}</span>
                          <span className="block text-xs text-muted-foreground">{r.activeCount} of {r.capacity} beds occupied</span>
                        </span>
                      </span>
                      <span className={`text-right text-xs font-semibold ${r.hasSpace ? "text-foreground" : "text-destructive"}`}>
                        {r.hasSpace ? <>₹{perBed.toLocaleString()}<span className="block font-normal text-muted-foreground">per month</span></> : "Full"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">There are no other rooms to shift this tenant to.</div>
            )}
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
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
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
