import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Trash2, Edit2, Plus, Settings2, ArrowLeft, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/proxyClient';
import { usePG } from '@/contexts/PGContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Room } from '@/types';
import { AddRoomsDialog } from './AddRoomsDialog';
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
  onFloorNamesUpdated?: () => void;
}

export const getSavedFloorName = (pgId: string, floor: number, defaultName: string): string => {
  try {
    const saved = localStorage.getItem(`pg_floor_names_${pgId}`);
    if (saved) {
      const names = JSON.parse(saved);
      if (names[floor]) return names[floor];
    }
  } catch (e) {
    console.error(e);
  }
  return defaultName;
};

export const saveFloorName = (pgId: string, floor: number, name: string) => {
  try {
    const saved = localStorage.getItem(`pg_floor_names_${pgId}`) || '{}';
    const names = JSON.parse(saved);
    names[floor] = name;
    localStorage.setItem(`pg_floor_names_${pgId}`, JSON.stringify(names));
  } catch (e) {
    console.error(e);
  }
};

export const FloorManagementSheet = ({ open, onOpenChange, rooms, onFloorNamesUpdated }: FloorManagementSheetProps) => {
  const { currentPG, refreshPGs } = usePG();
  const queryClient = useQueryClient();
  const [isAddingFloor, setIsAddingFloor] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState<number | null>(null);
  const [addRoomsFloor, setAddRoomsFloor] = useState<number | null>(null);
  
  // Floor edit state
  const [editingFloor, setEditingFloor] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Room edit state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomNo, setEditingRoomNo] = useState<string>('');

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
      
      await refreshPGs();
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
      onFloorNamesUpdated?.();
      
    } catch (err) {
      console.error('Error adding floor:', err);
      toast.error('Failed to add floor');
    } finally {
      setIsAddingFloor(false);
    }
  };
 
  const handleAddGroundFloor = async () => {
    if (!currentPG || hasGroundFloor) return;
    setAddRoomsFloor(0);
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
      if (floor === maxFloor) {
        const { error } = await supabase
          .from('pgs')
          .update({ floors: maxFloor - 1 })
          .eq('id', currentPG.id);
        
        if (error) throw error;
        
        await refreshPGs();
        await queryClient.invalidateQueries({ queryKey: ['rooms'] });
        onFloorNamesUpdated?.();
      }
    } catch (err) {
      console.error('Error deleting floor:', err);
      toast.error('Failed to delete floor');
    } finally {
      setDeletingFloor(null);
      setDeleteFlow(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase.from("rooms").delete().eq("id", roomId);
      if (error) throw error;
      toast.success("Room deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch (err) {
      console.error("Error deleting room:", err);
      toast.error("Failed to delete room");
    }
  };

  const handleRenameRoom = async (roomId: string, roomNo: string) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ room_no: roomNo.trim() })
        .eq("id", roomId);
      if (error) throw error;
      toast.success("Room renamed successfully");
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setEditingRoomId(null);
    } catch (err) {
      console.error("Error renaming room:", err);
      toast.error("Failed to rename room");
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
        <SheetContent className="px-1.5 w-full max-w-md sm:max-w-lg flex flex-col h-full overflow-hidden">
          <SheetHeader className="flex flex-row items-center gap-2 space-y-0 pb-4 border-b border-border/40 px-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="flex items-center justify-between text-base font-semibold flex-1">
              <span>Manage Floors</span>
              <Settings2 className="h-4 w-4 text-primary" />
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 flex-1 space-y-4 overflow-y-auto px-1.5 pb-6">
            {allFloors.map(floor => {
              const stats = getFloorStats(floor);
              const roomsOnFloor = rooms.filter(r => r.floor === floor).sort((a, b) => a.roomNo.localeCompare(b.roomNo));
              const roomRange = roomsOnFloor.length > 0 
                ? `${roomsOnFloor[0].roomNo} - ${roomsOnFloor[roomsOnFloor.length - 1].roomNo}`
                : 'No rooms';
              
              const defaultLabel = getFloorLabel(floor);
              const displayName = currentPG ? getSavedFloorName(currentPG.id, floor, defaultLabel) : defaultLabel;
              const isEditing = editingFloor === floor;
              
              if (isEditing) {
                return (
                  <div
                    key={floor}
                    className="flex flex-col gap-3 p-3.5 border rounded-xl bg-card border-primary/20 shadow-sm transition-all duration-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 text-xs font-semibold px-2 flex-1"
                        placeholder="Enter floor name..."
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                          onClick={() => {
                            if (currentPG) {
                              saveFloorName(currentPG.id, floor, editingName.trim() || defaultLabel);
                              setEditingFloor(null);
                              onFloorNamesUpdated?.();
                              toast.success('Floor renamed successfully');
                            }
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                          onClick={() => setEditingFloor(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Rooms management */}
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rooms on floor</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAddRoomsFloor(floor)}
                          className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/5 gap-0.5"
                        >
                          <Settings2 className="h-3 w-3 text-primary" /> Add Room
                        </Button>
                      </div>

                      {roomsOnFloor.length > 0 ? (
                        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                          {roomsOnFloor.map(room => {
                            const isEditingRoom = editingRoomId === room.id;
                            if (isEditingRoom) {
                              return (
                                <div key={room.id} className="flex items-center justify-between gap-1.5 p-1 px-2 rounded-lg border border-primary/20 bg-muted/20">
                                  <Input
                                    value={editingRoomNo}
                                    onChange={(e) => setEditingRoomNo(e.target.value)}
                                    className="h-7 text-xs font-semibold px-1.5 w-24"
                                    placeholder="Room No"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-0.5">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600 rounded-md"
                                      onClick={() => handleRenameRoom(room.id, editingRoomNo)}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground rounded-md"
                                      onClick={() => setEditingRoomId(null)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div key={room.id} className="flex items-center justify-between p-1 px-2 rounded-lg border border-border bg-muted/10 text-xs">
                                <span className="font-semibold text-foreground">Room {room.roomNo}</span>
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-md"
                                    onClick={() => {
                                      setEditingRoomId(room.id);
                                      setEditingRoomNo(room.roomNo);
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive rounded-md"
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to delete Room ${room.roomNo}?`)) {
                                        handleDeleteRoom(room.id);
                                      }
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">No rooms created yet.</p>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={floor}
                  className="flex items-center justify-between p-3.5 border rounded-xl bg-card border-border/40 shadow-sm hover:border-primary/20 transition-all duration-300"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm sm:text-base text-foreground">{displayName}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary rounded-md"
                        onClick={() => {
                          setEditingFloor(floor);
                          setEditingName(displayName);
                        }}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stats.rooms} rooms • {stats.tenants} tenants
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">{roomRange}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {floor === maxFloor && stats.canDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteFlow({ floor, step: 1, typed: '', checked: false })}
                        disabled={deletingFloor === floor}
                        className="h-8 w-8 p-0 rounded-lg"
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
                className="w-full border-dashed mb-2 h-9 text-xs sm:text-sm rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Ground Floor (Floor 0)
              </Button>
            )}
 
            <Button
              variant="outline"
              onClick={handleAddFloor}
              disabled={isAddingFloor}
              className="w-full border-dashed h-9 text-xs sm:text-sm rounded-xl"
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

      {addRoomsFloor !== null && (
        <AddRoomsDialog
          open={addRoomsFloor !== null}
          onOpenChange={(o) => !o && setAddRoomsFloor(null)}
          floor={addRoomsFloor}
          existingRoomNos={rooms.filter(r => r.floor === addRoomsFloor).map(r => r.roomNo)}
        />
      )}

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
