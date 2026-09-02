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
import { Check, Crown, ImageIcon } from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { Badge } from '@/components/ui/badge';
import { LogoUpdateDialog } from './LogoUpdateDialog';
import pgHubLogo from '@/assets/pg-hub/pg-hub-logo.png';

export const PGSwitcher = () => {
  const { pgs, currentPG, selectPG, isProUser } = usePG();
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [selectedPGForLogo, setSelectedPGForLogo] = useState<string | null>(null);

  if (pgs.length === 0) {
    return null;
  }

  const handleUpdateLogo = (pgId: string) => {
    setSelectedPGForLogo(pgId);
    setShowLogoDialog(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-11 w-11 sm:h-10 sm:w-10 p-0.5 shrink-0 overflow-hidden">
            <img 
              src={currentPG?.logoUrl || pgHubLogo} 
              alt={currentPG?.name || 'PG Hub'} 
              className="h-full w-full rounded object-contain bg-black"
            />
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
            <div key={pg.id}>
              <DropdownMenuItem
                onClick={() => selectPG(pg.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <img 
                    src={pg.logoUrl || pgHubLogo} 
                    alt={pg.name} 
                    className="h-6 w-6 rounded object-contain bg-black shrink-0"
                  />
                  <span className="truncate flex-1">{pg.name}</span>
                  {currentPG?.id === pg.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateLogo(pg.id)}
                className="cursor-pointer pl-8 text-xs text-muted-foreground"
              >
                <ImageIcon className="h-3 w-3 mr-2" />
                Update Logo
              </DropdownMenuItem>
            </div>
          ))}
          
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoUpdateDialog 
        open={showLogoDialog} 
        onOpenChange={setShowLogoDialog}
        pgId={selectedPGForLogo}
      />
    </>
  );
};
