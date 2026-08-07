import React, { useEffect, useState } from "react";
import { Home, User, Shield, Phone, Briefcase, CreditCard, Utensils, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/proxyClient";
import { useOnboardingProfile, useUpsertOnboardingProfile } from "../hooks/useOnboarding";
import { ONBOARDING_FORM_STEPS, OnboardingFormStep } from "../types";

const TOTAL_STEPS = ONBOARDING_FORM_STEPS.length + 2; // 1 welcome + steps + 1 success

interface PublicTenantOnboardingFormProps {
  token: string;
}

export const PublicTenantOnboardingForm: React.FC<PublicTenantOnboardingFormProps> = ({ token }) => {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | undefined>(undefined);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate token and resolve tenant context
  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc("validate_onboarding_link", {
        p_token: token,
      });

      if (!isMounted) return;

      if (rpcError) {
        console.error("[Onboarding Form] Token validation failed", rpcError);
        setError("Failed to validate onboarding link. Please contact your PG owner.");
        setLoading(false);
        return;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        setError("This onboarding link is invalid or expired. Please contact your PG owner.");
        setLoading(false);
        return;
      }

      const record = data[0] as any;
      const resolvedTenantId = record.tenant_id as string | undefined;
      if (!resolvedTenantId) {
        setError("Could not resolve tenant for this link. Please contact your PG owner.");
        setLoading(false);
        return;
      }

      setTenantId(resolvedTenantId);
      setTenantName((record.tenant_name as string | undefined) ?? (record.full_name as string | undefined));
      setLoading(false);
    };

    void validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const { data: profile } = useOnboardingProfile(tenantId);
  const upsertProfile = useUpsertOnboardingProfile();

  const goNext = () => {
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  // Validate required fields for the current step before proceeding
  const validateCurrentStep = (): boolean => {
    const required = STEP_REQUIRED[currentStep] || [];
    const missing = required.filter((field) => {
      const val = formData[field];
      return val === undefined || val === "" || val === false;
    });

    if (missing.length > 0) {
      const stepLabel = ONBOARDING_FORM_STEPS[currentStep].title;
      const fieldLabel = missing[0]
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      toast.error(`${stepLabel}: "${fieldLabel}" is required`, { duration: 3000 });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < ONBOARDING_FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      const progress = Math.round(((currentStep + 2) / ONBOARDING_FORM_STEPS.length) * 100);
      autoSave(formData, ONBOARDING_FORM_STEPS[currentStep].id, progress);
    }
  };

  const handleSaveStep = async (
    stepConfig: OnboardingFormStep,
    formData: Record<string, string>,
    isFinalStep = false,
  ) => {
    if (!tenantId) {
      setError("Missing tenant context. Please refresh the page or contact your PG owner.");
      return;
    }

    setIsSubmitting(true);
    try {
      const progress = isFinalStep
        ? 100
        : Math.round(((ONBOARDING_FORM_STEPS.findIndex((s) => s.id === stepConfig.id) + 1) / ONBOARDING_FORM_STEPS.length) * 100);

      await upsertProfile.mutateAsync({
        tenantId,
        data: {
          ...(profile || {}),
          ...formData,
        },
        status: isFinalStep ? "profile_completed" : "form_started",
        lastSavedStep: stepConfig.id,
        formProgress: progress,
      });

      if (isFinalStep) {
        setStep(TOTAL_STEPS);
      } else {
        goNext();
      }
    } finally {
      setIsSubmitting(false);
    }
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

  const renderFormStep = (stepConfig: OnboardingFormStep, isLastFormStep: boolean) => {
    const initialValues: Record<string, string> = {};
    stepConfig.fields.forEach((fieldKey) => {
      initialValues[fieldKey] = (profile as any)?.[fieldKey] ?? "";
    });

    const [localValues, setLocalValues] = useState<Record<string, string>>(initialValues);

    const onChangeField = (fieldKey: string, value: string) => {
      setLocalValues((prev) => ({ ...prev, [fieldKey]: value }));
    };

    const onSubmit = () => {
      void handleSaveStep(stepConfig, localValues, isLastFormStep);
    };

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
          {stepConfig.fields.map((fieldKey) => (
            <div key={fieldKey} className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                {fieldKey.replace(/_/g, " ")}
              </label>
              <input
                type="text"
                value={localValues[fieldKey]}
                onChange={(e) => onChangeField(fieldKey, e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between gap-3">
          <button
            type="button"
            className="px-4 py-2 min-h-[44px] rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            onClick={goBack}
            disabled={isSubmitting}
          >
            Back
          </button>
          <button
            type="button"
            className="px-4 py-2 min-h-[44px] rounded-lg bg-violet-500 hover:bg-violet-600 active:bg-violet-700 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isLastFormStep ? "Submit" : "Continue"}
          </button>
        </div>
      </div>
    );
  };

  const currentFormIndex = step - 2;
  const currentFormStep = ONBOARDING_FORM_STEPS[currentFormIndex];
  const isLastFormStep = currentFormIndex === ONBOARDING_FORM_STEPS.length - 1;

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Validating your onboarding link...</div>
      </div>
    );
  }

  if (error || !tenantId) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-950 dark:to-red-950/30 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-bold mb-2">Invalid or Expired Link</h1>
          <p className="text-sm text-muted-foreground mb-3">
            {error ?? "This onboarding link is invalid or has expired. Please contact your PG owner for a new link."}
          </p>
        </div>
      </div>
    );
  }

  // Completed state
  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full"
        >
          <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center mb-6"
          >
            <MedalBadgeIcon variant="complete" size={96} />
          </motion.div>
            <h1 className="text-2xl font-bold mb-2">Profile Completed!</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Thank you, {tenantName}! Your onboarding profile has been submitted successfully.
              The PG owner will review your details and verify your documents shortly.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Pending Verification
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  

  const currentStepData = ONBOARDING_FORM_STEPS[currentStep];
  const StepIcon = STEP_ICONS[currentStepData.icon] || User;
  const progress = Math.round(((currentStep + 1) / ONBOARDING_FORM_STEPS.length) * 100);
  const isLastStep = currentStep === ONBOARDING_FORM_STEPS.length - 1;

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

          {step > 1 && step < TOTAL_STEPS && currentFormStep && (
            renderFormStep(currentFormStep, isLastFormStep)
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
