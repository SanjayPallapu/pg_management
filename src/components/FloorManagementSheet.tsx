import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, Edit2, Plus, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePG } from '@/contexts/PGContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Room } from '@/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FloorManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
}

export const FloorManagementSheet = ({ open, onOpenChange, rooms }: FloorManagementSheetProps) => {
  const { currentPG, refreshPGs } = usePG();
  const queryClient = useQueryClient();
  const [isAddingFloor, setIsAddingFloor] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState<number | null>(null);

  type DeleteFlow = {
    floor: number;
    step: 1 | 2 | 3 | 4;
    typed: string;
    checked: boolean;
  };
  const [deleteFlow, setDeleteFlow] = useState<DeleteFlow | null>(null);

  // Get floor data from rooms
   const floorsFromRooms = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
   const hasGroundFloor = floorsFromRooms.includes(0);
  const pgFloors = currentPG?.floors || 3;
  
  // Use the higher of actual floors or PG setting
  const maxFloor = Math.max(...floorsFromRooms, pgFloors);
   // Include floor 0 (Ground) if it exists in rooms, then 1 to maxFloor
   const allFloors = hasGroundFloor 
     ? [0, ...Array.from({ length: maxFloor }, (_, i) => i + 1)]
     : Array.from({ length: maxFloor }, (_, i) => i + 1);

  const getFloorStats = (floor: number) => {
    const roomsOnFloor = rooms.filter(r => r.floor === floor);
    const totalTenants = roomsOnFloor.reduce((sum, r) => sum + r.tenants.length, 0);
    return {
      rooms: roomsOnFloor.length,
      tenants: totalTenants,
      canDelete: roomsOnFloor.length === 0,
    };
  };

  const handleAddFloor = async () => {
    if (!currentPG) return;
    setIsAddingFloor(true);
    
    try {
       const newFloorCount = maxFloor + 1;
      
      const { error } = await supabase
        .from('pgs')
        .update({ floors: newFloorCount })
        .eq('id', currentPG.id);
      
      if (error) throw error;
      
      // Refresh PGs and immediately refetch to update UI
      await refreshPGs();
      await queryClient.refetchQueries({ queryKey: ['rooms'] });
      
      toast.success(`Floor ${newFloorCount} added`);
    } catch (err) {
      console.error('Error adding floor:', err);
      toast.error('Failed to add floor');
    } finally {
      setIsAddingFloor(false);
    }
  };
 
   const handleAddGroundFloor = async () => {
     if (!currentPG || hasGroundFloor) return;
     // Ground floor doesn't increase floor count - it's floor 0
     // Just show a message to add rooms on ground floor
     toast.info('Ground Floor enabled! Add rooms with floor 0 to use it.');
   };

  const handleDeleteFloor = async (floor: number) => {
    if (!currentPG) return;
    
    const stats = getFloorStats(floor);
    if (!stats.canDelete) {
      toast.error('Cannot delete floor with rooms. Delete all rooms first.');
      return;
    }

    setDeletingFloor(floor);
    try {
      // If this is the top floor, reduce floor count
      if (floor === maxFloor) {
        const { error } = await supabase
          .from('pgs')
          .update({ floors: maxFloor - 1 })
          .eq('id', currentPG.id);
        
        if (error) throw error;
        
        await refreshPGs();
        await queryClient.refetchQueries({ queryKey: ['rooms'] });
        
        toast.success(`Floor ${floor} removed`);
      } else {
        toast.info('Can only remove the top floor. Delete rooms on higher floors first.');
      }
    } catch (err) {
      console.error('Error deleting floor:', err);
      toast.error('Failed to delete floor');
    } finally {
      setDeletingFloor(null);
      setDeleteFlow(null);
    }
  };

   const getFloorLabel = (n: number) => {
     if (n === 0) return 'Ground Floor';
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
     return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) + ' Floor';
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manage Floors
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(80vh-120px)]">
            {allFloors.map(floor => {
              const stats = getFloorStats(floor);
              const roomsOnFloor = rooms.filter(r => r.floor === floor).sort((a, b) => a.roomNo.localeCompare(b.roomNo));
              const roomRange = roomsOnFloor.length > 0 
                ? `${roomsOnFloor[0].roomNo} - ${roomsOnFloor[roomsOnFloor.length - 1].roomNo}`
                : 'No rooms';
              
              return (
                <div
                  key={floor}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div>
                     <h4 className="font-semibold">{getFloorLabel(floor)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {stats.rooms} rooms • {stats.tenants} tenants
                    </p>
                    <p className="text-xs text-muted-foreground">{roomRange}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {floor === maxFloor && stats.canDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteFlow({ floor, step: 1, typed: '', checked: false })}
                        disabled={deletingFloor === floor}
                      >
                        {deletingFloor === floor ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

             {/* Add Ground Floor button - only show if no ground floor exists */}
             {!hasGroundFloor && (
               <Button
                 variant="outline"
                 onClick={handleAddGroundFloor}
                 className="w-full border-dashed mb-2"
               >
                 <Plus className="h-4 w-4 mr-2" />
                 Add Ground Floor (Floor 0)
               </Button>
             )}
 
            <Button
              variant="outline"
              onClick={handleAddFloor}
              disabled={isAddingFloor}
              className="w-full border-dashed"
            >
              {isAddingFloor ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Floor...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                   Add {getFloorLabel(maxFloor + 1)}
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteFlow !== null} onOpenChange={(o) => !o && setDeleteFlow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteFlow?.step === 1 && `Step 1/4: Delete ${getFloorLabel(deleteFlow.floor)}?`}
              {deleteFlow?.step === 2 && `Step 2/4: Type DELETE`}
              {deleteFlow?.step === 3 && `Step 3/4: Confirm understanding`}
              {deleteFlow?.step === 4 && `Step 4/4: Final confirmation`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteFlow?.step === 1 && (
                <>This action removes the top floor from your property settings. This can’t be undone.</>
              )}
              {deleteFlow?.step === 2 && (
                <>To continue, type <b>DELETE</b> below.</>
              )}
              {deleteFlow?.step === 3 && (
                <>Please confirm you understand what this will do.</>
              )}
              {deleteFlow?.step === 4 && (
                <>Last step: click <b>Delete Floor</b> to proceed.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteFlow?.step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Type DELETE</Label>
              <Input
                id="delete-confirm"
                value={deleteFlow.typed}
                onChange={(e) => setDeleteFlow((p) => (p ? { ...p, typed: e.target.value } : p))}
                placeholder="DELETE"
                autoFocus
              />
            </div>
          )}

          {deleteFlow?.step === 3 && (
            <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/30">
              <Checkbox
                id="understand"
                checked={deleteFlow.checked}
                onCheckedChange={(v) => setDeleteFlow((p) => (p ? { ...p, checked: Boolean(v) } : p))}
              />
              <Label htmlFor="understand" className="leading-relaxed">
                I understand this removes <b>{getFloorLabel(deleteFlow.floor)}</b> (only possible if it has no rooms).
              </Label>
            </div>
          )}

          {deleteFlow?.step === 4 && (
            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
              <div className="text-sm">
                Floor: <b>{getFloorLabel(deleteFlow.floor)}</b>
              </div>
              <div className="text-sm text-muted-foreground">
                Requirement: typed DELETE + checked understanding.
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            {/* Back */}
            {deleteFlow && deleteFlow.step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setDeleteFlow((p) => (p ? { ...p, step: (p.step - 1) as DeleteFlow['step'] } : p))
                }
              >
                Back
              </Button>
            )}

            {/* Continue / Delete */}
            {deleteFlow?.step !== 4 ? (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteFlow((p) => (p ? { ...p, step: (p.step + 1) as DeleteFlow['step'] } : p));
                }}
                disabled={
                  deleteFlow?.step === 2
                    ? deleteFlow.typed.trim().toUpperCase() !== 'DELETE'
                    : deleteFlow?.step === 3
                      ? !deleteFlow.checked
                      : false
                }
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  if (deleteFlow) handleDeleteFloor(deleteFlow.floor);
                }}
                disabled={
                  !deleteFlow ||
                  deletingFloor === deleteFlow.floor ||
                  deleteFlow.typed.trim().toUpperCase() !== 'DELETE' ||
                  !deleteFlow.checked
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteFlow && deletingFloor === deleteFlow.floor ? 'Deleting…' : 'Delete Floor'}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
