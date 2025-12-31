import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Lock, Unlock } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import { toast } from '@/hooks/use-toast';

interface TenantLockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    isLocked?: boolean;
  } | null;
}

export const TenantLockDialog = ({ open, onOpenChange, tenant }: TenantLockDialogProps) => {
  const { updateTenant } = useRooms();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (tenant) {
      setIsLocked(tenant.isLocked || false);
    }
  }, [tenant]);

  const handleToggle = (checked: boolean) => {
    if (!tenant) return;
    setIsLocked(checked);
    updateTenant.mutate(
      { tenantId: tenant.id, updates: { isLocked: checked } },
      {
        onSuccess: () => {
          toast({
            title: checked ? 'Tenant locked' : 'Tenant unlocked',
            description: checked 
              ? `${tenant.name}'s rent will not be added to totals` 
              : `${tenant.name}'s rent will be included in totals`,
          });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLocked ? <Lock className="h-5 w-5 text-destructive" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
            Lock Tenant
          </DialogTitle>
          <DialogDescription>
            {tenant?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between py-4">
          <div className="space-y-1">
            <Label htmlFor="lock-toggle" className="text-sm font-medium">
              {isLocked ? 'Locked' : 'Unlocked'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isLocked 
                ? 'Rent excluded from totals' 
                : 'Rent included in totals'}
            </p>
          </div>
          <Switch
            id="lock-toggle"
            checked={isLocked}
            onCheckedChange={handleToggle}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
