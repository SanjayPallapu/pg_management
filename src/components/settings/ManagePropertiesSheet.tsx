import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Building, 
  Plus, 
  Minus,
  Check, 
  Settings, 
  Trash2, 
  Loader2, 
  MapPin, 
  ArrowRight, 
  Layers, 
  Zap, 
  Bed, 
  Home,
  Sparkles,
  Info,
  DollarSign,
  User,
  Users,
  Compass
} from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { usePG } from "@/contexts/PGContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { toast } from "sonner";

interface ManagePropertiesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RoomBlueprint {
  roomNo: string;
  floor: number;
  capacity: number;
  rentAmount: number;
  isAc: boolean;
}

export const ManagePropertiesSheet = ({ open, onOpenChange }: ManagePropertiesSheetProps) => {
  const { pgs, currentPG, selectPG, refreshPGs, isProUser, canCreatePG, subscription } = usePG();
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pgToDelete, setPgToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Wizard Steps state: 1 (Details), 2 (Structure & Pricing), 3 (Blueprint Preview), 4 (Defaults & Save)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  
  // General Details State (Step 1)
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [pgTypeInput, setPgTypeInput] = useState<"unisex" | "boys" | "girls">("unisex");
  
  // Structure & Pricing State (Step 2)
  const [floorsInput, setFloorsInput] = useState(3);
  // Custom rooms count per floor (keyed by floor number)
  const [roomsPerFloor, setRoomsPerFloor] = useState<Record<number, number>>({
    1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 4
  });
  
  // Custom Min and Max Sharing Capacity setup
  const [minSharingInput, setMinSharingInput] = useState(1);
  const [maxSharingInput, setMaxSharingInput] = useState(4);
  
  // Enabled sharing types in this PG
  const [enabledSharings, setEnabledSharings] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
    9: false,
    10: false,
  });

  // Price per sharing type (Rent per bed in ₹)
  const [sharingPrices, setSharingPrices] = useState<Record<number, number>>({
    1: 8000,
    2: 5000,
    3: 4000,
    4: 3000,
    5: 2500,
    6: 2000,
    7: 1800,
    8: 1500,
    9: 1200,
    10: 1000,
  });

  // Generated building blueprint (Step 3) - User can customize capacities and rents room-by-room
  const [blueprint, setBlueprint] = useState<RoomBlueprint[]>([]);

  // Defaults & Save (Step 4)
  const [electricityRateInput, setElectricityRateInput] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sharingTypesList = useMemo(() => {
    const list = [];
    for (let i = minSharingInput; i <= maxSharingInput; i++) {
      list.push(i);
    }
    return list;
  }, [minSharingInput, maxSharingInput]);

  const resetForm = () => {
    setNameInput("");
    setAddressInput("");
    setPgTypeInput("unisex");
    setFloorsInput(3);
    setRoomsPerFloor({ 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4, 9: 4, 10: 4 });
    setMinSharingInput(1);
    setMaxSharingInput(4);
    setEnabledSharings({ 
      1: true, 2: true, 3: false, 4: false, 5: false, 
      6: false, 7: false, 8: false, 9: false, 10: false 
    });
    setSharingPrices({ 
      1: 8000, 2: 5000, 3: 4000, 4: 3000, 5: 2500, 
      6: 2000, 7: 1800, 8: 1500, 9: 1200, 10: 1000 
    });
    setBlueprint([]);
    setElectricityRateInput(10);
    setWizardStep(1);
    setIsAdding(false);
    setIsEditing(null);
  };

  // Generate initial blueprint when moving from step 2 to step 3
  const handleGenerateBlueprint = () => {
    const list: RoomBlueprint[] = [];
    const baseSharing = sharingTypesList
      .map(Number)
      .find(k => enabledSharings[k]) || 2; // Fallback to first active sharing

    for (let f = 1; f <= floorsInput; f++) {
      const roomCount = roomsPerFloor[f] || 4;
      for (let r = 1; r <= roomCount; r++) {
        const roomNo = `${f}${r.toString().padStart(2, "0")}`;
        const price = sharingPrices[baseSharing] || 5000;
        list.push({
          roomNo,
          floor: f,
          capacity: baseSharing,
          rentAmount: price * baseSharing,
          isAc: false,
        });
      }
    }
    setBlueprint(list);
    setWizardStep(3);
  };

  const handleUpdateRoomCapacity = (roomNo: string, newCapacity: number) => {
    setBlueprint(prev => prev.map(room => {
      if (room.roomNo === roomNo) {
        const unitPrice = sharingPrices[newCapacity] || 4000;
        return {
          ...room,
          capacity: newCapacity,
          rentAmount: unitPrice * newCapacity
        };
      }
      return room;
    }));
  };

  const handleUpdateRoomRent = (roomNo: string, newRent: number) => {
    setBlueprint(prev => prev.map(room => {
      if (room.roomNo === roomNo) {
        return { ...room, rentAmount: newRent };
      }
      return room;
    }));
  };

  const handleUpdateRoomAC = (roomNo: string, isAc: boolean) => {
    setBlueprint(prev => prev.map(room => {
      if (room.roomNo === roomNo) {
        const premium = isAc ? 1000 * room.capacity : 0;
        const baseRate = sharingPrices[room.capacity] || 4000;
        return { 
          ...room, 
          isAc,
          rentAmount: (baseRate * room.capacity) + premium
        };
      }
      return room;
    }));
  };

  const handleAddProperty = async () => {
    if (!canCreatePG) {
      toast.error(`Your plan allows up to ${Math.min(4, subscription?.maxPgs ?? 1)} PG properties.`);
      return;
    }
    if (!nameInput.trim()) {
      toast.error("Please enter a property name");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: newPg, error: pgError } = await supabase
        .from("pgs")
        .insert({
          owner_id: user?.id,
          name: nameInput.trim(),
          address: addressInput.trim() || null,
          floors: floorsInput,
          electricity_unit_price: electricityRateInput,
        })
        .select()
        .single();

      if (pgError) throw pgError;

      const roomsToAdd = blueprint.map(room => ({
        pg_id: newPg.id,
        room_no: room.roomNo,
        floor: room.floor,
        capacity: room.capacity,
        rent_amount: room.rentAmount,
        status: "Vacant",
        is_ac: room.isAc,
      }));

      if (roomsToAdd.length > 0) {
        const { error: roomsError } = await supabase
          .from("rooms")
          .insert(roomsToAdd);
          
        if (roomsError) {
          console.error("Failed to auto-generate rooms:", roomsError);
          toast.warning("Property created, but room auto-generation encountered an issue.");
        } else {
          toast.success(`Property "${nameInput}" & ${roomsToAdd.length} customized rooms generated successfully!`);
        }
      }

      await refreshPGs();
      if (newPg) selectPG(newPg.id);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to add property:", err);
      toast.error(err.message || "Failed to add property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    if (!nameInput.trim()) {
      toast.error("Property name cannot be empty");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("pgs")
        .update({
          name: nameInput.trim(),
          address: addressInput.trim() || null,
          electricity_unit_price: electricityRateInput,
        })
        .eq("id", isEditing);

      if (error) throw error;

      toast.success("Property settings updated successfully");
      await refreshPGs();
      resetForm();
    } catch (err: any) {
      console.error("Failed to update property:", err);
      toast.error(err.message || "Failed to update property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProperty = async (pgId: string, pgName: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("pgs")
        .delete()
        .eq("id", pgId);

      if (error) throw error;

      toast.success(`Property "${pgName}" deleted successfully`);
      
      if (currentPG?.id === pgId) {
        const nextPg = pgs.find((p) => p.id !== pgId);
        if (nextPg) {
          selectPG(nextPg.id);
        }
      }
      
      await refreshPGs();
      resetForm();
    } catch (err: any) {
      console.error("Failed to delete property:", err);
      toast.error(err.message || "Failed to delete property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveProperty = async (pgId: string, pgName: string) => {
    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("pgs")
        .update({ is_archived: true })
        .eq("id", pgId);

      if (error) throw error;

      toast.success(`Property "${pgName}" archived successfully. Data is retained.`);
      
      if (currentPG?.id === pgId) {
        const nextPg = pgs.find((p) => p.id !== pgId && !(p as any).is_archived);
        if (nextPg) {
          selectPG(nextPg.id);
        }
      }
      
      await refreshPGs();
      resetForm();
    } catch (err: any) {
      console.error("Failed to archive property:", err);
      toast.error(err.message || "Failed to archive property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (pgId: string, currentName: string, currentAddress?: string, electricityPrice?: number) => {
    setIsEditing(pgId);
    setNameInput(currentName);
    setAddressInput(currentAddress || "");
    setElectricityRateInput(electricityPrice ?? 10);
    setIsAdding(false);
  };

  const blueprintByFloor = useMemo(() => {
    const grouped: Record<number, RoomBlueprint[]> = {};
    blueprint.forEach(room => {
      if (!grouped[room.floor]) grouped[room.floor] = [];
      grouped[room.floor].push(room);
    });
    return grouped;
  }, [blueprint]);

  return (
    <Sheet open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <SheetContent 
        side="right" 
        className="w-full max-w-full sm:max-w-xl p-0 [&>button]:hidden bg-background"
      >
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
          {/* Compact Premium Header */}
          <SheetHeader className="px-4 py-3 border-b bg-background shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (isAdding) {
                      if (wizardStep > 1) {
                        setWizardStep((prev) => (prev - 1) as any);
                      } else {
                        resetForm();
                      }
                    } else if (isEditing) {
                      resetForm();
                    } else {
                      onOpenChange(false);
                    }
                  }} 
                  className="h-7 w-7 rounded-lg shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-left">
                  <SheetTitle className="text-sm font-bold flex items-center gap-1.5 leading-none">
                    <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                    {isAdding 
                      ? `Add PG (${wizardStep}/4)` 
                      : isEditing 
                        ? "Edit PG Details" 
                        : "My Properties"
                    }
                  </SheetTitle>
                </div>
              </div>
              {!isAdding && !isEditing && (
                <Button 
                  onClick={() => {
                    if (!canCreatePG) {
                      toast.error(`PG limit reached. Your plan allows ${Math.min(4, subscription?.maxPgs ?? 1)} properties.`);
                      return;
                    }
                    setIsAdding(true);
                  }}
                  disabled={!canCreatePG}
                  size="sm" 
                  className="h-8 gap-1 rounded-lg text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Add PG
                </Button>
              )}
            </div>

            {/* Compact Step Progress Bar */}
            {isAdding && (
              <div className="w-full bg-muted h-1 rounded-full mt-2.5 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${(wizardStep / 4) * 100}%` }}
                />
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3 bg-background">
            {isAdding ? (
              <div className="space-y-3.5 text-left">
                
                {/* STEP 1: GENERAL PROFILE DETAILS */}
                {wizardStep === 1 && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="propertyName" className="text-xs font-semibold">PG Name</Label>
                      <Input 
                        id="propertyName"
                        placeholder="e.g. Royal Orchid Unisex PG"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        required
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="propertyAddress" className="text-xs font-semibold">Address / Area</Label>
                      <Input 
                        id="propertyAddress"
                        placeholder="e.g. Sector 2, HSR Layout"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>

                    {/* Highly visual gender type selection check-cards */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">PG Category</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div 
                          onClick={() => setPgTypeInput("unisex")}
                          className={`cursor-pointer border rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-[0.98] ${
                            pgTypeInput === "unisex" 
                              ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" 
                              : "border-border hover:bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <Compass className="h-4 w-4" />
                          <span className="text-[10px] font-bold">Co-Living</span>
                        </div>
                        <div 
                          onClick={() => setPgTypeInput("boys")}
                          className={`cursor-pointer border rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-[0.98] ${
                            pgTypeInput === "boys" 
                              ? "border-blue-500 bg-blue-500/5 text-blue-500 ring-1 ring-blue-500/20" 
                              : "border-border hover:bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <User className="h-4 w-4" />
                          <span className="text-[10px] font-bold">Boys Only</span>
                        </div>
                        <div 
                          onClick={() => setPgTypeInput("girls")}
                          className={`cursor-pointer border rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-[0.98] ${
                            pgTypeInput === "girls" 
                              ? "border-pink-500 bg-pink-500/5 text-pink-500 ring-1 ring-pink-500/20" 
                              : "border-border hover:bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <Users className="h-4 w-4" />
                          <span className="text-[10px] font-bold">Girls Only</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => {
                        if (!nameInput.trim()) {
                          toast.error("Please enter a PG name");
                          return;
                        }
                        setWizardStep(2);
                      }}
                      className="w-full rounded-xl h-9 mt-2 text-xs font-semibold gap-1"
                    >
                      Configure Structure
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* STEP 2: STRUCTURE & PRICES SETUP */}
                {wizardStep === 2 && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="floorsCount" className="text-xs font-semibold">Total Floors</Label>
                      <Input 
                        id="floorsCount"
                        type="number"
                        min={1}
                        max={10}
                        value={floorsInput}
                        onChange={(e) => setFloorsInput(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>

                    {/* Rooms per Floor Customization */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Rooms count on each floor</Label>
                      <div className="grid grid-cols-3 gap-1.5 border p-2 rounded-xl bg-muted/10 max-h-[110px] overflow-y-auto">
                        {Array.from({ length: floorsInput }, (_, idx) => idx + 1).map((floorNum) => (
                          <div key={floorNum} className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-semibold shrink-0">FL {floorNum}:</span>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={roomsPerFloor[floorNum] || 4}
                              onChange={(e) => setRoomsPerFloor(prev => ({
                                ...prev,
                                [floorNum]: Math.max(1, parseInt(e.target.value) || 1)
                              }))}
                              className="h-7 w-full py-0.5 px-1.5 text-xs text-center rounded-md"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Min & Max Sharing Range Setup */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="minSharing" className="text-xs font-semibold">Min Bed Sharing</Label>
                        <div className="flex h-9 items-center justify-between rounded-lg border bg-background px-1">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={minSharingInput <= 1} onClick={() => setMinSharingInput(value => Math.max(1, value - 1))}><Minus className="h-3.5 w-3.5" /></Button>
                          <strong className="text-xs">{minSharingInput}</strong>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={minSharingInput >= 10} onClick={() => setMinSharingInput(value => { const next = Math.min(10, value + 1); if (next > maxSharingInput) setMaxSharingInput(next); return next; })}><Plus className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="maxSharing" className="text-xs font-semibold">Max Bed Sharing</Label>
                        <div className="flex h-9 items-center justify-between rounded-lg border bg-background px-1">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={maxSharingInput <= minSharingInput} onClick={() => setMaxSharingInput(value => Math.max(minSharingInput, value - 1))}><Minus className="h-3.5 w-3.5" /></Button>
                          <strong className="text-xs">{maxSharingInput}</strong>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={maxSharingInput >= 10} onClick={() => setMaxSharingInput(value => Math.min(10, value + 1))}><Plus className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>

                    {/* Supported Sharing Options and Pricing */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Sharing Configurations</Label>
                      <div className="space-y-1.5">
                        {sharingTypesList.map((sharingType) => {
                          const isEnabled = enabledSharings[sharingType];
                          return (
                            <div key={sharingType} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-muted/5">
                              <div className="flex items-center gap-2">
                                <Checkbox 
                                  id={`sharing-${sharingType}`}
                                  checked={isEnabled}
                                  onCheckedChange={(checked) => setEnabledSharings(prev => ({
                                    ...prev,
                                    [sharingType]: checked === true
                                  }))}
                                />
                                <Label htmlFor={`sharing-${sharingType}`} className="text-xs font-medium cursor-pointer">
                                  {sharingType === 1 ? "1 Sharing (Private)" : `${sharingType} Sharing`}
                                </Label>
                              </div>
                              {isEnabled && (
                                <div className="flex items-center gap-1 w-28 shrink-0">
                                  <span className="text-xs text-muted-foreground">₹</span>
                                  <Input
                                    type="number"
                                    value={sharingPrices[sharingType] || 0}
                                    onChange={(e) => setSharingPrices(prev => ({
                                      ...prev,
                                      [sharingType]: Math.max(0, parseInt(e.target.value) || 0)
                                    }))}
                                    className="h-8 py-0.5 px-2 text-xs rounded-lg"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1 rounded-xl h-9 text-xs">
                        Back
                      </Button>
                      <Button 
                        onClick={handleGenerateBlueprint} 
                        className="flex-1 rounded-xl gap-1 h-9 text-xs"
                        disabled={!Object.values(enabledSharings).some(Boolean)}
                      >
                        Preview blueprint
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: BLUEPRINT & PREVIEW WORKFLOW */}
                {wizardStep === 3 && (
                  <div className="space-y-3">
                    <div className="bg-primary/5 border border-primary/10 p-2.5 rounded-xl text-left">
                      <h4 className="font-semibold text-xs text-primary flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-primary" /> Interactive Floor Plan
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Tweak capacities and rents directly on individual room cells.</p>
                    </div>

                    {/* Floors Map list */}
                    <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                      {Object.keys(blueprintByFloor).map(Number).sort((a,b)=>a-b).map((floorNum) => {
                        const floorRooms = blueprintByFloor[floorNum];
                        return (
                          <div key={floorNum} className="space-y-1.5 border border-border/60 p-2.5 rounded-xl bg-muted/5 text-left">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Floor {floorNum} Blueprint</span>
                            <div className="grid gap-2 grid-cols-2">
                              {floorRooms.map((room) => (
                                <div key={room.roomNo} className="p-2 rounded-lg border bg-background flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">Room {room.roomNo}</span>
                                    <div className="flex items-center gap-1">
                                      <Label htmlFor={`ac-${room.roomNo}`} className="text-[9px] text-muted-foreground">A/C</Label>
                                      <Checkbox 
                                        id={`ac-${room.roomNo}`}
                                        checked={room.isAc}
                                        onCheckedChange={(checked) => handleUpdateRoomAC(room.roomNo, checked === true)}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1">
                                    {/* Capacity Selector */}
                                    <div className="space-y-0.5">
                                      <span className="text-[8px] text-muted-foreground uppercase">Beds</span>
                                      <div className="flex h-7 items-center justify-between rounded border bg-background">
                                        <button type="button" className="h-full px-1.5 disabled:opacity-30" disabled={room.capacity <= minSharingInput} onClick={() => handleUpdateRoomCapacity(room.roomNo, Math.max(minSharingInput, room.capacity - 1))}><Minus className="h-3 w-3" /></button>
                                        <strong className="text-[10px]">{room.capacity}</strong>
                                        <button type="button" className="h-full px-1.5 disabled:opacity-30" disabled={room.capacity >= maxSharingInput} onClick={() => handleUpdateRoomCapacity(room.roomNo, Math.min(maxSharingInput, room.capacity + 1))}><Plus className="h-3 w-3" /></button>
                                      </div>
                                    </div>

                                    {/* Custom Rent Input */}
                                    <div className="space-y-0.5">
                                      <span className="text-[8px] text-muted-foreground uppercase">Rent</span>
                                      <Input 
                                        type="number"
                                        value={room.rentAmount}
                                        onChange={(e) => handleUpdateRoomRent(room.roomNo, Math.max(0, parseInt(e.target.value) || 0))}
                                        className="h-6 text-[10px] px-1 py-0 rounded"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1 rounded-xl h-9 text-xs">
                        Back
                      </Button>
                      <Button 
                        onClick={() => setWizardStep(4)} 
                        className="flex-1 rounded-xl gap-1 h-9 text-xs"
                      >
                        Next: Utilities
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4: UTILITIES & SAVE */}
                {wizardStep === 4 && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="electricityRateInput" className="text-xs font-semibold">Electricity Rate (₹ per unit)</Label>
                      <Input 
                        id="electricityRateInput"
                        type="number"
                        value={electricityRateInput}
                        onChange={(e) => setElectricityRateInput(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" onClick={() => setWizardStep(3)} className="flex-1 rounded-xl h-9 text-xs" disabled={isSubmitting}>
                        Back
                      </Button>
                      <Button 
                        onClick={handleAddProperty} 
                        className="flex-1 rounded-xl gap-1 h-9 text-xs"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin h-3.5 w-3.5" />
                            Creating PG...
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Create Property
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            ) : isEditing ? (
              <form onSubmit={handleEditProperty} className="space-y-3 text-left">
                <div className="space-y-1">
                  <Label htmlFor="editPropertyName" className="text-xs font-semibold">PG Name</Label>
                  <Input 
                    id="editPropertyName"
                    placeholder="e.g. Royal Orchid PG"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editPropertyAddress" className="text-xs font-semibold">Address / Area</Label>
                  <Input 
                    id="editPropertyAddress"
                    placeholder="e.g. Sector 4, HSR Layout"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    disabled={isSubmitting}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editElectricityRate" className="text-xs font-semibold">Electricity Unit Rate (₹ / Unit)</Label>
                  <Input 
                    id="editElectricityRate"
                    type="number"
                    value={electricityRateInput}
                    onChange={(e) => setElectricityRateInput(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={isSubmitting}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      className="flex-1 rounded-xl h-9 text-xs"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 rounded-xl h-9 text-xs"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" />
                          Saving...
                        </>
                      ) : (
                        "Save Details"
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (isEditing) {
                        setPgToDelete({ id: isEditing, name: nameInput });
                        setDeleteConfirmOpen(true);
                      }
                    }}
                    className="w-full rounded-xl gap-1.5 h-9 text-xs font-medium"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete PG Property
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                {pgs.map((pg) => {
                  const isActive = currentPG?.id === pg.id;
                  return (
                    <Card 
                      key={pg.id} 
                      className={`transition-all border cursor-pointer hover:shadow-sm ${
                        isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                      }`}
                      onClick={() => {
                        if (!isActive) {
                          selectPG(pg.id);
                          toast.success(`Switched to property: ${pg.name}`);
                          onOpenChange(false); // Close immediately for smooth workflow
                        }
                      }}
                    >
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            <Building className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="font-bold text-xs truncate flex items-center gap-1.5">
                              {pg.name}
                              {isActive && (
                                <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                  Active
                                </span>
                              )}
                            </p>
                            {pg.address && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                {pg.address}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(pg.id, pg.name, pg.address, pg.electricityUnitPrice)}
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Manage Property Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-left space-y-2">
              <p>
                How would you like to handle the removal of <span className="font-bold text-foreground">"{pgToDelete?.name}"</span>?
              </p>
              <p className="border-l-2 border-emerald-500 pl-2 bg-emerald-500/5 py-1 text-[11px]">
                <strong>Option A: Archive (Recommended to Retain Data)</strong><br />
                This will hide the property from all dashboard menus but safely preserve all rooms, tenant histories, and payment logs in the database.
              </p>
              <p className="border-l-2 border-rose-500 pl-2 bg-rose-500/5 py-1 text-[11px]">
                <strong>Option B: Delete Permanently (Destroy Data)</strong><br />
                This will permanently wipe this property along with all its rooms, tenants, payments, and utilities logs. This action is irreversible.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-1.5 mt-3 w-full">
            <AlertDialogCancel className="rounded-xl h-10 text-xs sm:flex-1">Cancel</AlertDialogCancel>
            
            <Button
              variant="outline"
              onClick={() => {
                if (pgToDelete) {
                  handleArchiveProperty(pgToDelete.id, pgToDelete.name);
                  setDeleteConfirmOpen(false);
                }
              }}
              className="rounded-xl h-10 text-xs sm:flex-1 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold"
            >
              Archive & Retain
            </Button>

            <AlertDialogAction
              onClick={() => {
                if (pgToDelete) {
                  handleDeleteProperty(pgToDelete.id, pgToDelete.name);
                }
              }}
              className="rounded-xl h-10 text-xs sm:flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold"
            >
              Wipe & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};
