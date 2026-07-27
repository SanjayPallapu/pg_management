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
  Building,
  Sparkles,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePG } from "@/contexts/PGContext";
import { useRazorpay } from "@/hooks/useRazorpay";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey, getLocalizedSubscriptionPrice } from "@/types/pg";
import { useBackGesture } from "@/hooks/useBackGesture";
import { format, differenceInDays } from "date-fns";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { subscription, refreshSubscription, pgs } = usePG();
  const { initiatePayment, isLoading: razorpayLoading } = useRazorpay();
  
  useBackGesture(true, () => navigate(-1));

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [region, setRegion] = useState<string>("IN");

  const defaultPlanKey = useMemo<SubscriptionPlanKey>(() => {
    return billingCycle === "monthly" ? "pro" : "pro_yearly";
  }, [billingCycle]);

  const [selectedPlanKey, setSelectedPlanKey] = useState<SubscriptionPlanKey | null>(null);
  const activePlanKey = selectedPlanKey || defaultPlanKey;

  // Reset explicit selection when cycle toggles
  useEffect(() => {
    setSelectedPlanKey(null);
  }, [billingCycle]);

  const currentPlan = SUBSCRIPTION_PLANS[activePlanKey];
  const currentLocalized = getLocalizedSubscriptionPrice(activePlanKey, region);
  const isTrialActive = subscription?.billingCycle === "trial" && subscription?.status === "active";

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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Full Screen Header Bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-extrabold text-foreground leading-tight flex items-center gap-2">
              Subscription & Plans
              <Award className="h-4 w-4 text-amber-500" />
            </h1>
            <p className="text-xs text-muted-foreground">Select a plan to power your PG management</p>
          </div>
        </div>

        {subscription?.status === "active" ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Active ({subscription.billingCycle?.toUpperCase()})
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
            Free Trial
          </Badge>
        )}
      </header>

      {/* Main Full-Screen Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-28">
        
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

        {/* Currency & Billing Cycle Toggle Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-card p-3 rounded-2xl border border-border shadow-xs">
          {/* Currency Selection */}
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 font-bold text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" /> Currency:
            </span>
            <div className="flex gap-1 bg-muted p-1 rounded-xl">
              {[
                { code: "IN", label: "INR (₹)" },
                { code: "US", label: "USD ($)" },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setRegion(c.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    region === c.code 
                      ? "bg-primary text-primary-foreground shadow-xs" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {cards.map((c) => {
            const planKey = billingCycle === "monthly" ? c.monthlyKey : c.yearlyKey;
            const isSelected = activePlanKey === planKey;

            const originalPriceLocal = getLocalizedSubscriptionPrice(c.monthlyKey, region);
            const actualPriceLocal = getLocalizedSubscriptionPrice(planKey, region);

            const displayMonthlyPrice = billingCycle === "yearly"
              ? Math.round(actualPriceLocal.price / 12)
              : actualPriceLocal.price;

            return (
              <div
                key={planKey}
                onClick={() => setSelectedPlanKey(planKey)}
                className={`relative flex flex-col justify-between p-6 rounded-3xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  isSelected ? c.cardStyle : "border-border/60 hover:border-primary/40 bg-card/60"
                }`}
              >
                {c.tag && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className={`text-[10px] font-black uppercase px-3 py-0.5 rounded-full ${c.badgeStyle}`}>
                      {c.tag}
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <div className="flex items-center gap-2.5">
                      {c.icon}
                      <span className="font-extrabold text-lg text-foreground">{c.title}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-3xl font-black tracking-tight text-foreground">
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

                  <ul className="space-y-2.5 text-xs text-muted-foreground border-t border-border/40 pt-4">
                    {c.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground/90">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="font-medium">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-2">
                  <div className={`w-full py-2.5 rounded-2xl text-center text-xs font-extrabold transition-all ${
                    isSelected 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                    {isSelected ? "Selected Plan" : "Select Plan"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Matrix / Guarantee Box */}
        <div className="p-5 rounded-3xl bg-muted/40 border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground mt-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
            <div>
              <p className="font-extrabold text-foreground text-sm">Razorpay Secure 256-Bit SSL Payment</p>
              <p className="text-xs text-muted-foreground">Instant activation after payment. Upgrade, downgrade, or cancel anytime.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Drawer Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border backdrop-blur-md z-40 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-primary/10 p-2.5 rounded-2xl text-primary shrink-0">
              <Zap className="h-5 w-5 fill-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-foreground">{currentPlan.name} Plan</span>
                <span className="text-xs text-muted-foreground font-semibold">({billingCycle === "yearly" ? "Yearly" : "Monthly"})</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {currentLocalized.symbol}{currentLocalized.price.toLocaleString()} {billingCycle === "yearly" ? "/year" : "/month"}
              </p>
            </div>
          </div>

          <Button
            className="w-full sm:w-auto px-8 py-6 text-sm font-extrabold rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            onClick={handleCheckout}
            disabled={razorpayLoading}
          >
            {razorpayLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Starting Razorpay Checkout...</>
            ) : (
              <><Zap className="h-4 w-4 fill-white" /> Activate {currentPlan.name} ({currentLocalized.symbol}{currentLocalized.price.toLocaleString()})</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
