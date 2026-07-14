import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Home 
} from "lucide-react";
import { usePG } from "@/contexts/PGContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { toast } from "sonner";

interface ManagePropertiesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManagePropertiesSheet = ({ open, onOpenChange }: ManagePropertiesSheetProps) => {
  const { pgs, currentPG, selectPG, refreshPGs, isProUser } = usePG();
  const { user } = useAuth();
  
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Wizard Steps state: 1 (General), 2 (Structure), 3 (Financials)
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  
  // General Details State
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [pgTypeInput, setPgTypeInput] = useState<"unisex" | "boys" | "girls">("unisex");
  
  // Structure Config State
  const [floorsInput, setFloorsInput] = useState(3);
  const [roomsPerFloorInput, setRoomsPerFloorInput] = useState(5);
  const [sharingInput, setSharingInput] = useState(2); // 2-sharing default
  
  // Financial Defaults State
  const [electricityRateInput, setElectricityRateInput] = useState(10);
  const [rentPerBedInput, setRentPerBedInput] = useState(6000);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setNameInput("");
    setAddressInput("");
    setPgTypeInput("unisex");
    setFloorsInput(3);
    setRoomsPerFloorInput(5);
    setSharingInput(2);
    setElectricityRateInput(10);
    setRentPerBedInput(6000);
    setWizardStep(1);
    setIsAdding(false);
    setIsEditing(null);
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      toast.error("Please enter a property name");
      return;
    }

    if (!isProUser && pgs.length >= 1) {
      toast.error("Free plan is limited to 1 property. Upgrade to Pro for multi-PG management!");
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

      // 2. Automatically generate the building rooms configuration in bulk
      const roomsToAdd = [];
      for (let floor = 1; floor <= floorsInput; floor++) {
        for (let r = 1; r <= roomsPerFloorInput; r++) {
          const roomNo = `${floor}${r.toString().padStart(2, "0")}`;
          roomsToAdd.push({
            pg_id: newPg.id,
            room_no: roomNo,
            floor: floor,
            capacity: sharingInput,
            rent_amount: rentPerBedInput * sharingInput,
            status: "Vacant",
            is_ac: false
          });
        }
      }

      if (roomsToAdd.length > 0) {
        const { error: roomsError } = await supabase
          .from("rooms")
          .insert(roomsToAdd);
          
        if (roomsError) {
          console.error("Failed to auto-generate rooms in DB:", roomsError);
          toast.warning("Property created, but room auto-generation encountered an issue.");
        } else {
          toast.success(`Property "${nameInput}" & ${roomsToAdd.length} rooms created successfully!`);
        }
      } else {
        toast.success(`Property "${nameInput}" added successfully`);
      }

      await refreshPGs();
      
      // Auto-select the newly created property
      if (newPg) {
        selectPG(newPg.id);
      }
      
      resetForm();
      onOpenChange(false); // Close sheet
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
    setWizardStep(1);
  };

  return (
    <Sheet open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <SheetContent 
        side="right" 
        className="w-full max-w-full sm:max-w-xl p-0 [&>button]:hidden bg-background"
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
                    ? `Add PG (Step ${wizardStep} of 3)` 
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

            {/* Step Indicators */}
            {isAdding && (
              <div className="flex items-center justify-between px-2 pt-2 pb-1">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2 flex-1">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      wizardStep === step
                        ? "bg-primary text-primary-foreground scale-110 shadow-sm"
                        : wizardStep > step
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {step}
                    </div>
                    <span className={`text-[10px] font-medium hidden xs:inline ${
                      wizardStep === step ? "text-foreground font-semibold" : "text-muted-foreground"
                    }`}>
                      {step === 1 ? "Profile" : step === 2 ? "Structure" : "Financials"}
                    </span>
                    {step < 3 && <div className="h-0.5 flex-1 bg-border mx-2" />}
                  </div>
                ))}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 bg-background">
            {isAdding ? (
              <div className="space-y-4">
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/30 p-3 flex gap-3 items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Home className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-xs text-foreground">General Details</h4>
                        <p className="text-[10px] text-muted-foreground">Name and geographic location details of your new PG.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="propertyName">Property / Building Name</Label>
                      <Input 
                        id="propertyName"
                        placeholder="e.g. Royal Orchid PG"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="propertyAddress">Address</Label>
                      <Input 
                        id="propertyAddress"
                        placeholder="e.g. 5th Cross, Sector 4, HSR Layout"
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pgType">Category (PG Type)</Label>
                      <Select 
                        value={pgTypeInput} 
                        onValueChange={(val: any) => setPgTypeInput(val)}
                      >
                        <SelectTrigger id="pgType" className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unisex">Co-Living / Unisex</SelectItem>
                          <SelectItem value="boys">Boys PG Only</SelectItem>
                          <SelectItem value="girls">Girls PG Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2">
                      <Button 
                        onClick={() => {
                          if (!nameInput.trim()) {
                            toast.error("Please enter a property name");
                            return;
                          }
                          setWizardStep(2);
                        }} 
                        className="w-full rounded-xl gap-2 h-10"
                      >
                        Next Step
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/30 p-3 flex gap-3 items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-xs text-foreground">Structure & Room Builder</h4>
                        <p className="text-[10px] text-muted-foreground">Define your building's size. We'll generate rooms automatically.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="floors">Number of Floors</Label>
                        <Input 
                          id="floors"
                          type="number"
                          min={1}
                          max={10}
                          value={floorsInput}
                          onChange={(e) => setFloorsInput(Math.max(1, parseInt(e.target.value) || 1))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="roomsPerFloor">Rooms per Floor</Label>
                        <Input 
                          id="roomsPerFloor"
                          type="number"
                          min={1}
                          max={20}
                          value={roomsPerFloorInput}
                          onChange={(e) => setRoomsPerFloorInput(Math.max(1, parseInt(e.target.value) || 1))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sharing">Default Sharing Capacity (Beds per Room)</Label>
                      <Select 
                        value={String(sharingInput)} 
                        onValueChange={(val) => setSharingInput(parseInt(val))}
                      >
                        <SelectTrigger id="sharing" className="w-full">
                          <SelectValue placeholder="Select sharing capacity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Sharing (Private Room)</SelectItem>
                          <SelectItem value="2">2 Sharing</SelectItem>
                          <SelectItem value="3">3 Sharing</SelectItem>
                          <SelectItem value="4">4 Sharing</SelectItem>
                          <SelectItem value="5">5 Sharing</SelectItem>
                          <SelectItem value="6">6 Sharing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Bed className="h-4 w-4 text-primary" />
                        Automatic Generation Summary:
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                        We will auto-create <strong className="text-foreground">{floorsInput * roomsPerFloorInput} rooms</strong> (e.g. {Array.from({ length: Math.min(3, roomsPerFloorInput) }, (_, idx) => `10${idx + 1}`).join(", ")}...) each with <strong className="text-foreground">{sharingInput} beds</strong>, saving you manual data entry!
                      </p>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setWizardStep(1)} 
                        className="flex-1 rounded-xl h-10"
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={() => setWizardStep(3)} 
                        className="flex-1 rounded-xl gap-2 h-10"
                      >
                        Next Step
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/30 p-3 flex gap-3 items-center">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-xs text-foreground">Defaults & Financials</h4>
                        <p className="text-[10px] text-muted-foreground">Setup base billing presets for rent and electricity meters.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rentPerBed">Default Rent per Bed (₹ / Month)</Label>
                      <Input 
                        id="rentPerBed"
                        type="number"
                        placeholder="e.g. 6000"
                        value={rentPerBedInput}
                        onChange={(e) => setRentPerBedInput(Math.max(0, parseInt(e.target.value) || 0))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="electricityRate">Electricity Unit Rate (₹ / Unit)</Label>
                      <Input 
                        id="electricityRate"
                        type="number"
                        placeholder="e.g. 10"
                        value={electricityRateInput}
                        onChange={(e) => setElectricityRateInput(Math.max(0, parseInt(e.target.value) || 0))}
                        required
                      />
                    </div>

                    <div className="pt-2 flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => setWizardStep(2)} 
                        className="flex-1 rounded-xl h-10"
                        disabled={isSubmitting}
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={handleAddProperty} 
                        className="flex-1 rounded-xl gap-2 h-10"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4" />
                            Creating PG...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            Finish Setup
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : isEditing ? (
              <form onSubmit={handleEditProperty} className="space-y-4">
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
