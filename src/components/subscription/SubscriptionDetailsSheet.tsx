import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  BarChart3
} from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { format } from 'date-fns';
import { ADMIN_WHATSAPP } from '@/types/pg';

interface SubscriptionDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubscriptionDetailsSheet = ({ open, onOpenChange }: SubscriptionDetailsSheetProps) => {
  const { subscription, pgs, isProUser } = usePG();

  const getStatusBadge = () => {
    if (!subscription) return null;
    
    switch (subscription.status) {
      case 'active':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-primary-foreground border-0">
            <Crown className="h-3 w-3 mr-1" /> Pro Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-warning border-warning/50">
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

  if (!subscription) return null;

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
                {subscription.plan} Plan
              </div>
              
              {isProUser && subscription.expiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Expires: {format(new Date(subscription.expiresAt), 'dd MMM yyyy')}
                </div>
              )}
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
                    {pgs.length} / {subscription.maxPgs === -1 ? '∞' : subscription.maxPgs}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Tenants per PG</span>
                  </div>
                  <span className="font-semibold">
                    {subscription.maxTenantsPerPg === -1 ? 'Unlimited' : subscription.maxTenantsPerPg}
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
                  {subscription.features?.aiLogo ? (
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
                  {subscription.features?.autoReminders ? (
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
                  {subscription.features?.dailyReports ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates Card */}
          {subscription.paymentApprovedAt && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-4">Subscription History</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{format(new Date(subscription.paymentApprovedAt), 'dd MMM yyyy')}</span>
                  </div>
                  
                  {subscription.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expires</span>
                      <span>{format(new Date(subscription.expiresAt), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
