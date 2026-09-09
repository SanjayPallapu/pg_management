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
import { Check, Crown, ImageIcon, Building2 } from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { Badge } from '@/components/ui/badge';
import { LogoUpdateDialog } from './LogoUpdateDialog';
import { PropertyLogo } from './PropertyLogo';

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
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-10 sm:w-10 p-0 shrink-0 overflow-hidden rounded-xl border-border/80 shadow-xs hover:ring-2 hover:ring-primary/25 transition-all"
            title={`${currentPG?.name || 'Property'} (Switch Property)`}
            aria-label={`${currentPG?.name || 'Property'} - Switch Property`}
          >
            <PropertyLogo
              name={currentPG?.name}
              logoUrl={currentPG?.logoUrl}
              size="md"
              className="h-full w-full rounded-[10px]"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Properties
            </span>
            {isProUser && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                <Crown className="h-3 w-3 mr-1 text-amber-500" /> Pro
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {pgs.map((pg) => (
            <div key={pg.id} className="py-0.5">
              <DropdownMenuItem
                onClick={() => selectPG(pg.id)}
                className="cursor-pointer py-1.5"
              >
                <div className="flex items-center gap-2.5 w-full">
                  <PropertyLogo 
                    name={pg.name}
                    logoUrl={pg.logoUrl} 
                    size="sm"
                    className="shrink-0"
                  />
                  <span className="truncate flex-1 font-medium text-xs">{pg.name}</span>
                  {currentPG?.id === pg.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleUpdateLogo(pg.id)}
                className="cursor-pointer pl-9 text-[11px] text-muted-foreground hover:text-foreground py-1"
              >
                <ImageIcon className="h-3 w-3 mr-1.5 text-primary" />
                Change Property Logo
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
