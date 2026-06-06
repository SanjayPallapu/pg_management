import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Crown, Loader2, Zap } from 'lucide-react';
import { useRazorpay } from '@/hooks/useRazorpay';
import { usePG } from '@/contexts/PGContext';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_ORDER, type SubscriptionPlanKey } from '@/types/pg';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeDialog = ({ open, onOpenChange }: UpgradeDialogProps) => {
  const { subscription, refreshSubscription } = usePG();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>('monthly');

  const currentPlan = SUBSCRIPTION_PLANS[selectedPlan];
  const paidPlans = useMemo(() => SUBSCRIPTION_PLAN_ORDER.filter((key) => key !== 'trial'), []);
  const isTrialActive = subscription?.billingCycle === 'trial' && subscription?.status === 'active';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Upgrade Subscription
          </DialogTitle>
          <DialogDescription>
            Start with a 1 month free trial, then choose an auto-renewing billing cycle.
          </DialogDescription>
        </DialogHeader>

        {isTrialActive && (
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" />
              Free Trial Active
            </div>
            <p className="mt-1 text-muted-foreground">
              Your app is usable right now. Pick a paid cycle anytime before the trial ends to keep auto-renewal active.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {paidPlans.map((planKey) => {
            const plan = SUBSCRIPTION_PLANS[planKey];
            const isSelected = selectedPlan === planKey;

            return (
              <Card
                key={planKey}
                className={`cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedPlan(planKey)}
              >
                <CardContent className="pt-4">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plan.name}</h3>
                        {planKey === 'yearly' && <Badge className="bg-primary/10 text-primary border-0">Best Value</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">₹{plan.price}</div>
                      <div className="text-sm text-muted-foreground">{plan.periodLabel}</div>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited PG owners and PGs</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited rooms and tenants</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Automatic recurring billing via Razorpay</li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Reminders, AC billing, reports, receipts</li>
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          <Button
            className="w-full gap-2 py-6 text-base"
            onClick={() => {
              initiatePayment({
                plan: selectedPlan,
                onSuccess: async () => {
                  await refreshSubscription();
                  onOpenChange(false);
                },
              });
            }}
            disabled={razorpayLoading}
          >
            {razorpayLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Starting Checkout...</>
            ) : (
              <><Zap className="h-5 w-5" /> Continue with Razorpay - ₹{currentPlan.price}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
