import { useState } from 'react';
import { usePropertyContext, Property } from '@/contexts/PropertyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export const PropertySwitcher = () => {
  const { properties, selectedProperty, setSelectedProperty, refetch } = usePropertyContext();
  const { isAdmin } = useAuth();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyAddress, setNewPropertyAddress] = useState('');

  const handleAddProperty = async () => {
    if (!newPropertyName.trim()) return;

    const { error } = await supabase
      .from('properties')
      .insert({ name: newPropertyName.trim(), address: newPropertyAddress.trim() || null });

    if (error) {
      toast.error('Failed to add property');
      return;
    }

    toast.success(`Property "${newPropertyName}" added`);
    setNewPropertyName('');
    setNewPropertyAddress('');
    setAddDialogOpen(false);
    refetch();
  };

  const handleEditProperty = async () => {
    if (!editingProperty || !newPropertyName.trim()) return;

    const { error } = await supabase
      .from('properties')
      .update({ name: newPropertyName.trim(), address: newPropertyAddress.trim() || null })
      .eq('id', editingProperty.id);

    if (error) {
      toast.error('Failed to update property');
      return;
    }

    toast.success('Property updated');
    setEditDialogOpen(false);
    setEditingProperty(null);
    refetch();
  };

  const handleDeleteProperty = async (property: Property) => {
    if (properties.length <= 1) {
      toast.error('Cannot delete the only property');
      return;
    }

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', property.id);

    if (error) {
      if (error.message.includes('violates foreign key constraint')) {
        toast.error('Cannot delete property with rooms. Move or delete rooms first.');
      } else {
        toast.error('Failed to delete property');
      }
      return;
    }

    toast.success(`Property "${property.name}" deleted`);
    refetch();
  };

  const openEditDialog = (property: Property) => {
    setEditingProperty(property);
    setNewPropertyName(property.name);
    setNewPropertyAddress(property.address || '');
    setEditDialogOpen(true);
  };

  if (!selectedProperty) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 max-w-[200px]">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{selectedProperty.name}</span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {properties.map((property) => (
            <DropdownMenuItem
              key={property.id}
              className="flex items-center justify-between"
              onClick={() => setSelectedProperty(property)}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{property.name}</div>
                {property.address && (
                  <div className="text-xs text-muted-foreground truncate">{property.address}</div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(property);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProperty(property);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </DropdownMenuItem>
          ))}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add New Property
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add Property Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Property</DialogTitle>
            <DialogDescription>
              Add a new hostel or PG to manage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Property Name *</Label>
              <Input
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                placeholder="e.g., City Center PG"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={newPropertyAddress}
                onChange={(e) => setNewPropertyAddress(e.target.value)}
                placeholder="e.g., 123 Main Street"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProperty} disabled={!newPropertyName.trim()}>
              Add Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Property Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update property details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Property Name *</Label>
              <Input
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                placeholder="e.g., City Center PG"
                className="mt-2"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={newPropertyAddress}
                onChange={(e) => setNewPropertyAddress(e.target.value)}
                placeholder="e.g., 123 Main Street"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProperty} disabled={!newPropertyName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
