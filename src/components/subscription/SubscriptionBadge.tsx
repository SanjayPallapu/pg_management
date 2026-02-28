import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, AlertTriangle } from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { useState } from 'react';
import { UpgradeDialog } from './UpgradeDialog';
import { differenceInDays } from 'date-fns';

export const SubscriptionBadge = () => {
  const { subscription, isProUser } = usePG();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Calculate days until expiry
  const daysUntilExpiry = subscription?.expiresAt 
    ? differenceInDays(new Date(subscription.expiresAt), new Date())
    : null;
  
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  if (isProUser) {
    // Show warning if expiring soon
    if (isExpiringSoon) {
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {daysUntilExpiry}d left
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
        <Crown className="h-3 w-3 mr-1" />
        Pro
      </Badge>
    );
  }

  if (isExpired || subscription?.status === 'expired') {
    return (
      <>
        <Badge variant="destructive" className="cursor-pointer" onClick={() => setShowUpgrade(true)}>
          Expired - Renew
        </Badge>
        <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
      </>
    );
  }

  if (subscription?.status === 'pending') {
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-300">
        Pending Approval
      </Badge>
    );
  }

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowUpgrade(true)}
        className="text-xs"
      >
        <Crown className="h-3 w-3 mr-1" />
        Upgrade
      </Button>
      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
    </>
  );
};
