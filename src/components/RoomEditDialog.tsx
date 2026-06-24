import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Snowflake, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/proxyClient";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Room } from "@/types";
import { getPricePerBed } from "@/constants/pricing";
import { usePG } from "@/contexts/PGContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
interface RoomEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
}
export const RoomEditDialog = ({ open, onOpenChange, room }: RoomEditDialogProps) => {
  const queryClient = useQueryClient();
  const { currentPG } = usePG();
  const isMobile = useIsMobile();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [capacity, setCapacity] = useState("3");
  const [rentAmount, setRentAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isAc, setIsAc] = useState(false);

  // Reset form when room changes
  useEffect(() => {
    if (room) {
      setCapacity(room.capacity.toString());
      setRentAmount(room.rentAmount.toString());
      setNotes(room.notes || "");
      setIsAc(room.isAc ?? false);
    }
  }, [room]);
  const handleSave = async () => {
    if (!room) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          capacity: parseInt(capacity),
          rent_amount: parseInt(rentAmount),
          notes: notes || null,
          is_ac: isAc,
        })
        .eq("id", room.id);
      if (error) throw error;

      // Invalidate all room queries to ensure data is refreshed
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await queryClient.refetchQueries({ queryKey: ["rooms"], type: "active" });
      
      onOpenChange(false);
    } catch (err) {
      console.error("Error updating room:", err);
      toast.error("Failed to update room");
    } finally {
      setIsSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!room) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", room.id);
      if (error) throw error;

      // Immediate refetch for faster UX
      await queryClient.invalidateQueries({
        queryKey: ["rooms", undefined, currentPG?.id],
      });
      await queryClient.refetchQueries({
        queryKey: ["rooms"],
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (err) {
      console.error("Error deleting room:", err);
      toast.error("Failed to delete room. Make sure it has no tenants.");
    } finally {
      setIsDeleting(false);
    }
  };
  const handleCapacityChange = (newCapacity: string) => {
    setCapacity(newCapacity);
    // Auto-update rent based on pricing
    const cap = parseInt(newCapacity);
    setRentAmount((getPricePerBed(cap) * cap).toString());
  };
  const canDelete = room && room.tenants.length === 0;
  if (!room) return null;
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className={isMobile ? "w-full max-w-full sm:max-w-full px-1.5 pt-4 pb-0 [&>button]:hidden" : "w-full sm:max-w-lg"}
        >
          <SheetHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8 shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <SheetTitle className="text-base">Edit Room {room.roomNo}</SheetTitle>
            </div>
          </SheetHeader>

          <div className="space-y-4 py-4 pt-[5px] pb-0">
            <div className="space-y-2">
              <Label htmlFor="capacity">Room Capacity</Label>
              <Select value={capacity} onValueChange={handleCapacityChange}>
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
              {room.tenants.length > parseInt(capacity) && (
                <p className="text-xs text-destructive">
                  Warning: Current tenants ({room.tenants.length}) exceed new capacity
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rentAmount">Total Room Rent (₹)</Label>
              <Input
                id="rentAmount"
                type="number"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                placeholder="15000"
              />
              <p className="text-xs text-muted-foreground">
                Per bed: ₹{Math.floor(parseInt(rentAmount || "0") / parseInt(capacity)).toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special notes about this room..."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Snowflake className="h-4 w-4 text-sky-500" />
                <div>
                  <Label htmlFor="is-ac" className="text-sm font-medium">AC Room</Label>
                  <p className="text-xs text-muted-foreground">Tenants pay extra electricity bill</p>
                </div>
              </div>
              <Switch id="is-ac" checked={isAc} onCheckedChange={setIsAc} />
            </div>

            {canDelete && (
              <div className="pt-4 border-t">
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Room
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">Only empty rooms can be deleted</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room {room.roomNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The room will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
