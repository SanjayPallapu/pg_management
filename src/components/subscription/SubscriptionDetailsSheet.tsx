import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Building, 
  Users, 
  Calendar, 
  Check, 
  X,
  Sparkles,
  Bell,
  BarChart3,
  ArrowLeft,
  Zap,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { usePG } from '@/contexts/PGContext';
import { format, differenceInDays } from 'date-fns';
import { useRazorpay } from '@/hooks/useRazorpay';
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from '@/types/pg';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface SubscriptionDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgradeClick?: () => void; // Maintained for prop compatibility
}

type BillingCycleToggle = 'monthly' | 'quarterly' | 'yearly';

export const SubscriptionDetailsSheet = ({ open, onOpenChange }: SubscriptionDetailsSheetProps) => {
  const { subscription, pgs, isProUser, refreshSubscription } = usePG();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  const [billingCycle, setBillingCycle] = useState<BillingCycleToggle>('monthly');
  const isNative = Capacitor.isNativePlatform();

  // Selected plan state for checkout
  const [selectedPlanKey, setSelectedPlanKey] = useState<SubscriptionPlanKey>('pro');

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

  // Determine current active plan based on billingCycle
  const activePlanKey = subscription?.billingCycle as SubscriptionPlanKey || 'trial';

  // Calculate days remaining
  const daysLeft = useMemo(() => {
    if (!subscription?.expiresAt) return null;
    return Math.max(0, differenceInDays(new Date(subscription.expiresAt), new Date()));
  }, [subscription?.expiresAt]);

  // Map toggle options to actual plan keys
  const basicPlanKey = useMemo((): SubscriptionPlanKey => {
    if (billingCycle === 'quarterly') return 'quarterly';
    if (billingCycle === 'yearly') return 'yearly';
    return 'monthly';
  }, [billingCycle]);

  const proPlanKey = useMemo((): SubscriptionPlanKey => {
    if (billingCycle === 'quarterly') return 'pro_quarterly';
    if (billingCycle === 'yearly') return 'pro_yearly';
    return 'pro';
  }, [billingCycle]);

  const proMaxPlanKey = useMemo((): SubscriptionPlanKey => {
    if (billingCycle === 'quarterly') return 'promax_quarterly';
    if (billingCycle === 'yearly') return 'promax_yearly';
    return 'promax';
  }, [billingCycle]);

  // Keep selected plan key in sync when billing cycle changes
  useEffect(() => {
    if (selectedPlanKey === 'monthly' || selectedPlanKey === 'quarterly' || selectedPlanKey === 'yearly') {
      setSelectedPlanKey(basicPlanKey);
    } else if (selectedPlanKey === 'pro' || selectedPlanKey === 'pro_quarterly' || selectedPlanKey === 'pro_yearly') {
      setSelectedPlanKey(proPlanKey);
    } else if (selectedPlanKey === 'promax' || selectedPlanKey === 'promax_quarterly' || selectedPlanKey === 'promax_yearly') {
      setSelectedPlanKey(proMaxPlanKey);
    }
  }, [billingCycle, basicPlanKey, proPlanKey, proMaxPlanKey]);

  // Get current active selection info
  const selectedPlanInfo = SUBSCRIPTION_PLANS[selectedPlanKey];

  const handleSelectPlan = (key: SubscriptionPlanKey) => {
    if (subscription?.billingCycle === key && subscription?.status === 'active') {
      toast.info("You are already subscribed to this plan!");
      return;
    }
    setSelectedPlanKey(key);
  };

  const handleCheckout = () => {
    if (isNative) {
      toast.error("Please upgrade via our web portal at pgmanager.app");
      return;
    }
    initiatePayment({
      plan: selectedPlanKey,
      onSuccess: async () => {
        await refreshSubscription();
        onOpenChange(false);
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 [&>button]:hidden bg-background dark:bg-slate-900 text-foreground dark:text-white border-l border-border dark:border-slate-900 flex flex-col h-full overflow-hidden"
      >
        {/* Header section (Fixed at top) */}
        <div className="relative px-2 sm:px-4 pt-6 pb-4 flex items-center justify-between overflow-hidden shrink-0 border-b border-border dark:border-slate-900/40 bg-background dark:bg-background/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
          {/* Soft glowing ambient background */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-muted/60 dark:bg-slate-900/60 border border-border dark:border-slate-800 hover:bg-muted dark:hover:bg-muted dark:bg-slate-800 text-foreground dark:text-white shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground dark:text-white">Subscription</h2>
              <p className="text-xs text-muted-foreground dark:text-slate-400 mt-0.5">Manage your plan and billing</p>
            </div>
          </div>

          {/* Glowing 3D house mockup placeholder */}
          <div className="relative h-16 w-16 flex items-center justify-center bg-gradient-to-tr from-primary/20 to-purple-500/10 rounded-2xl border border-primary/20 shadow-[0_0_15px_rgba(124,133,232,0.1)]">
            <Building className="h-8 w-8 text-primary animate-pulse" />
            <Crown className="absolute -top-1 -right-1 h-4 w-4 text-amber-500 rotate-[15deg]" />
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 space-y-6 pb-40">
          
          {/* CURRENT ACTIVE PLAN CARD */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-muted dark:from-slate-800 via-background dark:via-slate-900 to-background dark:to-slate-950 border border-primary/25 p-5 shadow-lg">
            {/* Decorative glows */}
            <div className="absolute -left-12 -top-12 w-24 h-24 bg-primary/20 rounded-full blur-[40px]" />
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80">Current Plan</span>
              {subscription?.status === 'active' ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-muted dark:bg-slate-800 text-foreground dark:text-slate-300 border border-border dark:border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  Free Tier
                </Badge>
              )}
            </div>

            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-2xl font-extrabold capitalize text-foreground dark:text-white">
                  {activePlanKey === 'trial' ? 'Free Trial' : SUBSCRIPTION_PLANS[activePlanKey]?.name || 'Free Plan'}
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {subscription?.expiresAt ? (
                    <span>Next billing: {format(new Date(subscription.expiresAt), 'dd MMM yyyy')}</span>
                  ) : (
                    <span>No active renewal date</span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-extrabold text-foreground dark:text-white">
                  ₹{(activePlanKey === 'trial' ? 0 : SUBSCRIPTION_PLANS[activePlanKey]?.price || 0).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground dark:text-slate-400 ml-1">
                  {activePlanKey === 'trial' ? '/30 days' : SUBSCRIPTION_PLANS[activePlanKey]?.periodLabel || ''}
                </span>
                <div className="mt-1.5">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-[11px] font-semibold border-border dark:border-slate-800 bg-muted/60 dark:bg-slate-900/60 hover:bg-muted dark:hover:bg-muted dark:bg-slate-800 text-foreground dark:text-white rounded-lg px-3 group"
                    onClick={() => toast.info("Billing management is synced via Razorpay dashboard.")}
                  >
                    Manage Billing
                    <ChevronRight className="h-3.5 w-3.5 ml-1 text-muted-foreground dark:text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK STATS / USAGE SUMMARY GRID */}
          <div className="grid grid-cols-5 gap-2">
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 dark:bg-slate-900/40 border border-border dark:border-slate-900 text-center">
              <div className="bg-primary/10 p-1.5 rounded-lg mb-1">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground dark:text-white">{pgs.length}</span>
              <span className="text-[8px] text-muted-foreground dark:text-slate-400 font-medium leading-tight mt-0.5">PGs Created</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 dark:bg-slate-900/40 border border-border dark:border-slate-900 text-center">
              <div className="bg-primary/10 p-1.5 rounded-lg mb-1">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground dark:text-white">∞</span>
              <span className="text-[8px] text-muted-foreground dark:text-slate-400 font-medium leading-tight mt-0.5">Tenants / PG</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 dark:bg-slate-900/40 border border-border dark:border-slate-900 text-center">
              <div className="bg-primary/10 p-1.5 rounded-lg mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[8px] text-emerald-400 font-bold uppercase">Pro</span>
              <span className="text-[8px] text-muted-foreground dark:text-slate-400 font-medium leading-tight mt-0.5">AI Logo</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 dark:bg-slate-900/40 border border-border dark:border-slate-900 text-center">
              <div className="bg-primary/10 p-1.5 rounded-lg mb-1">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[8px] text-emerald-400 font-bold uppercase">Auto</span>
              <span className="text-[8px] text-muted-foreground dark:text-slate-400 font-medium leading-tight mt-0.5">Reminders</span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/40 dark:bg-slate-900/40 border border-border dark:border-slate-900 text-center">
              <div className="bg-primary/10 p-1.5 rounded-lg mb-1">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[8px] text-emerald-400 font-bold uppercase">Daily</span>
              <span className="text-[8px] text-muted-foreground dark:text-slate-400 font-medium leading-tight mt-0.5">Reports</span>
            </div>
          </div>

          {/* CHOOSE THE RIGHT PLAN TOGGLE */}
          <div className="text-center pt-2">
            <h3 className="text-base font-extrabold text-foreground dark:text-white">Choose the right plan</h3>
            <p className="text-xs text-muted-foreground dark:text-slate-400 mt-0.5">Start with a 1 month free trial. Cancel anytime.</p>
            
            {/* Segmented control toggle */}
            <div className="inline-flex p-1 bg-muted dark:bg-slate-950 rounded-xl border border-border dark:border-slate-900 mt-3.5 w-full max-w-sm">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                  billingCycle === 'monthly' ? 'bg-primary text-foreground dark:text-white shadow-sm' : 'text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('quarterly')}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center ${
                  billingCycle === 'quarterly' ? 'bg-primary text-foreground dark:text-white shadow-sm' : 'text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                <span>Quarterly</span>
                <span className={`text-[8px] mt-0.5 font-bold ${billingCycle === 'quarterly' ? 'text-foreground dark:text-white' : 'text-emerald-500'}`}>Save 10%</span>
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center ${
                  billingCycle === 'yearly' ? 'bg-primary text-foreground dark:text-white shadow-sm' : 'text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                }`}
              >
                <span>Yearly</span>
                <span className={`text-[8px] mt-0.5 font-bold ${billingCycle === 'yearly' ? 'text-foreground dark:text-white' : 'text-amber-500'}`}>Best Value</span>
              </button>
            </div>
          </div>

          {/* PRICING CARDS ROW/GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            
            {/* BASIC PLAN CARD */}
            {(() => {
              const originalPrice = SUBSCRIPTION_PLANS.monthly.price;
              const actualPrice = SUBSCRIPTION_PLANS[basicPlanKey].price;
              const displayMonthly = billingCycle === 'yearly'
                ? Math.round(actualPrice / 12)
                : billingCycle === 'quarterly'
                  ? Math.round(actualPrice / 3)
                  : actualPrice;
              const hasDiscount = billingCycle !== 'monthly';

              return (
                <div 
                  onClick={() => handleSelectPlan(basicPlanKey)}
                  className={`relative p-5 rounded-2xl border transition-all cursor-pointer bg-muted/30 dark:bg-slate-900/30 flex flex-col justify-between ${
                    selectedPlanKey === basicPlanKey
                      ? 'border-indigo-500/50 bg-indigo-500/5 shadow-md shadow-indigo-500/5 ring-1 ring-indigo-500/20' 
                      : 'border-border dark:border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-indigo-500/10 p-2 rounded-xl">
                        <Send className="h-4 w-4 text-indigo-400 rotate-[-15deg]" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-foreground dark:text-white">Basic</h4>
                        <p className="text-[10px] text-muted-foreground dark:text-slate-400">For growing PGs</p>
                      </div>
                    </div>
                    
                    <div className="my-3">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl font-extrabold text-foreground dark:text-white">₹{displayMonthly.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground dark:text-slate-400">/mo</span>
                        
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground/60 line-through">
                            ₹{originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {hasDiscount && (
                        <p className="text-[9px] text-emerald-500 font-extrabold mt-0.5">
                          Billed as ₹{actualPrice.toLocaleString()} {SUBSCRIPTION_PLANS[basicPlanKey].periodLabel}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs border-t border-border dark:border-slate-800 pt-3 text-foreground dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" /> Unlimited PGs</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" /> Unlimited tenants</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" /> Rent reminders</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" /> Reports & receipts</li>
                    </ul>
                  </div>

                  <div className="mt-5">
                    <Button 
                      variant={selectedPlanKey === basicPlanKey ? 'default' : 'outline'}
                      className={`w-full text-xs font-semibold h-9 rounded-xl ${
                        selectedPlanKey === basicPlanKey 
                          ? 'bg-indigo-500 hover:bg-indigo-600 text-white' 
                          : 'border-border dark:border-slate-800 hover:bg-muted dark:hover:bg-slate-900 text-foreground dark:text-slate-300'
                      }`}
                    >
                      {activePlanKey === basicPlanKey ? 'Current Plan' : 'Choose Basic'}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* PLUS PLAN CARD (Glowing Recommended) */}
            {(() => {
              const originalPrice = SUBSCRIPTION_PLANS.pro.price;
              const actualPrice = SUBSCRIPTION_PLANS[proPlanKey].price;
              const displayMonthly = billingCycle === 'yearly'
                ? Math.round(actualPrice / 12)
                : billingCycle === 'quarterly'
                  ? Math.round(actualPrice / 3)
                  : actualPrice;
              const hasDiscount = billingCycle !== 'monthly';

              return (
                <div 
                  onClick={() => handleSelectPlan(proPlanKey)}
                  className={`relative p-5 rounded-2xl border transition-all cursor-pointer bg-muted/30 dark:bg-slate-900/30 flex flex-col justify-between ${
                    selectedPlanKey === proPlanKey
                      ? 'border-cyan-500 bg-cyan-500/5 dark:bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40' 
                      : 'border-border dark:border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  {/* Popular Ribbon/Badge */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-[9px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Crown className="h-2.5 w-2.5 fill-white" />
                    Most Popular
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2 pt-1">
                      <div className="bg-cyan-500/20 p-2 rounded-xl">
                        <Crown className="h-4 w-4 text-cyan-500 dark:text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-foreground dark:text-white">Pro</h4>
                        <p className="text-[10px] text-muted-foreground dark:text-slate-400">For serious operators</p>
                      </div>
                    </div>
                    
                    <div className="my-3">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl font-extrabold text-foreground dark:text-white">₹{displayMonthly.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground dark:text-slate-400">/mo</span>
                        
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground/60 line-through">
                            ₹{originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {hasDiscount && (
                        <p className="text-[9px] text-emerald-500 font-extrabold mt-0.5">
                          Billed as ₹{actualPrice.toLocaleString()} {SUBSCRIPTION_PLANS[proPlanKey].periodLabel}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs border-t border-border dark:border-slate-800 pt-3 text-foreground dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" /> Everything in Basic</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" /> Advanced statistics</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" /> Premium WhatsApp templates</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-cyan-500 shrink-0" /> Priority support</li>
                    </ul>
                  </div>

                  <div className="mt-5">
                    <Button 
                      variant={selectedPlanKey === proPlanKey ? 'default' : 'outline'}
                      className={`w-full text-xs font-semibold h-9 rounded-xl ${
                        selectedPlanKey === proPlanKey 
                          ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                          : 'border-border dark:border-slate-800 hover:bg-muted dark:hover:bg-slate-900 text-foreground dark:text-slate-300'
                      }`}
                    >
                      {activePlanKey === proPlanKey ? 'Current Plan' : 'Choose Pro'}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* PRO MAX PLAN CARD */}
            {(() => {
              const originalPrice = SUBSCRIPTION_PLANS.promax.price;
              const actualPrice = SUBSCRIPTION_PLANS[proMaxPlanKey].price;
              const displayMonthly = billingCycle === 'yearly'
                ? Math.round(actualPrice / 12)
                : billingCycle === 'quarterly'
                  ? Math.round(actualPrice / 3)
                  : actualPrice;
              const hasDiscount = billingCycle !== 'monthly';

              return (
                <div 
                  onClick={() => handleSelectPlan(proMaxPlanKey)}
                  className={`relative p-5 rounded-2xl border transition-all cursor-pointer bg-muted/30 dark:bg-slate-900/30 flex flex-col justify-between ${
                    selectedPlanKey === proMaxPlanKey
                      ? 'border-orange-500/50 bg-orange-500/5 shadow-md shadow-orange-500/5 ring-1 ring-orange-500/20' 
                      : 'border-border dark:border-slate-800 hover:border-orange-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-orange-500/10 p-2 rounded-xl">
                        <Zap className="h-4 w-4 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-foreground dark:text-white">Pro Max</h4>
                        <p className="text-[10px] text-muted-foreground dark:text-slate-400">For large operations</p>
                      </div>
                    </div>
                    
                    <div className="my-3">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-xl font-extrabold text-foreground dark:text-white">₹{displayMonthly.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground dark:text-slate-400">/mo</span>
                        
                        {hasDiscount && (
                          <span className="text-xs text-muted-foreground/60 line-through">
                            ₹{originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {hasDiscount && (
                        <p className="text-[9px] text-emerald-500 font-extrabold mt-0.5">
                          Billed as ₹{actualPrice.toLocaleString()} {SUBSCRIPTION_PLANS[proMaxPlanKey].periodLabel}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs border-t border-border dark:border-slate-800 pt-3 text-foreground dark:text-slate-300">
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-orange-400 shrink-0" /> Everything in Pro</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-orange-400 shrink-0" /> Dedicated manager</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-orange-400 shrink-0" /> Custom API access</li>
                      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-orange-400 shrink-0" /> Priority infra</li>
                    </ul>
                  </div>

                  <div className="mt-5">
                    <Button 
                      variant={selectedPlanKey === proMaxPlanKey ? 'default' : 'outline'}
                      className={`w-full text-xs font-semibold h-9 rounded-xl ${
                        selectedPlanKey === proMaxPlanKey 
                          ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                          : 'border-border dark:border-slate-800 hover:bg-muted dark:hover:bg-slate-900 text-foreground dark:text-slate-300'
                      }`}
                    >
                      {activePlanKey === proMaxPlanKey ? 'Current Plan' : 'Choose Pro Max'}
                    </Button>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* INCLUDED IN EVERY PLAN FOOTER ROW */}
          <div className="rounded-xl border border-border dark:border-slate-900 bg-muted dark:bg-muted/40 dark:bg-slate-950/40 p-3.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-slate-400 mb-2">Included in every plan:</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground dark:text-slate-300">
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Unlimited PGs & tenants</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Rooms & rent</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp reminders</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> AC billing</div>
              <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Reports & receipts</div>
            </div>
          </div>

          {/* LIFETIME BANNER */}
          <div 
            onClick={() => handleSelectPlan('lifetime')}
            className={`relative rounded-2xl border p-5 overflow-hidden transition-all cursor-pointer bg-gradient-to-r from-amber-500/5 via-[#13152c]/50 to-muted/30 dark:to-slate-900/30 flex items-center justify-between gap-4 ${
              selectedPlanKey === 'lifetime'
                ? 'border-amber-500/60 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/30'
                : 'border-border dark:border-slate-900 hover:border-border dark:border-slate-800'
            }`}
          >
            {/* Gold light background effect */}
            <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

            <div className="flex items-center gap-4">
              {/* 3D Gold Infinity Ribbon symbol (made via Lucide/CSS) */}
              <div className="relative h-12 w-12 flex items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-md">
                <Crown className="h-6 w-6 text-amber-500 fill-amber-500/10" />
                <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-400 animate-pulse" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-foreground dark:text-white">Lifetime Access</h3>
                  <Badge className="bg-amber-500 text-slate-950 font-bold border-0 text-[8px] px-2 py-0.5 rounded-full">
                    Most Popular
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground dark:text-slate-400 leading-relaxed mt-1 max-w-sm">
                  Pay once. Run your PGs forever.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xl font-black text-amber-500">₹29,999</div>
              <div className="text-[9px] text-muted-foreground dark:text-slate-400 uppercase tracking-widest font-semibold mt-0.5">one-time</div>
            </div>
          </div>

        </div>

        {/* STICKY BOTTOM CHECKOUT DRAWER (Anchored inside SheetContent absolute) */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-background dark:bg-slate-900 border-t border-border dark:border-slate-900/80 backdrop-blur-md flex items-center justify-between gap-4 z-20 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              {selectedPlanKey === 'lifetime' ? (
                <Crown className="h-4 w-4 text-amber-500" />
              ) : (
                <Zap className="h-4 w-4 text-primary" />
              )}
              <span className="font-extrabold text-sm text-foreground dark:text-white truncate">
                {selectedPlanInfo.name}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground dark:text-slate-400 mt-1 truncate">
              ₹{selectedPlanInfo.price.toLocaleString()} {selectedPlanKey === 'lifetime' ? 'one-time billing' : `${selectedPlanInfo.periodLabel} after 1-month trial`}
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-center">
            <Button
              onClick={handleCheckout}
              disabled={razorpayLoading}
              className="bg-primary hover:bg-[#6A73D5] text-foreground dark:text-white font-extrabold text-xs px-6 py-5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {razorpayLoading ? (
                'Processing...'
              ) : (
                <>
                  <span>Start Free Trial</span>
                  <Zap className="h-3.5 w-3.5 fill-white" />
                </>
              )}
            </Button>
            <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground dark:text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Secure payment via Razorpay</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
