import { useState } from "react";
import { Check, Clock, Crown, ArrowRight, ShieldCheck, Sparkles, Star, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubSetupHeader } from "@/features/pg-hub/PGHubSetupHeader";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { usePG } from "@/contexts/PGContext";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/types/pg";
import { toast } from "sonner";

export default function PGSetupSubscription() {
  const navigate = useNavigate();
  const { refreshSubscription } = usePG();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>("trial");
  const [submitting, setSubmitting] = useState(false);

  const confirmPlan = async () => {
    setSubmitting(true);
    try {
      await refreshSubscription();
      sessionStorage.setItem("pgh_selected_plan", selectedPlan);
      toast.success(
        selectedPlan === "trial"
          ? "7-Day Free Trial activated!"
          : `${SUBSCRIPTION_PLANS[selectedPlan]?.name || "Plan"} selected!`
      );
      navigate("/setup/complete", { replace: true });
    } catch {
      toast.error("Proceeding with default free trial");
      navigate("/setup/complete", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const planCards = [
    {
      key: "trial" as SubscriptionPlanKey,
      name: "7-Day Free Trial",
      tag: "Recommended for New Users",
      price: "₹0",
      period: "for 7 days",
      badgeStyle: "bg-emerald-500 text-white font-extrabold",
      cardStyle: "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30",
      icon: <Clock className="h-5 w-5 text-emerald-600 shrink-0" />,
      features: [
        "Full access to all Pro features",
        "Unlimited PGs, Rooms & Tenants",
        "Smart PDF Receipts & Whatsapp Reminders",
        "No credit card required",
      ],
    },
    {
      key: "pro" as SubscriptionPlanKey,
      name: "Plus Pro",
      tag: "Most Popular",
      price: "₹299",
      period: "/month",
      badgeStyle: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold",
      cardStyle: "border-purple-500 bg-purple-500/5 ring-2 ring-purple-500/30",
      icon: <Star className="h-5 w-5 text-purple-600 fill-purple-600 shrink-0" />,
      features: [
        "Everything in Trial",
        "Auto-renewing subscriptions",
        "Occupancy & Profit Analytics",
        "Priority Support",
      ],
    },
    {
      key: "promax" as SubscriptionPlanKey,
      name: "Pro Ultimate",
      tag: "Ultimate",
      price: "₹499",
      period: "/month",
      badgeStyle: "bg-amber-500 text-white font-extrabold",
      cardStyle: "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/30",
      icon: <Crown className="h-5 w-5 text-amber-500 fill-amber-500 shrink-0" />,
      features: [
        "Everything in Pro",
        "Multi-owner PG Management",
        "Dedicated Account Manager",
        "99.9% Uptime SLA",
      ],
    },
  ];

  return (
    <PGHubShell variant="light" className="pgh-setup-shell bg-slate-50 h-dvh max-h-dvh overflow-hidden">
      <div className="w-full max-w-full h-full flex flex-col justify-between p-3 sm:p-4 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between pt-1">
            <h1 className="w-full text-center text-base font-extrabold text-slate-900">Choose Your Plan</h1>
          </div>
          <PGHubSetupHeader step="Step 3 of 3" progress={1} onBack={() => navigate("/setup/capacity")} />
        </div>

        {/* Scrollable Plan Selection Cards Area */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 my-2 pr-0.5">
          <div className="text-center pt-1 pb-1">
            <h2 className="text-lg font-black text-slate-900 leading-tight">Start with 7 Days Free</h2>
            <p className="text-xs text-slate-500 font-medium">Select a plan to start managing your PG seamlessly.</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {planCards.map((card) => {
              const isSelected = selectedPlan === card.key;
              return (
                <div
                  key={card.key}
                  onClick={() => setSelectedPlan(card.key)}
                  className={`relative p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected ? card.cardStyle : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {card.icon}
                      <div>
                        <strong className="text-sm font-extrabold text-slate-900 block leading-tight">{card.name}</strong>
                        <span className="text-[10px] text-slate-400 font-medium">{card.tag}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{card.price}</span>
                      <small className="text-[10px] text-slate-500 font-medium block">{card.period}</small>
                    </div>
                  </div>

                  <ul className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-1 gap-1 text-xs text-slate-600">
                    {card.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 flex items-center gap-2.5 text-xs text-purple-900 mt-1">
            <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0" />
            <span>You can upgrade, downgrade, or cancel your plan anytime from app settings.</span>
          </div>
        </div>

        {/* Bottom Fixed Action Button */}
        <div className="shrink-0 pt-2 pb-1 border-t border-slate-200/80 bg-slate-50 z-30">
          <div className="max-w-xl mx-auto">
            <PGHubButton
              onClick={confirmPlan}
              loading={submitting}
              className="w-full h-12 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-purple-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              Finish Setup & Go to Ready Page <ArrowRight size={18} />
            </PGHubButton>
          </div>
        </div>

      </div>
    </PGHubShell>
  );
}
