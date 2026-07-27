import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Crown, Loader2, Zap, Sparkles, Globe, Star, ShieldCheck } from 'lucide-react';
import { useRazorpay } from '@/hooks/useRazorpay';
import { usePG } from '@/contexts/PGContext';
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey, getLocalizedSubscriptionPrice } from '@/types/pg';
import { Capacitor } from '@capacitor/core';

import { useNavigate } from 'react-router-dom';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeDialog = ({ open, onOpenChange }: UpgradeDialogProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      onOpenChange(false);
      navigate('/subscription');
    }
  }, [open, navigate, onOpenChange]);

  const { subscription, refreshSubscription } = usePG();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [region, setRegion] = useState<string>('IN');

  const selectedPlan = useMemo<SubscriptionPlanKey>(() => {
    if (billingCycle === 'monthly') {
      return 'pro'; // Plus plan (Monthly) is pre-selected
    } else {
      return 'pro_yearly'; // Plus plan (Yearly) is pre-selected
    }
  }, [billingCycle]);

  const [activePlanSelection, setActivePlanSelection] = useState<SubscriptionPlanKey | null>(null);
  const finalPlanKey = activePlanSelection || selectedPlan;

  // Sync selected plan when billing cycle changes
  useEffect(() => {
    setActivePlanSelection(null);
  }, [billingCycle]);

  const currentPlan = SUBSCRIPTION_PLANS[finalPlanKey];
  const currentLocalized = getLocalizedSubscriptionPrice(finalPlanKey, region);
  const isTrialActive = subscription?.billingCycle === 'trial' && subscription?.status === 'active';
  const isNative = Capacitor.isNativePlatform();

  const cards = useMemo(() => {
    return [
      {
        monthlyKey: 'monthly' as SubscriptionPlanKey,
        yearlyKey: 'yearly' as SubscriptionPlanKey,
        title: 'Basic',
        tag: billingCycle === 'yearly' ? 'Save 20%' : 'Entry Level',
        badgeStyle: billingCycle === 'yearly' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
        cardStyle: 'border-slate-200 dark:border-slate-800 bg-card',
        icon: <Zap className="h-5 w-5 text-indigo-500" />,
        features: ['Unlimited PGs & Tenants', 'Rent Collection Sheet', 'Smart PDF Receipts'],
      },
      {
        monthlyKey: 'pro' as SubscriptionPlanKey,
        yearlyKey: 'pro_yearly' as SubscriptionPlanKey,
        title: 'Plus',
        tag: 'Most Popular',
        badgeStyle: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs',
        cardStyle: 'border-purple-500 dark:border-purple-400 bg-purple-500/5 dark:bg-purple-500/10 ring-2 ring-purple-500/40 shadow-md',
        icon: <Star className="h-5 w-5 text-purple-500 fill-purple-500" />,
        features: ['Everything in Basic', 'Auto WhatsApp Reminders', 'Occupancy Analytics', 'Priority Support'],
      },
      {
        monthlyKey: 'promax' as SubscriptionPlanKey,
        yearlyKey: 'promax_yearly' as SubscriptionPlanKey,
        title: 'Pro',
        tag: billingCycle === 'yearly' ? 'Ultimate Save' : 'Ultimate',
        badgeStyle: 'bg-amber-500 text-white shadow-xs',
        cardStyle: 'border-amber-500/80 dark:border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10',
        icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />,
        features: ['Everything in Plus', 'Dedicated Account Manager', 'Custom API Access', '99.9% Uptime SLA'],
      },
    ];
  }, [billingCycle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full p-4 sm:p-6 rounded-3xl">
        <DialogHeader className="text-center sm:text-center pb-1">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-extrabold">
            <Crown className="h-6 w-6 text-amber-500" />
            Subscription Plans
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Select a plan tailored for your PG management needs.
          </DialogDescription>
        </DialogHeader>

        {/* Currency Switcher & Billing Cycle Toggle Row */}
        <div className="flex flex-col sm:flex-row gap-2 justify-between items-center my-1 bg-muted/40 p-2 rounded-2xl border border-border/40">
          {/* Currency Switcher */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="flex items-center gap-1 font-bold text-muted-foreground">
              <Globe className="h-3.5 w-3.5 text-primary" /> Currency:
            </span>
            <div className="flex gap-1">
              {[
                { code: 'IN', label: 'INR (₹)' },
                { code: 'US', label: 'USD ($)' },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setRegion(c.code)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    region === c.code 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Billing Cycle Switcher Toggle */}
          <div className="bg-muted p-1 rounded-xl inline-flex items-center gap-1 border">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="bg-emerald-500 text-[8px] text-white px-1.5 py-0.2 rounded-full font-black animate-pulse uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {isTrialActive && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Free Trial Active — Pick a plan to auto-renew seamlessly before trial ends.</span>
          </div>
        )}

        {/* 3-Card Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
          {cards.map((c) => {
            const planKey = billingCycle === 'monthly' ? c.monthlyKey : c.yearlyKey;
            const isSelected = finalPlanKey === planKey;

            // Get original monthly pricing to show struck-out discount
            const originalPriceLocal = getLocalizedSubscriptionPrice(c.monthlyKey, region);
            const actualPriceLocal = getLocalizedSubscriptionPrice(planKey, region);

            // Compute equivalent monthly cost for yearly
            const displayMonthlyPrice = billingCycle === 'yearly' 
              ? Math.round(actualPriceLocal.price / 12)
              : actualPriceLocal.price;

            return (
              <div
                key={planKey}
                onClick={() => setActivePlanSelection(planKey)}
                className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  isSelected ? c.cardStyle : 'border-border/60 hover:border-primary/40 bg-card/60'
                }`}
              >
                {c.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${c.badgeStyle || 'bg-muted text-muted-foreground'}`}>
                      {c.tag}
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <div className="flex items-center gap-2">
                      {c.icon}
                      <span className="font-extrabold text-base text-foreground">{c.title}</span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-2xl font-black tracking-tight text-foreground">
                        {actualPriceLocal.symbol}{displayMonthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/mo</span>

                      {billingCycle === 'yearly' && (
                        <span className="text-xs text-muted-foreground/60 line-through ml-1.5">
                          {originalPriceLocal.symbol}{originalPriceLocal.price.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {billingCycle === 'yearly' && (
                      <p className="text-[10px] text-emerald-500 font-extrabold mt-0.5">
                        Billed annually ({actualPriceLocal.symbol}{actualPriceLocal.price.toLocaleString()}/yr)
                      </p>
                    )}
                  </div>

                  <ul className="space-y-1.5 text-xs text-muted-foreground border-t border-border/40 pt-3">
                    {c.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-2">
                  <div className={`w-full py-1.5 rounded-xl text-center text-xs font-extrabold transition-all ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}>
                    {isSelected ? 'Selected' : 'Select Plan'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action / Checkout Button */}
        {isNative ? (
          <div className="rounded-xl border border-amber-300/40 bg-amber-500/5 dark:bg-amber-950/10 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1 text-amber-700 dark:text-amber-400">Manage Billing on Web</p>
            To comply with app store guidelines, upgrade at <span className="font-semibold text-foreground select-all">pgmanager.app</span>.
          </div>
        ) : (
          <Button
            className="w-full gap-2 py-6 text-sm font-extrabold rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg active:scale-[0.99] transition-all animate-shimmer"
            onClick={() => {
              initiatePayment({
                plan: finalPlanKey,
                onSuccess: async () => {
                  await refreshSubscription();
                  onOpenChange(false);
                },
              });
            }}
            disabled={razorpayLoading}
          >
            {razorpayLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><Zap className="h-4 w-4 fill-white" /> Activate {currentPlan.name} Plan ({currentLocalized.symbol}{currentLocalized.price.toLocaleString()}{billingCycle === 'yearly' ? '/yr' : '/mo'})</>
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
