import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Crown, Loader2, Zap, Sparkles } from 'lucide-react';
import { useRazorpay } from '@/hooks/useRazorpay';
import { usePG } from '@/contexts/PGContext';
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_ORDER, type SubscriptionPlanKey } from '@/types/pg';
import { Capacitor } from '@capacitor/core';

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
  const isNative = Capacitor.isNativePlatform();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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

        <div className="flex flex-col gap-4 max-h-[85vh]">
          {isTrialActive && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/5 dark:bg-amber-950/10 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                Free Trial Active
              </div>
              <p className="mt-1 text-muted-foreground leading-relaxed">
                Your app is fully active. Select a billing cycle below to configure your auto-renewal before the trial ends.
              </p>
            </div>
          )}

          {/* Scrollable Plan Selection Container */}
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin">
            {paidPlans.map((planKey) => {
              const plan = SUBSCRIPTION_PLANS[planKey];
              const isSelected = selectedPlan === planKey;

              const getSelectedClasses = () => {
                if (planKey.startsWith('pro') && !planKey.startsWith('promax')) {
                  return 'border-cyan-500 dark:border-cyan-400 bg-cyan-500/5 dark:bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30';
                }
                if (planKey.startsWith('promax')) {
                  return 'border-amber-500 dark:border-amber-400 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm ring-1 ring-amber-500/30';
                }
                if (planKey === 'lifetime') {
                  return 'border-emerald-500 dark:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30';
                }
                return 'border-indigo-500 dark:border-indigo-400 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-sm ring-1 ring-indigo-500/30';
              };

              return (
                <div
                  key={planKey}
                  onClick={() => setSelectedPlan(planKey)}
                  className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? getSelectedClasses() 
                      : 'border-border dark:border-slate-800 hover:border-primary/40 bg-card/50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{plan.name}</span>
                      {planKey === 'yearly' && (
                        <Badge className="bg-primary/20 text-primary border-0 text-[9px] px-2 py-0.5 rounded-full font-bold">
                          Best Value
                        </Badge>
                      )}
                      {planKey === 'pro' && (
                        <Badge className="bg-cyan-500/10 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400 border-0 text-[9px] px-2 py-0.5 rounded-full font-bold">
                          Recommended
                        </Badge>
                      )}
                      {planKey === 'lifetime' && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-0 text-[9px] px-2 py-0.5 rounded-full font-bold">
                          Lifetime
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-foreground">₹{plan.price.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">{plan.periodLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unified Core Features (Show once for clean layout) */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3.5 border border-border/30">
            <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Everything included in {SUBSCRIPTION_PLANS[selectedPlan].name}:
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate">Unlimited PGs & Owners</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate">Unlimited Rooms/Beds</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate">Auto WhatsApp Reminders</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-success shrink-0" />
                <span className="truncate">AC Bill & Budget Tools</span>
              </div>
            </div>
          </div>

          {isNative ? (
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/5 dark:bg-amber-950/10 p-3.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1 text-amber-700 dark:text-amber-400">Manage Billing on Web</p>
              To comply with mobile app store guidelines, upgrades cannot be purchased inside the app. Please sign in via a web browser at <span className="font-semibold text-foreground select-all">pgmanager.app</span> to upgrade.
            </div>
          ) : (
            <Button
              className="w-full gap-2 py-6 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-[#9FA6FF] hover:from-[#6A73D5] hover:to-[#8E95EE] text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
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
                <><Zap className="h-4 w-4 fill-white" /> Activate {currentPlan.name} - ₹{currentPlan.price.toLocaleString()}</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
