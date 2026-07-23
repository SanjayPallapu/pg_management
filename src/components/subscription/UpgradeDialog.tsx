import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Crown, Loader2, Zap, Sparkles, Globe, Star, ShieldCheck } from 'lucide-react';
import { useRazorpay } from '@/hooks/useRazorpay';
import { usePG } from '@/contexts/PGContext';
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey, getLocalizedSubscriptionPrice } from '@/types/pg';
import { Capacitor } from '@capacitor/core';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradeDialog = ({ open, onOpenChange }: UpgradeDialogProps) => {
  const { subscription, refreshSubscription } = usePG();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>('pro');
  const [region, setRegion] = useState<string>('IN');

  const currentPlan = SUBSCRIPTION_PLANS[selectedPlan];
  const currentLocalized = getLocalizedSubscriptionPrice(selectedPlan, region);
  const isTrialActive = subscription?.billingCycle === 'trial' && subscription?.status === 'active';
  const isNative = Capacitor.isNativePlatform();

  const cards: Array<{
    key: SubscriptionPlanKey;
    title: string;
    tag?: string;
    badgeStyle?: string;
    cardStyle: string;
    icon: React.ReactNode;
    features: string[];
  }> = [
    {
      key: 'monthly',
      title: 'Basic',
      tag: 'Entry Level',
      cardStyle: 'border-slate-200 dark:border-slate-800 bg-card',
      icon: <Zap className="h-5 w-5 text-indigo-500" />,
      features: ['Unlimited PGs & Tenants', 'Rent Collection Sheet', 'Smart PDF Receipts'],
    },
    {
      key: 'pro',
      title: 'Plus',
      tag: 'Most Popular',
      badgeStyle: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs',
      cardStyle: 'border-purple-500 dark:border-purple-400 bg-purple-500/5 dark:bg-purple-500/10 ring-2 ring-purple-500/40 shadow-md',
      icon: <Star className="h-5 w-5 text-purple-500 fill-purple-500" />,
      features: ['Everything in Basic', 'Auto WhatsApp Reminders', 'Occupancy Analytics', 'Priority Support'],
    },
    {
      key: 'promax',
      title: 'Pro',
      tag: 'Ultimate',
      badgeStyle: 'bg-amber-500 text-white shadow-xs',
      cardStyle: 'border-amber-500/80 dark:border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10',
      icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />,
      features: ['Everything in Plus', 'Dedicated Account Manager', 'Custom API Access', '99.9% Uptime SLA'],
    },
  ];

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

        {/* Currency Switcher: USD ($) vs INR (₹) ONLY */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-muted/50 border border-border/60 text-xs my-1">
          <span className="flex items-center gap-1.5 font-bold text-foreground pl-1">
            <Globe className="h-4 w-4 text-primary" /> Currency:
          </span>
          <div className="flex gap-1.5">
            {[
              { code: 'IN', label: 'INR (₹)' },
              { code: 'US', label: 'USD ($)' },
            ].map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setRegion(c.code)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
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

        {isTrialActive && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Free Trial Active — Pick a plan to auto-renew seamlessly before trial ends.</span>
          </div>
        )}

        {/* 3-Card Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
          {cards.map((c) => {
            const locPrice = getLocalizedSubscriptionPrice(c.key, region);
            const isSelected = selectedPlan === c.key;

            return (
              <div
                key={c.key}
                onClick={() => setSelectedPlan(c.key)}
                className={`relative flex flex-col justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  isSelected ? c.cardStyle : 'border-border/60 hover:border-primary/40 bg-card/60'
                }`}
              >
                {c.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${c.badgeStyle || 'bg-muted text-muted-foreground'}`}>
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

                  <div className="mb-3">
                    <span className="text-2xl font-black tracking-tight text-foreground">
                      {locPrice.symbol}{locPrice.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium ml-1">/mo</span>
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
            className="w-full gap-2 py-6 text-sm font-extrabold rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg active:scale-[0.99] transition-all"
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
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><Zap className="h-4 w-4 fill-white" /> Activate {currentPlan.name} Plan ({currentLocalized.symbol}{currentLocalized.price.toLocaleString()}/mo)</>
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};
