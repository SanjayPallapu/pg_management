import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Building, Plus, Check, Settings, Trash2, Loader2, MapPin } from "lucide-react";
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
  
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const { data, error } = await supabase
        .from("pgs")
        .insert({
          owner_id: user?.id,
          name: nameInput.trim(),
          address: addressInput.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Property "${nameInput}" added successfully`);
      await refreshPGs();
      
      // Auto-select the newly created property
      if (data) {
        selectPG(data.id);
      }
      
      setNameInput("");
      setAddressInput("");
      setIsAdding(false);
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
        })
        .eq("id", isEditing);

      if (error) throw error;

      toast.success("Property updated successfully");
      await refreshPGs();
      setIsEditing(null);
      setNameInput("");
      setAddressInput("");
    } catch (err: any) {
      console.error("Failed to update property:", err);
      toast.error(err.message || "Failed to update property");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (pgId: string, currentName: string, currentAddress?: string) => {
    setIsEditing(pgId);
    setNameInput(currentName);
    setAddressInput(currentAddress || "");
    setIsAdding(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
                  if (isAdding || isEditing) {
                    setIsAdding(false);
                    setIsEditing(null);
                    setNameInput("");
                    setAddressInput("");
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
                  {isAdding ? "Add New Property" : isEditing ? "Edit Property Settings" : "Manage Properties"}
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
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background">
            {isAdding || isEditing ? (
              <form onSubmit={isAdding ? handleAddProperty : handleEditProperty} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property / Building Name</Label>
                  <Input 
                    id="propertyName"
                    placeholder="e.g. Royal Orchid PG"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress">Address</Label>
                  <Input 
                    id="propertyAddress"
                    placeholder="e.g. 5th Cross, Sector 4, HSR Layout"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="pt-2 flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditing(null);
                      setNameInput("");
                      setAddressInput("");
                    }}
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
                            onClick={() => startEdit(pg.id, pg.name, pg.address)}
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
