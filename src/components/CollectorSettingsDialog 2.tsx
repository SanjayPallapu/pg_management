import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { useCollectorNames } from '@/hooks/useCollectorNames';
import { toast } from '@/hooks/use-toast';

interface CollectorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CollectorSettingsDialog = ({ open, onOpenChange }: CollectorSettingsDialogProps) => {
  const { collectors, addCollector, updateCollector, removeCollector, resetToDefaults } = useCollectorNames();
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (collectors.some(c => c.displayName.toLowerCase() === name.toLowerCase())) {
      toast({ title: 'Name already exists', variant: 'destructive' });
      return;
    }
    addCollector(name);
    setNewName('');
    toast({ title: `Added "${name}"` });
  };

  const handleReset = () => {
    resetToDefaults();
    toast({ title: 'Reset to defaults' });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Collector Names</AlertDialogTitle>
          <AlertDialogDescription>
            Manage who collects rent payments. These names appear in payment dialogs and reports.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {collectors.map((collector, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={collector.displayName}
                onChange={(e) => updateCollector(index, e.target.value)}
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => {
                  removeCollector(index);
                  toast({ title: `Removed "${collector.displayName}"` });
                }}
                disabled={collectors.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add new collector..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleAdd}
              disabled={!newName.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AlertDialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-muted-foreground">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
          <AlertDialogCancel>Done</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
