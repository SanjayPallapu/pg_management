import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Building, 
  Users, 
  Calendar, 
  Clock, 
  Check, 
  X,
  MessageCircle,
  Sparkles,
  Bell,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { ADMIN_WHATSAPP } from '@/types/pg';
import { UpgradeDialog } from './UpgradeDialog';

interface SubscriptionDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionDetailsSheet = ({ open, onOpenChange }: SubscriptionDetailsSheetProps) => {
  const { subscription, pgs, isProUser } = usePG();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Default subscription values when no subscription exists
  const displaySubscription = subscription || {
    plan: 'free' as const,
    status: 'free' as const,
    maxPgs: 1,
    maxTenantsPerPg: 20,
    features: {
      aiLogo: false,
      autoReminders: false,
      dailyReports: false,
    },
    expiresAt: undefined,
    paymentApprovedAt: undefined,
  };

  const getStatusBadge = () => {
    switch (displaySubscription.status) {
      case 'active':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-0">
            <Crown className="h-3 w-3 mr-1" /> Pro Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="h-3 w-3 mr-1" /> Pending Approval
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" /> Expired
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Free Plan
          </Badge>
        );
    }
  };

  const openWhatsApp = () => {
    const message = `Hi, I need help with my PG Manager subscription.`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Subscription Details
          </SheetTitle>
          <SheetDescription>
            View your current plan and features
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Card */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">Current Plan</span>
                {getStatusBadge()}
              </div>
              
              <div className="text-3xl font-bold capitalize mb-2">
                {displaySubscription.plan} Plan
              </div>
              
              {isProUser && displaySubscription.expiresAt && (() => {
                const expiresAt = new Date(displaySubscription.expiresAt);
                const now = new Date();
                const daysLeft = differenceInDays(expiresAt, now);
                const hoursLeft = differenceInHours(expiresAt, now) % 24;
                const isExpiringSoon = daysLeft <= 7;
                const totalDays = 30; // Assuming 30-day subscription
                const progressValue = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));
                
                return (
                  <div className={`p-3 rounded-lg ${isExpiringSoon ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-muted'}`}>
                    {isExpiringSoon && (
                      <div className="flex items-center gap-2 text-amber-600 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Expiring Soon!</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Expires: {format(expiresAt, 'dd MMM yyyy')}</span>
                      </div>
                      <Badge variant={isExpiringSoon ? 'outline' : 'secondary'} className={isExpiringSoon ? 'border-amber-400 text-amber-600' : ''}>
                        {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : 'Expired'}
                      </Badge>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-4">Usage</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">PGs Created</span>
                  </div>
                  <span className="font-semibold">
                    {pgs.length} / {displaySubscription.maxPgs === -1 ? '∞' : displaySubscription.maxPgs}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Tenants per PG</span>
                  </div>
                  <span className="font-semibold">
                    {displaySubscription.maxTenantsPerPg === -1 ? 'Unlimited' : displaySubscription.maxTenantsPerPg}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-4">Features</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">AI Logo Generator</span>
                  </div>
                  {displaySubscription.features?.aiLogo ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Auto Reminders</span>
                  </div>
                  {displaySubscription.features?.autoReminders ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Daily Reports</span>
                  </div>
                  {displaySubscription.features?.dailyReports ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates Card */}
          {displaySubscription.paymentApprovedAt && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-4">Subscription History</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{format(new Date(displaySubscription.paymentApprovedAt), 'dd MMM yyyy')}</span>
                  </div>
                  
                  {displaySubscription.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expires</span>
                      <span>{format(new Date(displaySubscription.expiresAt), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Subscribe/Upgrade Button */}
          {!isProUser && (
            <Button 
              onClick={() => {
                onOpenChange(false);
                setShowUpgrade(true);
              }} 
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              <Crown className="h-4 w-4" />
              Subscribe to Pro
            </Button>
          )}
          
          <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} />

          <Separator />

          {/* Contact Admin */}
          <Button 
            variant="outline" 
            onClick={openWhatsApp} 
            className="w-full gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Contact Admin on WhatsApp
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
