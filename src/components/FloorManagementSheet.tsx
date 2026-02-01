import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, Edit2, Plus, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePG } from '@/contexts/PGContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Room } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Get floor data from rooms
  const floorsFromRooms = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  const pgFloors = currentPG?.floors || 3;
  
  // Use the higher of actual floors or PG setting
  const maxFloor = Math.max(...floorsFromRooms, pgFloors);
  const allFloors = Array.from({ length: maxFloor }, (_, i) => i + 1);

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
      setShowDeleteConfirm(null);
    }
  };

  const getOrdinal = (n: number) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
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
                    <h4 className="font-semibold">{getOrdinal(floor)} Floor</h4>
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
                        onClick={() => setShowDeleteConfirm(floor)}
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
                  Add Floor {maxFloor + 1}
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {getOrdinal(showDeleteConfirm || 0)} Floor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the floor from your property. You can add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteConfirm && handleDeleteFloor(showDeleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Floor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
