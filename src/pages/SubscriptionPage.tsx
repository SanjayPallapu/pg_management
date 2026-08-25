import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  LogOut,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePG } from "@/contexts/PGContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { SUBSCRIPTION_PLAN_MARKETING, SUBSCRIPTION_PLANS, type SubscriptionPlanKey, getLocalizedSubscriptionPrice } from "@/types/pg";
import { format } from "date-fns";
import { getSubscriptionAccess } from "@/lib/subscriptionAccess";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription, refreshSubscription } = usePG();
  const { signOut } = useAuth();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();

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
  const access = useMemo(() => getSubscriptionAccess(subscription), [subscription]);
  const daysLeft = access.daysRemaining;
  const accessLocked = !access.allowed || Boolean((location.state as { accessLocked?: boolean } | null)?.accessLocked);
  
  // Real active status requires BOTH valid date access and DB active status
  const isSubscribedAndActive = access.allowed && subscription?.status === "active";
  const isTrialActive = isSubscribedAndActive && subscription?.billingCycle === "trial";
  const activePlanKeyOnSubscription = isSubscribedAndActive ? subscription?.billingCycle : undefined;

  const handleBack = async () => {
    if (accessLocked) {
      await signOut();
      navigate("/auth", { replace: true });
    } else {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    }
  };

  const cards = useMemo(() => {
    return [
      {
        monthlyKey: "monthly" as SubscriptionPlanKey,
        yearlyKey: "yearly" as SubscriptionPlanKey,
        title: "Basic",
        tag: billingCycle === "yearly" ? "Save 16%" : "Starter",
        badgeStyle: billingCycle === "yearly" ? "bg-emerald-500 text-white font-bold" : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        cardStyle: "border-slate-200 dark:border-slate-800 bg-card",
        icon: <Zap className="h-6 w-6 text-indigo-500" />,
        audience: SUBSCRIPTION_PLAN_MARKETING.basic.audience,
        features: SUBSCRIPTION_PLAN_MARKETING.basic.features,
      },
      {
        monthlyKey: "pro" as SubscriptionPlanKey,
        yearlyKey: "pro_yearly" as SubscriptionPlanKey,
        title: "Plus",
        tag: "Most Popular",
        badgeStyle: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold shadow-sm",
        cardStyle: "border-purple-500 dark:border-purple-400 bg-purple-500/5 dark:bg-purple-500/10 ring-2 ring-purple-500/40 shadow-xl",
        icon: <Star className="h-6 w-6 text-purple-500 fill-purple-500" />,
        audience: SUBSCRIPTION_PLAN_MARKETING.plus.audience,
        features: SUBSCRIPTION_PLAN_MARKETING.plus.features,
      },
      {
        monthlyKey: "promax" as SubscriptionPlanKey,
        yearlyKey: "promax_yearly" as SubscriptionPlanKey,
        title: "Pro",
        tag: billingCycle === "yearly" ? "Best Deal" : "Ultimate",
        badgeStyle: "bg-amber-500 text-white font-extrabold shadow-sm",
        cardStyle: "border-amber-500/80 dark:border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10",
        icon: <Crown className="h-6 w-6 text-amber-500 fill-amber-500" />,
        audience: SUBSCRIPTION_PLAN_MARKETING.pro.audience,
        features: SUBSCRIPTION_PLAN_MARKETING.pro.features,
      },
    ];
  }, [billingCycle]);

  const handleCheckout = () => {
    initiatePayment({
      plan: activePlanKey,
      onSuccess: async () => {
        await refreshSubscription();
        if (accessLocked) navigate("/", { replace: true });
        else navigate(-1);
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {/* Top Full Screen Header Bar */}
      <header className="sticky top-0 z-30 border-b border-blue-400/20 bg-gradient-to-r from-[#0e6ce7] via-[#155bc7] to-[#243b8f] px-4 py-3 text-white shadow-lg shadow-blue-950/10 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label={accessLocked ? "Sign out / Exit" : "Back"}
              title={accessLocked ? "Sign out / Exit" : "Back"}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
            >
              {accessLocked ? <LogOut className="h-4 w-4" /> : <ArrowLeft className="h-5 w-5" />}
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight text-white">
                <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-300" />
                Subscription Plans
              </h1>
              <p className="truncate text-xs text-blue-100">
                {accessLocked ? "Renew your plan to unlock PG HUB" : "Choose the right plan for your property"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTrialActive && (
              <Badge className="border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
                {daysLeft ?? 0} {daysLeft === 1 ? "day" : "days"} free
              </Badge>
            )}
            {accessLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-white hover:bg-white/15 hover:text-white text-xs font-bold rounded-xl h-8 px-2.5"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Full-Screen Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-4 sm:px-6 lg:px-8 py-4 pb-12">
        
        {/* Subscription Expiry / Current Status Banner */}
        {isSubscribedAndActive ? (
          // Active State
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 p-4 flex items-center gap-3 text-foreground shadow-xs">
            <div className="bg-emerald-500/20 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-300 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  {isTrialActive ? "Free Trial Active" : "Active Subscription"}
                </span>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-sm font-black mt-0.5">
                {isTrialActive ? (
                  <>
                    {daysLeft ?? 0} {daysLeft === 1 ? "day" : "days"} free remaining · Trial expires on{" "}
                    <span className="text-primary font-extrabold">{subscription?.expiresAt ? format(new Date(subscription.expiresAt), "dd MMMM yyyy") : ""}</span>
                  </>
                ) : (
                  <>
                    Plan: <span className="text-primary font-extrabold">{SUBSCRIPTION_PLANS[activePlanKeyOnSubscription as SubscriptionPlanKey]?.name || "Pro"}</span> · Renews on{" "}
                    <span className="text-primary font-extrabold">{subscription?.expiresAt ? format(new Date(subscription.expiresAt), "dd MMMM yyyy") : ""}</span>
                    {daysLeft !== null && ` (${daysLeft} ${daysLeft === 1 ? "day" : "days"} remaining)`}
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          // Expired / Inactive / Locked State
          <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 p-4 flex items-center gap-3 text-foreground shadow-xs">
            <div className="bg-rose-500/20 p-2.5 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-rose-600 dark:text-rose-400">
                  {subscription?.billingCycle === "trial" ? "Free Trial Expired" : "Subscription Expired"}
                </span>
                <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
              </div>
              <p className="text-sm font-black mt-0.5 text-foreground">
                {subscription?.expiresAt ? (
                  <>
                    Access expired on <span className="text-rose-600 dark:text-rose-400 font-extrabold">{format(new Date(subscription.expiresAt), "dd MMMM yyyy")}</span>. Please select a plan below to continue.
                  </>
                ) : (
                  "Upgrade required — no active subscription. Choose a plan to unlock PG HUB."
                )}
              </p>
            </div>
          </div>
        )}

        {/* Clear Guidance Info Box */}
        <div className={`rounded-2xl border p-3 text-xs font-semibold ${
          isTrialActive 
            ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100" 
            : isSubscribedAndActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        }`}>
          {isTrialActive
            ? "Upgrading during your active trial: Razorpay may temporarily debit ₹5 to verify the recurring mandate and automatically refund it. Your plan is billed only when the current trial ends."
            : isSubscribedAndActive
            ? "Your subscription is currently active. You can upgrade your plan or switch between monthly and annual billing at any time."
            : subscription?.billingCycle === "trial"
            ? "Your 7-day free trial has ended. Select a plan below to unlock your dashboard and resume managing your properties immediately."
            : "Your subscription has expired. Select a plan below to renew and restore instant access to all PG HUB features."}
        </div>

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
                Save 16%
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
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{c.audience}</p>
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

        <div className="rounded-2xl border border-border/70 bg-card p-4 text-center">
          <p className="text-sm font-extrabold">Need more than 4 PGs or 500 active tenants?</p>
          <p className="mt-1 text-xs text-muted-foreground">Contact support for a Business plan. Capacity add-ons will be offered only after metered billing is available.</p>
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
