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

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly" | "lifetime">("monthly");

  const defaultPlanKey = useMemo<SubscriptionPlanKey>(() => {
    if (billingCycle === "lifetime") return "lifetime";
    return billingCycle === "monthly" ? "pro" : "pro_yearly";
  }, [billingCycle]);

  const [selectedPlanKey, setSelectedPlanKey] = useState<SubscriptionPlanKey | null>(null);
  const activePlanKey = selectedPlanKey || defaultPlanKey;

  // Reset explicit selection when cycle toggles
  useEffect(() => {
    if (billingCycle === "lifetime") {
      setSelectedPlanKey("lifetime");
    } else {
      setSelectedPlanKey(null);
    }
  }, [billingCycle]);

  const currentLocalized = getLocalizedSubscriptionPrice(activePlanKey, "IN");
  const access = useMemo(() => getSubscriptionAccess(subscription), [subscription]);
  const daysLeft = access.daysRemaining;
  const accessLocked = !access.allowed || Boolean((location.state as { accessLocked?: boolean } | null)?.accessLocked);
  
  // Real active status requires BOTH valid date access and DB active status
  const isSubscribedAndActive = access.allowed && subscription?.status === "active";
  const isTrialActive = isSubscribedAndActive && subscription?.billingCycle === "trial";
  const activePlanKeyOnSubscription = isSubscribedAndActive ? subscription?.billingCycle : undefined;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/?tab=settings", { replace: true });
    }
  };

  const cards = useMemo(() => {
    if (billingCycle === "lifetime") {
      return [
        {
          key: "lifetime" as SubscriptionPlanKey,
          title: "Lifetime Pro Max",
          badge: "👑 4 PGs · Best Value",
          badgeStyle: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black shadow-md",
          cardStyle: "border-amber-500/80 bg-gradient-to-b from-amber-500/10 via-card to-card ring-2 ring-amber-500/40 shadow-xl",
          icon: <Crown className="h-6 w-6 text-amber-500 fill-amber-500" />,
          audience: "Lifetime access for multi-property PG businesses",
          priceDisplay: "₹9,999",
          periodText: "One-time payment · Never pay again",
          features: [
            "Up to 4 PG properties included",
            "500 active tenants included",
            "Lifetime access — no monthly or annual renewals",
            "All Pro features & automatic WhatsApp receipts",
            "Complete reports, Excel exports & audit history",
            "VIP priority customer support",
          ],
        }
      ];
    }

    return [
      {
        key: (billingCycle === "monthly" ? "monthly" : "yearly") as SubscriptionPlanKey,
        monthlyKey: "monthly" as SubscriptionPlanKey,
        title: "Basic",
        badge: billingCycle === "yearly" ? "Save ₹989" : "1 PG",
        badgeStyle: billingCycle === "yearly" ? "bg-emerald-500 text-white font-bold" : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        cardStyle: "border-slate-200 dark:border-slate-800 bg-card/70",
        icon: <Zap className="h-5 w-5 text-indigo-500" />,
        audience: "For individual PG owners",
        features: SUBSCRIPTION_PLAN_MARKETING.basic.features.slice(0, 5),
      },
      {
        key: (billingCycle === "monthly" ? "pro" : "pro_yearly") as SubscriptionPlanKey,
        monthlyKey: "pro" as SubscriptionPlanKey,
        title: "Plus",
        badge: "Most Popular · 2 PGs",
        badgeStyle: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold shadow-sm",
        cardStyle: "border-purple-500 dark:border-purple-400 bg-purple-500/5 dark:bg-purple-500/10 ring-2 ring-purple-500/40 shadow-md",
        icon: <Star className="h-5 w-5 text-purple-500 fill-purple-500" />,
        audience: "For growing PG businesses",
        features: SUBSCRIPTION_PLAN_MARKETING.plus.features.slice(0, 5),
      },
      {
        key: (billingCycle === "monthly" ? "promax" : "promax_yearly") as SubscriptionPlanKey,
        monthlyKey: "promax" as SubscriptionPlanKey,
        title: "Pro",
        badge: billingCycle === "yearly" ? "Save ₹1,989 · 4 PGs" : "4 PGs",
        badgeStyle: "bg-amber-500 text-white font-extrabold shadow-sm",
        cardStyle: "border-amber-500/80 dark:border-amber-400/80 bg-amber-500/5 dark:bg-amber-500/10",
        icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />,
        audience: "For multi-property owners",
        features: SUBSCRIPTION_PLAN_MARKETING.pro.features.slice(0, 5),
      },
    ];
  }, [billingCycle]);

  const handleCheckout = () => {
    initiatePayment({
      plan: activePlanKey,
      onSuccess: async () => {
        await refreshSubscription();
        navigate("/", { replace: true });
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/20 text-foreground">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-blue-400/20 bg-gradient-to-r from-[#0e6ce7] via-[#155bc7] to-[#243b8f] px-3 sm:px-4 py-2.5 text-white shadow-md backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
            >
              {accessLocked ? <LogOut className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </button>
            <div>
              <h1 className="flex items-center gap-1.5 text-sm sm:text-base font-black tracking-tight text-white">
                <Crown className="h-4 w-4 text-amber-300" />
                Subscription Plans
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTrialActive && (
              <Badge className="border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                {daysLeft ?? 0} {daysLeft === 1 ? "day" : "days"} free
              </Badge>
            )}
            {accessLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-white hover:bg-white/15 hover:text-white text-xs font-bold rounded-xl h-7 px-2"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-3 px-3 sm:px-6 py-2.5 pb-8">
        {/* Subscription Status Banner (Compact) */}
        {isSubscribedAndActive ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center justify-between gap-2.5 text-foreground shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-emerald-500/20 p-1.5 rounded-lg text-emerald-600 dark:text-emerald-300 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {isTrialActive ? "Free Trial Active" : `Plan: ${SUBSCRIPTION_PLANS[activePlanKeyOnSubscription as SubscriptionPlanKey]?.name || "Pro"}`} ·{" "}
                  <span className="text-muted-foreground font-medium">
                    {subscription?.expiresAt ? `Expires ${format(new Date(subscription.expiresAt), "dd MMM yyyy")}` : ""}
                  </span>
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500 text-white font-extrabold px-2 py-0.5 rounded-full shrink-0">Active</span>
          </div>
        ) : (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 flex items-center gap-2.5 text-foreground shadow-xs">
            <div className="bg-rose-500/20 p-1.5 rounded-lg text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold text-foreground">
              {subscription?.billingCycle === "trial" ? "Free Trial Expired" : "Choose a plan to activate PG HUB"}
            </p>
          </div>
        )}

        {/* Billing Cycle Switcher Toggle */}
        <div className="flex items-center justify-center">
          <div className="bg-muted p-1 rounded-xl inline-flex items-center gap-1 border border-border/50 shadow-xs">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                billingCycle === "yearly"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="bg-emerald-500 text-[9px] text-white px-1.5 py-0.2 rounded-full font-black uppercase">
                Save 17%
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("lifetime")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                billingCycle === "lifetime"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-amber-500"
              }`}
            >
              👑 Lifetime Pro Max
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        {billingCycle === "lifetime" ? (
          /* Lifetime VIP Card */
          <div className="max-w-xl mx-auto">
            {cards.map((c: any) => {
              const actualPriceLocal = getLocalizedSubscriptionPrice("lifetime", "IN");
              const isSelected = activePlanKey === "lifetime";
              return (
                <div
                  key="lifetime"
                  onClick={() => setSelectedPlanKey("lifetime")}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all ${c.cardStyle}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {c.icon}
                      <h2 className="text-lg font-black text-foreground">{c.title}</h2>
                    </div>
                    <Badge className={c.badgeStyle}>{c.badge}</Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">{c.audience}</p>

                  <div className="mb-4 bg-amber-500/10 dark:bg-amber-500/20 p-3 rounded-xl border border-amber-500/30">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-foreground">₹9,999</span>
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">One-Time · No Expiry</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Manage up to 4 PG properties & 500 tenants forever.</p>
                  </div>

                  <ul className="space-y-2 text-xs mb-4">
                    {c.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-semibold text-foreground/90">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-sm font-black text-white shadow-lg hover:opacity-95"
                    onClick={(e) => { e.stopPropagation(); handleCheckout(); }}
                    disabled={razorpayLoading}
                  >
                    {razorpayLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opening checkout…</> : "Get Lifetime Pro Max · ₹9,999"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          /* Monthly / Yearly 3 Cards */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5">
            {cards.map((c: any) => {
              const planKey = c.key;
              const isSelected = activePlanKey === planKey;
              const isActivePlan = activePlanKeyOnSubscription === planKey;
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
                  className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                    isActivePlan
                      ? "border-emerald-500/40 bg-emerald-500/5 opacity-70 cursor-not-allowed"
                      : isSelected ? c.cardStyle : "border-border/60 hover:border-primary/40 bg-card/60"
                  }`}
                >
                  {c.badge && (
                    <div className="absolute -top-2.5 right-3">
                      <Badge className={`rounded-full px-2.5 py-0.2 text-[9px] font-black uppercase ${c.badgeStyle}`}>
                        {c.badge}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {c.icon}
                      <span className="font-extrabold text-base text-foreground">{c.title}</span>
                    </div>

                    <div className="mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black tracking-tight text-foreground">
                          {actualPriceLocal.symbol}{displayMonthlyPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground font-semibold">/mo</span>
                      </div>
                      {billingCycle === "yearly" ? (
                        <p className="text-[11px] text-emerald-500 font-extrabold">
                          Billed ₹{actualPriceLocal.price.toLocaleString()}/yr
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Billed monthly. Cancel anytime.
                        </p>
                      )}
                    </div>

                    <ul className="space-y-1.5 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                      {c.features.map((f: string, i: number) => (
                        <li key={i} className="flex items-center gap-1.5 text-foreground/90">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="font-medium truncate">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 pt-1">
                    {isActivePlan ? (
                      <div className="w-full rounded-xl bg-emerald-500/10 py-2 text-center text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                        Active Plan
                      </div>
                    ) : isSelected ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-xs font-extrabold text-white shadow-sm"
                        onClick={(event) => { event.stopPropagation(); handleCheckout(); }}
                        disabled={razorpayLoading}
                      >
                        {razorpayLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Choose · ${actualPriceLocal.symbol}${actualPriceLocal.price.toLocaleString()}`}
                      </Button>
                    ) : (
                      <div className="w-full rounded-xl bg-muted py-2 text-center text-xs font-bold text-muted-foreground">
                        Tap to select
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Secure Checkout Strip */}
        <div className="flex items-center justify-around rounded-xl bg-card border border-border/60 p-2.5 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-primary" /><span className="font-semibold">UPI & Cards</span></div>
          <div className="flex items-center gap-1.5"><Landmark className="h-4 w-4 text-primary" /><span className="font-semibold">Net Banking</span></div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /><span className="font-semibold">256-Bit Encrypted</span></div>
        </div>
      </main>
    </div>
  );
}
