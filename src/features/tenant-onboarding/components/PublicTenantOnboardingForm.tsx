import React, { useState } from "react";
import { Home, User, Shield, Phone, Briefcase, CreditCard, Utensils, ScrollText } from "lucide-react";
import { useOnboardingProfile } from "../hooks/useOnboarding";
import { ONBOARDING_FORM_STEPS, OnboardingFormStep } from "../types";

const TOTAL_STEPS = ONBOARDING_FORM_STEPS.length + 2; // 1 welcome + steps + 1 success

interface PublicTenantOnboardingFormProps {
  tenantId: string;
  tenantName?: string;
}

export const PublicTenantOnboardingForm: React.FC<PublicTenantOnboardingFormProps> = ({
  tenantId,
  tenantName,
}) => {
  const [step, setStep] = useState(1);
  const { data: profile } = useOnboardingProfile(tenantId);

  const goNext = () => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const renderStepIcon = (icon: string) => {
    switch (icon) {
      case "User":
        return <User className="h-5 w-5" />;
      case "Shield":
        return <Shield className="h-5 w-5" />;
      case "Phone":
        return <Phone className="h-5 w-5" />;
      case "Briefcase":
        return <Briefcase className="h-5 w-5" />;
      case "CreditCard":
        return <CreditCard className="h-5 w-5" />;
      case "Utensils":
        return <Utensils className="h-5 w-5" />;
      case "ScrollText":
        return <ScrollText className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const renderFormStep = (stepConfig: OnboardingFormStep) => {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-violet-500/10 text-violet-400">
            {renderStepIcon(stepConfig.icon)}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">{stepConfig.title}</h2>
            <p className="text-sm text-slate-300">{stepConfig.description}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {stepConfig.fields.map((fieldKey) => {
            const value = (profile as any)?.[fieldKey] ?? "";
            return (
              <div key={fieldKey} className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  {fieldKey.replace(/_/g, " ")}
                </label>
                <input
                  type="text"
                  defaultValue={value}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
          <button
            type="button"
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            onClick={goBack}
          >
            Back
          </button>
          <button
            type="button"
            className="px-4 py-2 min-h-[44px] rounded-lg bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            onClick={goNext}
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-50 flex flex-col overflow-x-hidden">
      <header className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Home className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">Tenant Onboarding</div>
            <div className="text-xs text-slate-400 truncate">
              Welcome{tenantName ? `, ${tenantName}` : ""}
            </div>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-slate-300 shrink-0">
          Step {step} of {TOTAL_STEPS}
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 py-6 sm:py-8">
        <div className="w-full max-w-5xl">
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
              <div className="space-y-3 sm:space-y-4 text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
                  Welcome to PGHub
                </h1>
                <p className="text-sm sm:text-base text-slate-300">
                  Complete your profile so we can make your stay safer, smoother,
                  and more comfortable.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col justify-between w-full">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
                    Tenant onboarding
                  </p>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">Complete your profile</h2>
                  <p className="text-sm text-slate-300 mb-6">
                    Takes around 3–5 minutes. You can edit details later.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-4 w-full py-3 min-h-[44px] rounded-xl bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  onClick={goNext}
                  aria-label="Get started with tenant onboarding"
                >
                  Get started
                </button>
              </div>
            </div>
          )}

          {step > 1 && step < TOTAL_STEPS && (
            renderFormStep(ONBOARDING_FORM_STEPS[step - 2])
          )}

          {step === TOTAL_STEPS && (
            <div className="min-h-[50vh] sm:min-h-[60vh] flex flex-col items-center justify-center text-center space-y-5 sm:space-y-6 px-2">
              <div className="relative">
                <img
                  src="/assets/badges/green-profile-badge.png"
                  alt="Profile complete badge"
                  className="w-28 h-28 sm:w-40 sm:h-40 mx-auto"
                />
              </div>
              <div className="space-y-2 max-w-md">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold">Profile Submitted!</h1>
                <p className="text-sm text-slate-300">
                  Thank you. Your profile has been submitted successfully. Your PG
                  owner will review your details and confirm your stay soon.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto">
                <button
                  type="button"
                  className="px-5 py-2.5 min-h-[44px] rounded-xl bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  Back to home
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
