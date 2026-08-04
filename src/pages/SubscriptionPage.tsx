import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Crown, 
  Zap, 
  Star, 
  Check, 
  Clock, 
  ShieldCheck, 
  Globe, 
  Loader2, 
  Award,
  CreditCard,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePG } from "@/contexts/PGContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { type SubscriptionPlanKey, getLocalizedSubscriptionPrice } from "@/types/pg";
import { useBackGesture } from "@/hooks/useBackGesture";
import { format, differenceInDays } from "date-fns";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { subscription, refreshSubscription, pgs } = usePG();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  
  useBackGesture(true, () => navigate(-1));

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const defaultPlanKey = useMemo<SubscriptionPlanKey>(() => {
    return billingCycle === "monthly" ? "pro" : "pro_yearly";
  }, [billingCycle]);

  const [selectedPlanKey, setSelectedPlanKey] = useState<SubscriptionPlanKey | null>(null);
  const activePlanKey = selectedPlanKey || defaultPlanKey;

  // Reset explicit selection when cycle toggles
  useEffect(() => {
    setSelectedPlanKey(null);
  }, [billingCycle]);

  // Checkout plans are currently settled in INR. Keep one universal checkout
  // rather than exposing country switches that can disagree with the provider.
  const currentLocalized = getLocalizedSubscriptionPrice(activePlanKey, "IN");
  const isTrialActive = subscription?.billingCycle === "trial" && subscription?.status === "active";
  const activePlanKeyOnSubscription = subscription?.status === "active" ? subscription?.billingCycle : undefined;

  const daysLeft = useMemo(() => {
    if (!subscription?.expiresAt) return null;
    return Math.max(0, differenceInDays(new Date(subscription.expiresAt), new Date()));
  }, [subscription?.expiresAt]);

  const cards = useMemo(() => {
    return [
      {
        monthlyKey: "monthly" as SubscriptionPlanKey,
        yearlyKey: "yearly" as SubscriptionPlanKey,
        title: "Basic",
        tag: billingCycle === "yearly" ? "Save 20%" : "Starter",
        badgeStyle: billingCycle === "yearly" ? "bg-emerald-500 text-white font-bold" : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        cardStyle: "border-slate-200 dark:border-slate-800 bg-card",
        icon: <Zap className="h-6 w-6 text-indigo-500" />,
        features: [
          "Unlimited PGs & Rooms",
          "Unlimited Tenants",
          "Rent Collection Sheet",
          "Smart PDF Receipts",
          "Basic Reports",
        ],
      },
      {
        monthlyKey: "pro" as SubscriptionPlanKey,
        yearlyKey: "pro_yearly" as SubscriptionPlanKey,
        title: "Plus",
        tag: "Most Popular",
        badgeStyle: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold shadow-sm",
        cardStyle: "border-purple-500 dark:border-purple-400 bg-purple-500/5 dark:bg-purple-500/10 ring-2 ring-purple-500/40 shadow-xl",
        icon: <Star className="h-6 w-6 text-purple-500 fill-purple-500" />,
        features: [
          "Everything in Basic",
          "Auto WhatsApp Rent Reminders",
          "AC Unit Billing & Calculation",
          "Occupancy & Revenue Analytics",
          "Priority 24/7 Support",
        ],
      },
      {
        monthlyKey: "promax" as SubscriptionPlanKey,
        yearlyKey: "promax_yearly" as SubscriptionPlanKey,
        title: "Pro Ultimate",
        tag: billingCycle === "yearly" ? "Best Deal" : "Ultimate",
        badgeStyle: "bg-amber-500 text-white font-extrabold shadow-sm",
        cardStyle: "border-amber-500/80 dark:border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10",
        icon: <Crown className="h-6 w-6 text-amber-500 fill-amber-500" />,
        features: [
          "Everything in Plus",
          "Multi-owner Management",
          "Dedicated Account Manager",
          "Custom API & Backup Export",
          "99.9% Uptime Guarantee",
        ],
      },
    ];
  }, [billingCycle]);

  const handleCheckout = () => {
    initiatePayment({
      plan: activePlanKey,
      onSuccess: async () => {
        await refreshSubscription();
        navigate(-1);
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {/* Top Full Screen Header Bar */}
      <header className="sticky top-0 z-30 border-b border-blue-400/20 bg-gradient-to-r from-[#0e6ce7] via-[#155bc7] to-[#243b8f] px-3 py-3 text-white shadow-lg shadow-blue-950/10 backdrop-blur sm:px-4">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-extrabold leading-tight text-white">
              Plans & Billing
              <Award className="h-4 w-4 text-amber-500" />
            </h1>
            <p className="truncate text-xs text-blue-100">Choose the right plan for your property</p>
          </div>
        </div>

        {subscription?.status !== "active" && (
          <Badge className="border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
            Free Trial
          </Badge>
        )}
        </div>
      </header>

      {/* Main Full-Screen Body */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-4 px-3 py-4 pb-10 sm:px-4">
        
        {/* Active Trial Notification Banner */}
        {isTrialActive && (
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-center gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
            <div className="bg-amber-500/20 p-2 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold">30-Day Free Trial Active</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {daysLeft !== null ? `${daysLeft} days remaining.` : ""} Choose a plan to auto-renew seamlessly when your trial ends.
              </p>
            </div>
          </div>
        )}

        {/* Universal checkout & billing cycle */}
        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-border/70 bg-background py-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Globe className="h-4 w-4" /></span>
            <span><strong className="block text-foreground">One secure checkout worldwide</strong><small className="text-muted-foreground">Billed in {currentLocalized.currency}; your bank handles any currency conversion.</small></span>
          </div>

          {/* Billing Cycle Switcher Toggle */}
          <div className="bg-muted p-1 rounded-xl inline-flex items-center gap-1 border border-border/40">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="bg-emerald-500 text-[9px] text-white px-1.5 py-0.2 rounded-full font-black uppercase animate-pulse">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3-Column Plan Cards Grid */}
        <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-3">
          {cards.map((c) => {
            const planKey = billingCycle === "monthly" ? c.monthlyKey : c.yearlyKey;
            const isSelected = activePlanKey === planKey;
            const isActivePlan = activePlanKeyOnSubscription === planKey;

            const originalPriceLocal = getLocalizedSubscriptionPrice(c.monthlyKey, "IN");
            const actualPriceLocal = getLocalizedSubscriptionPrice(planKey, "IN");

            const displayMonthlyPrice = billingCycle === "yearly"
              ? Math.round(actualPriceLocal.price / 12)
              : actualPriceLocal.price;

            return (
              <div
                key={planKey}
                onClick={() => {
                  if (isActivePlan) return;
                  setSelectedPlanKey(planKey);
                }}
                className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                  isActivePlan
                    ? "border-emerald-500/40 bg-emerald-500/5 opacity-70 cursor-not-allowed"
                    : isSelected ? c.cardStyle : "border-border/60 hover:border-primary/40 bg-card/60"
                }`}
              >
                {c.tag && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase ${c.badgeStyle}`}>
                      {c.tag}
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="mb-2 mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {c.icon}
                      <span className="font-extrabold text-lg text-foreground">{c.title}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl font-black tracking-tight text-foreground">
                        {actualPriceLocal.symbol}{displayMonthlyPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold">/mo</span>

                      {billingCycle === "yearly" && (
                        <span className="text-sm text-muted-foreground/60 line-through ml-2 font-medium">
                          {originalPriceLocal.symbol}{originalPriceLocal.price.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {billingCycle === "yearly" ? (
                      <p className="text-xs text-emerald-500 font-extrabold mt-1">
                        Billed annually ({actualPriceLocal.symbol}{actualPriceLocal.price.toLocaleString()}/yr)
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground font-medium mt-1">
                        Billed monthly. Cancel anytime.
                      </p>
                    )}
                  </div>

                  <ul className="grid gap-2 border-t border-border/40 pt-3 text-xs text-muted-foreground sm:grid-cols-2 md:grid-cols-1">
                    {c.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground/90">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-medium">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 pt-1">
                  {isActivePlan ? (
                    <div className="w-full rounded-xl bg-emerald-500/10 py-2.5 text-center text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                      Active Plan
                    </div>
                  ) : isSelected ? (
                    <Button
                      type="button"
                      className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-xs font-extrabold text-white shadow-md"
                      onClick={(event) => { event.stopPropagation(); handleCheckout(); }}
                      disabled={razorpayLoading}
                    >
                      {razorpayLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opening checkout…</> : `Choose ${c.title} · ${actualPriceLocal.symbol}${actualPriceLocal.price.toLocaleString()}`}
                    </Button>
                  ) : (
                    <div className="w-full rounded-xl bg-muted py-2.5 text-center text-xs font-extrabold text-muted-foreground">Tap to select</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Provider-neutral secure checkout */}
        <div className="grid gap-3 border-t border-border/60 pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl bg-background p-3"><CreditCard className="h-5 w-5 shrink-0 text-primary" /><div><strong className="block text-xs">Cards</strong><span className="text-[11px] text-muted-foreground">Major debit and credit cards</span></div></div>
          <div className="flex items-center gap-3 rounded-2xl bg-background p-3"><Landmark className="h-5 w-5 shrink-0 text-primary" /><div><strong className="block text-xs">Bank & local methods</strong><span className="text-[11px] text-muted-foreground">Options appear by availability</span></div></div>
          <div className="flex items-center gap-3 rounded-2xl bg-background p-3"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" /><div><strong className="block text-xs">Secure checkout</strong><span className="text-[11px] text-muted-foreground">Encrypted payment authorization</span></div></div>
        </div>
      </main>

    </div>
  );
}
