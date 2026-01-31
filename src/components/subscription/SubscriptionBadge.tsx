import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { useState } from 'react';
import { UpgradeDialog } from './UpgradeDialog';

export const SubscriptionBadge = () => {
  const { subscription, isProUser } = usePG();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!subscription) return null;

  if (isProUser) {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
        <Crown className="h-3 w-3 mr-1" />
        Pro
      </Badge>
    );
  }

  if (subscription.status === 'pending') {
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
