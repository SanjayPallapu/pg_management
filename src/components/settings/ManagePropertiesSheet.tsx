import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Building, 
  Plus, 
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
  DollarSign
} from "lucide-react";
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
  const { pgs, currentPG, selectPG, refreshPGs, isProUser } = usePG();
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
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
    1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5, 10: 5
  });
  
  // Enabled sharing types in this PG
  const [enabledSharings, setEnabledSharings] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
  });

  // Price per sharing type (Rent per bed in ₹)
  const [sharingPrices, setSharingPrices] = useState<Record<number, number>>({
    1: 10000,
    2: 7000,
    3: 5500,
    4: 4500,
  });

  // Generated building blueprint (Step 3) - User can customize capacities and rents room-by-room
  const [blueprint, setBlueprint] = useState<RoomBlueprint[]>([]);

  // Defaults & Save (Step 4)
  const [electricityRateInput, setElectricityRateInput] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setNameInput("");
    setAddressInput("");
    setPgTypeInput("unisex");
    setFloorsInput(3);
    setRoomsPerFloor({ 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5, 10: 5 });
    setEnabledSharings({ 1: true, 2: true, 3: false, 4: false });
    setSharingPrices({ 1: 10000, 2: 7000, 3: 5500, 4: 4500 });
    setBlueprint([]);
    setElectricityRateInput(10);
    setWizardStep(1);
    setIsAdding(false);
    setIsEditing(null);
  };

  // Generate initial blueprint when moving from step 2 to step 3
  const handleGenerateBlueprint = () => {
    const list: RoomBlueprint[] = [];
    const baseSharing = Object.keys(enabledSharings)
      .map(Number)
      .find(k => enabledSharings[k]) || 2; // Fallback to first active sharing

    for (let f = 1; f <= floorsInput; f++) {
      const roomCount = roomsPerFloor[f] || 5;
      for (let r = 1; r <= roomCount; r++) {
        const roomNo = `${f}${r.toString().padStart(2, "0")}`;
        const price = sharingPrices[baseSharing] || 6000;
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

  // Toggle/Update a room capacity in blueprint (updates capacity and calculates rent dynamically)
  const handleUpdateRoomCapacity = (roomNo: string, newCapacity: number) => {
    setBlueprint(prev => prev.map(room => {
      if (room.roomNo === roomNo) {
        const unitPrice = sharingPrices[newCapacity] || 5000;
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
        // Optional premium surcharge for A/C rooms (e.g. +1000 per bed)
        const premium = isAc ? 1000 * room.capacity : 0;
        const baseRate = sharingPrices[room.capacity] || 5000;
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
    if (!nameInput.trim()) {
      toast.error("Please enter a property name");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create the new PG record
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

      // 2. Insert rooms from blueprint in bulk
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
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${pgName}"? All rooms, tenants, and logs for this property will be permanently deleted.`
    );
    if (!confirmDelete) return;

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

  const startEdit = (pgId: string, currentName: string, currentAddress?: string, electricityPrice?: number) => {
    setIsEditing(pgId);
    setNameInput(currentName);
    setAddressInput(currentAddress || "");
    setElectricityRateInput(electricityPrice ?? 10);
    setIsAdding(false);
  };

  // Group blueprint rooms by floor for Step 3 rendering
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
        className="w-full max-w-full sm:max-w-2xl p-0 [&>button]:hidden bg-background"
      >
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
          <SheetHeader className="px-4 pt-4 pb-2 border-b bg-background shrink-0">
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
                className="h-8 w-8 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Building className="h-4 w-4 text-primary shrink-0" />
                <SheetTitle className="text-base font-bold text-left truncate">
                  {isAdding 
                    ? `Add PG (Step ${wizardStep} of 4)` 
                    : isEditing 
                      ? "Edit Property Settings" 
                      : "Manage Properties"
                  }
                </SheetTitle>
              </div>
              {!isAdding && !isEditing && (
                <Button 
                  onClick={() => setIsAdding(true)} 
                  size="sm" 
                  className="h-8 gap-1 rounded-lg text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add PG
                </Button>
              )}
            </div>

            {/* Steps Visual Tracker */}
            {isAdding && (
              <div className="flex items-center justify-between px-2 pt-2 pb-1 border-t">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center gap-1.5 flex-1">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      wizardStep === step
                        ? "bg-primary text-primary-foreground scale-110 shadow-sm"
                        : wizardStep > step
                          ? "bg-primary/20 text-primary animate-pulse"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {step}
                    </div>
                    <span className={`text-[10px] font-semibold hidden sm:inline ${
                      wizardStep === step ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step === 1 ? "Details" : step === 2 ? "Pricing" : step === 3 ? "Blueprint" : "Save"}
                    </span>
                    {step < 4 && <div className="h-0.5 flex-1 bg-border mx-1" />}
                  </div>
                ))}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
            {isAdding ? (
              <div className="space-y-4 text-left">
                
                {/* STEP 1: GENERAL PROFILE DETAILS */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/20 p-3 flex gap-3 items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Home className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">PG Profile</h4>
                        <p className="text-[10px] text-muted-foreground">Setup base name, address and co-living category.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="propertyName">PG / Building Name</Label>
                      <Input 
                        id="propertyName"
                        placeholder="e.g. Serene Residency HSR"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="propertyAddress">Address</Label>
                      <Input 
                        id="propertyAddress"
                        placeholder="e.g. #42, Sector 1, HSR Layout"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pgCategory">PG Category</Label>
                      <Select value={pgTypeInput} onValueChange={(val: any) => setPgTypeInput(val)}>
                        <SelectTrigger id="pgCategory">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unisex">Unisex / Co-living</SelectItem>
                          <SelectItem value="boys">Boys Hostel Only</SelectItem>
                          <SelectItem value="girls">Girls Hostel Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={() => {
                        if (!nameInput.trim()) {
                          toast.error("Please enter a PG name");
                          return;
                        }
                        setWizardStep(2);
                      }}
                      className="w-full rounded-xl h-10 mt-2 gap-2"
                    >
                      Next: Configuration
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* STEP 2: STRUCTURE & PRICES SETUP */}
                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/20 p-3 flex gap-3 items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">Custom Structure & Rent Pricing</h4>
                        <p className="text-[10px] text-muted-foreground">Specify custom rooms per floor and rent per sharing capacity.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="floorsCount">Number of Floors</Label>
                      <Input 
                        id="floorsCount"
                        type="number"
                        min={1}
                        max={10}
                        value={floorsInput}
                        onChange={(e) => setFloorsInput(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                      />
                    </div>

                    {/* Rooms per Floor Customization */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Rooms count on each floor</Label>
                      <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 border p-3 rounded-xl bg-muted/10 max-h-[140px] overflow-y-auto">
                        {Array.from({ length: floorsInput }, (_, idx) => idx + 1).map((floorNum) => (
                          <div key={floorNum} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium shrink-0 w-8">FL {floorNum}:</span>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={roomsPerFloor[floorNum] || 5}
                              onChange={(e) => setRoomsPerFloor(prev => ({
                                ...prev,
                                [floorNum]: Math.max(1, parseInt(e.target.value) || 1)
                              }))}
                              className="h-8 py-1 px-2 text-xs text-center"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Enabled Sharing Options and Pricing */}
                    <div className="space-y-2.5">
                      <Label className="text-xs font-semibold">Supported Sharing Prices (Rent/Bed)</Label>
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((sharingType) => {
                          const isEnabled = enabledSharings[sharingType];
                          return (
                            <div key={sharingType} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/10">
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
                                  {sharingType === 1 ? "Single / Private" : `${sharingType} Sharing`}
                                </Label>
                              </div>
                              {isEnabled && (
                                <div className="flex items-center gap-1.5 w-32 shrink-0">
                                  <span className="text-xs text-muted-foreground">₹</span>
                                  <Input
                                    type="number"
                                    value={sharingPrices[sharingType]}
                                    onChange={(e) => setSharingPrices(prev => ({
                                      ...prev,
                                      [sharingType]: Math.max(0, parseInt(e.target.value) || 0)
                                    }))}
                                    className="h-8 py-0.5 px-2 text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1 rounded-xl">
                        Back
                      </Button>
                      <Button 
                        onClick={handleGenerateBlueprint} 
                        className="flex-1 rounded-xl gap-2"
                        disabled={!Object.values(enabledSharings).some(Boolean)}
                      >
                        Preview Blueprint
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: BLUEPRINT & PREVIEW WORKFLOW */}
                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/20 p-3 flex gap-3 items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">Room Blueprint Editor & Preview</h4>
                        <p className="text-[10px] text-muted-foreground">Tweak individual rooms, capacities, rent prices, and AC status.</p>
                      </div>
                    </div>

                    {/* Floors Map list */}
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {Object.keys(blueprintByFloor).map(Number).sort((a,b)=>a-b).map((floorNum) => {
                        const floorRooms = blueprintByFloor[floorNum];
                        return (
                          <div key={floorNum} className="space-y-1.5 border p-3 rounded-xl bg-muted/5 text-left">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Floor {floorNum} Blueprint</span>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {floorRooms.map((room) => (
                                <div key={room.roomNo} className="p-2.5 rounded-lg border bg-background flex flex-col gap-2">
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

                                  <div className="grid grid-cols-2 gap-1.5">
                                    {/* Capacity Selector */}
                                    <div className="space-y-1">
                                      <span className="text-[9px] text-muted-foreground">Sharing</span>
                                      <select 
                                        value={room.capacity}
                                        onChange={(e) => handleUpdateRoomCapacity(room.roomNo, parseInt(e.target.value))}
                                        className="w-full text-[10px] h-7 border rounded bg-transparent p-0.5"
                                      >
                                        {Object.keys(enabledSharings)
                                          .map(Number)
                                          .filter(k => enabledSharings[k])
                                          .map(sharingType => (
                                            <option key={sharingType} value={sharingType}>
                                              {sharingType} Sharing
                                            </option>
                                          ))
                                        }
                                      </select>
                                    </div>

                                    {/* Custom Rent Input */}
                                    <div className="space-y-1">
                                      <span className="text-[9px] text-muted-foreground">Rent (₹/Room)</span>
                                      <Input 
                                        type="number"
                                        value={room.rentAmount}
                                        onChange={(e) => handleUpdateRoomRent(room.roomNo, Math.max(0, parseInt(e.target.value) || 0))}
                                        className="h-7 text-[10px] px-1 py-0.5"
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
                      <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1 rounded-xl">
                        Back
                      </Button>
                      <Button 
                        onClick={() => setWizardStep(4)} 
                        className="flex-1 rounded-xl gap-2"
                      >
                        Next: Utilities
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4: UTILITIES & SAVE */}
                {wizardStep === 4 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/20 p-3 flex gap-3 items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-xs text-foreground">Electricity Billing Settings</h4>
                        <p className="text-[10px] text-muted-foreground">Define base power charge per unit to finalize setup.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="electricityRateInput">Electricity Rate (₹ per unit)</Label>
                      <Input 
                        id="electricityRateInput"
                        type="number"
                        value={electricityRateInput}
                        onChange={(e) => setElectricityRateInput(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button variant="outline" onClick={() => setWizardStep(3)} className="flex-1 rounded-xl" disabled={isSubmitting}>
                        Back
                      </Button>
                      <Button 
                        onClick={handleAddProperty} 
                        className="flex-1 rounded-xl gap-2"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4" />
                            Finalizing Setup...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Create Property
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            ) : isEditing ? (
              <form onSubmit={handleEditProperty} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="editPropertyName">Property / Building Name</Label>
                  <Input 
                    id="editPropertyName"
                    placeholder="e.g. Royal Orchid PG"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPropertyAddress">Address</Label>
                  <Input 
                    id="editPropertyAddress"
                    placeholder="e.g. 5th Cross, Sector 4, HSR Layout"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editElectricityRate">Electricity Unit Rate (₹ / Unit)</Label>
                  <Input 
                    id="editElectricityRate"
                    type="number"
                    value={electricityRateInput}
                    onChange={(e) => setElectricityRateInput(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={resetForm}
                      className="flex-1 rounded-xl"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 rounded-xl"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Property"
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDeleteProperty(isEditing, nameInput)}
                    className="w-full rounded-xl gap-2 mt-1"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Property
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
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
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            <Building className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                              {pg.name}
                              {isActive && (
                                <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                  Active
                                </span>
                              )}
                            </p>
                            {pg.address && (
                              <p className="text-xs text-muted-foreground mt-1 truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {pg.address}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => startEdit(pg.id, pg.name, pg.address, pg.electricityUnitPrice)}
                          >
                            <Settings className="h-4 w-4" />
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
    </Sheet>
  );
};
