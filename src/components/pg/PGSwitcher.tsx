import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building, ChevronDown, Plus, Check, Crown } from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PGSetupWizard } from './PGSetupWizard';
import { Badge } from '@/components/ui/badge';

export const PGSwitcher = () => {
  const { pgs, currentPG, selectPG, canCreatePG, isProUser } = usePG();
  const [showAddDialog, setShowAddDialog] = useState(false);

  if (pgs.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 max-w-[200px]">
            {currentPG?.logoUrl ? (
              <img 
                src={currentPG.logoUrl} 
                alt={currentPG.name} 
                className="h-5 w-5 rounded object-cover"
              />
            ) : (
              <Building className="h-4 w-4" />
            )}
            <span className="truncate">{currentPG?.name || 'Select PG'}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            Your PGs
            {isProUser && (
              <Badge variant="secondary" className="text-xs">
                <Crown className="h-3 w-3 mr-1" /> Pro
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {pgs.map((pg) => (
            <DropdownMenuItem
              key={pg.id}
              onClick={() => selectPG(pg.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2 w-full">
                {pg.logoUrl ? (
                  <img 
                    src={pg.logoUrl} 
                    alt={pg.name} 
                    className="h-6 w-6 rounded object-cover"
                  />
                ) : (
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                    <Building className="h-3 w-3 text-primary" />
                  </div>
                )}
                <span className="truncate flex-1">{pg.name}</span>
                {currentPG?.id === pg.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowAddDialog(true)}
            disabled={!canCreatePG}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New PG
            {!canCreatePG && (
              <Badge variant="outline" className="ml-auto text-xs">
                <Crown className="h-3 w-3 mr-1" /> Pro
              </Badge>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <PGSetupWizard 
            isAddingNew 
            onComplete={() => setShowAddDialog(false)} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
