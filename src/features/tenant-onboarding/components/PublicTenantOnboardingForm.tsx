import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  Home,
  ScrollText,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Save,
  Upload,
  FileText,
  CheckCircle2,
  PartyPopper,
  AlertCircle,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase as typedSupabase } from "@/integrations/supabase/proxyClient";
// Onboarding tables live outside the generated types; use an untyped client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = typedSupabase as any;
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ONBOARDING_FORM_STEPS } from "../types";
import { DEFAULT_RULES, type Rule } from "@/lib/pgRules";
import { MedalBadgeIcon } from "./MedalBadgeIcon";
import onboardingBuilding from "@/assets/pg-hub/hub-building-hero.png";

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Shield,
  Home,
  ScrollText,
};

interface PublicTenantOnboardingFormProps {
  token: string;
}

interface FormData {
  [key: string]: string | boolean | undefined;
}

interface LockedStayDetails {
  roomNumber: string;
  bedLabel: string;
  moveInDate: string;
  monthlyRent: number | null;
  securityDeposit: number | null;
}

export function PublicTenantOnboardingForm({ token }: PublicTenantOnboardingFormProps) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [existingProgress, setExistingProgress] = useState(0);
  const [existingStatus, setExistingStatus] = useState<string>("");
  const [lockedStay, setLockedStay] = useState<LockedStayDetails | null>(null);
  const [pgName, setPgName] = useState("Your PG");
  const [pgLogoUrl, setPgLogoUrl] = useState<string | null>(null);
  const [pgRules, setPgRules] = useState<Rule[]>(DEFAULT_RULES);

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Per-step required fields — used to guard Next/Submit
  const STEP_REQUIRED: Record<number, string[]> = {
    0: ["full_name", "alternate_phone", "emergency_contact_phone"],
    1: ["id_proof_type", "id_proof_number", "id_proof_url"],
    3: ["rules_acknowledged", "agreement_accepted"],
  };

  const validateToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (import.meta.env.DEV && token === "preview") {
      setValid(true);
      setTenantName("Aman Verma");
      setTenantPhone("9876543210");
      setFormData({ full_name: "Aman Verma", alternate_phone: "9876543210", id_proof_type: "aadhaar", id_proof_number: "123456789012", id_proof_url: "preview/aadhaar.png" });
      setLockedStay({ roomNumber: "205", bedLabel: "Bed 1", moveInDate: "2026-08-05", monthlyRent: 6000, securityDeposit: 6000 });
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("validate_onboarding_link", {
      p_token: token,
    });

    if (rpcError) {
      console.error("[Onboarding Form] Token validation failed", rpcError);
      setError("Failed to validate onboarding link. Please try again.");
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setValid(false);
      setError("This onboarding link does not exist or was revoked. Please ask your PG owner for a new link.");
      setLoading(false);
      return;
    }

    const result = data[0];
    if (result.is_expired) {
      setExpired(true);
      setLoading(false);
      return;
    }

    setValid(true);
    setTenantName(result.tenant_name || "");
    setTenantPhone(result.tenant_phone || "");
    setExistingProgress(result.form_progress || 0);
    setExistingStatus(result.onboarding_status || "");
    setLockedStay({
      roomNumber: result.room_number || "Assigned room",
      bedLabel: result.bed_label || "Assigned bed",
      moveInDate: result.move_in_date || "",
      monthlyRent: result.monthly_rent ?? null,
      securityDeposit: result.security_deposit_amount ?? null,
    });
    setPgName(result.pg_name || "Your PG");
    setPgLogoUrl(result.pg_logo_url || null);
    setPgRules(Array.isArray(result.pg_rules) && result.pg_rules.length > 0 ? result.pg_rules : DEFAULT_RULES);

    // If form was already completed, show completion screen
    if (result.onboarding_status === "profile_completed" || result.onboarding_status === "pending_verification" || result.onboarding_status === "verified") {
      setCompleted(true);
    }

    // Restore saved form data if the RPC returns it
    if (result.form_data && typeof result.form_data === "object") {
      const restored = result.form_data as FormData;
      setFormData({
        ...restored,
        alternate_phone: restored.alternate_phone || result.tenant_phone || "",
      });
    }

    // Restore progress — go to the last saved step
    if (result.last_saved_step) {
      const stepIndex = ONBOARDING_FORM_STEPS.findIndex((s) => s.id === result.last_saved_step);
      if (stepIndex >= 0) {
        setCurrentStep(stepIndex);
        setHasStarted(true);
      } else if (result.form_progress > 0) {
        const progressIndex = Math.floor((result.form_progress / 100) * ONBOARDING_FORM_STEPS.length);
        setCurrentStep(Math.min(progressIndex, ONBOARDING_FORM_STEPS.length - 1));
        setHasStarted(true);
      }
    } else if (result.form_progress > 0) {
      const stepIndex = Math.floor((result.form_progress / 100) * ONBOARDING_FORM_STEPS.length);
      setCurrentStep(Math.min(stepIndex, ONBOARDING_FORM_STEPS.length - 1));
      setHasStarted(true);
    }

    setLoading(false);
  }, [token]);

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, [token, validateToken]);

  // Auto-save form data
  const autoSave = useCallback(
    async (data: FormData, step: string, progress: number) => {
      if (!valid || completed) return;

      if (import.meta.env.DEV && token === "preview") {
        setLastSaved(new Date());
        return;
      }

      setSaving(true);
      try {
        const jsonData = Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== undefined && v !== ""),
        );

        const { error } = await supabase.rpc("save_onboarding_form_data", {
          p_token: token,
          p_form_data: jsonData,
          p_step: step,
          p_progress: progress,
          p_submit: false,
        });

        if (error) {
          console.error("[Onboarding Form] Auto-save failed", error);
        } else {
          setLastSaved(new Date());
        }
      } catch (err) {
        console.error("[Onboarding Form] Auto-save error", err);
      } finally {
        setSaving(false);
      }
    },
    [token, valid, completed],
  );

  // Debounced auto-save
  const debouncedAutoSave = useCallback(
    (data: FormData, step: string, progress: number) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        autoSave(data, step, progress);
      }, 1500);
    },
    [autoSave],
  );

  const updateField = (field: string, value: string | boolean) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    const progress = Math.round(((currentStep + 1) / ONBOARDING_FORM_STEPS.length) * 100);
    debouncedAutoSave(newData, ONBOARDING_FORM_STEPS[currentStep].id, progress);
  };

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
    if (currentStep === 1 && String(formData.id_proof_number || "").replace(/\D/g, "").length !== 12) {
      toast.error("Enter a valid 12-digit Aadhaar number");
      return false;
    }
    if (currentStep === 0 && String(formData.emergency_contact_phone || "").length !== 10) {
      toast.error("Emergency contact phone must be exactly 10 digits");
      return false;
    }
    if (currentStep === 0 && String(formData.alternate_phone || "").length !== 10) {
      toast.error("Phone number must be exactly 10 digits");
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

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setSubmitting(true);
    try {
      const jsonData = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== undefined && v !== ""),
      );

      const progress = 100;
      const { error } = await supabase.rpc("save_onboarding_form_data", {
        p_token: token,
        p_form_data: jsonData,
        p_step: "completed",
        p_progress: progress,
        p_submit: true,
      });

      if (error) throw error;

      setCompleted(true);
      toast.success("Profile submitted successfully!");
    } catch (err) {
      console.error("[Onboarding Form] Submit failed", err);
      toast.error("Failed to submit form. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/30">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Validating onboarding link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-950 dark:to-red-950/30 p-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 mb-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button type="button" variant="outline" onClick={validateToken}>Try again</Button>
        </div>
      </div>
    );
  }

  // Expired state
  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-950 dark:to-amber-950/30 p-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-4">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">Link Expired</h1>
          <p className="text-sm text-muted-foreground">
            This onboarding link has expired. Please contact your PG owner to get a new link.
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

  if (!valid) return null;

  if (!hasStarted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaff] p-5 text-slate-950 dark:bg-[#090d16] dark:text-slate-100">
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[min(760px,calc(100vh-40px))] w-full max-w-sm flex-col overflow-hidden rounded-[32px] border border-violet-100 bg-white p-6 shadow-2xl shadow-violet-200/40 dark:border-white/10 dark:bg-[#121824] dark:shadow-black/30"
        >
          <div className="flex items-center gap-2 text-sm font-black text-violet-700 dark:text-violet-300">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-violet-600 text-white">
              {pgLogoUrl ? <img src={pgLogoUrl} alt="" className="h-full w-full object-cover" /> : <Home className="h-4 w-4" />}
            </span>
            {pgName}
          </div>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative mb-7 flex h-56 w-full items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-violet-950/40 dark:via-slate-900 dark:to-indigo-950/40">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute h-40 w-40 rounded-full border border-dashed border-violet-300/70 dark:border-violet-500/30" />
              <motion.img initial={{ opacity: 0, y: 18, scale: 0.92 }} animate={{ opacity: 0.28, y: 0, scale: 1 }} transition={{ duration: 0.8 }} src={onboardingBuilding} alt="" className="absolute inset-x-0 bottom-0 mx-auto h-44 w-full object-contain dark:opacity-20" />
              <motion.div initial={{ opacity: 0, scale: 0.5, rotate: -10 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 140, damping: 14 }} className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[30px] border-4 border-white bg-gradient-to-br from-violet-600 to-indigo-700 shadow-2xl shadow-violet-300/60 dark:border-slate-800 dark:shadow-black/50">
                {pgLogoUrl ? <img src={pgLogoUrl} alt={`${pgName} logo`} className="h-full w-full object-cover" /> : <Home className="h-12 w-12 text-white" />}
              </motion.div>
              <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="absolute bottom-3 rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[10px] font-extrabold text-violet-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/80 dark:text-violet-300">{pgName}</motion.span>
            </div>
            <span className="mb-3 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Secure tenant onboarding</span>
            <h1 className="text-3xl font-black tracking-tight">Welcome to PGHub</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">Hi {tenantName}, complete your verified profile so your stay is smooth from day one.</p>
            <div className="mt-7 grid w-full grid-cols-3 gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><Shield className="mx-auto mb-2 h-4 w-4 text-violet-600 dark:text-violet-400" />Secure</div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><Save className="mx-auto mb-2 h-4 w-4 text-violet-600 dark:text-violet-400" />Auto-saved</div>
              <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/5"><CheckCircle2 className="mx-auto mb-2 h-4 w-4 text-violet-600 dark:text-violet-400" />Easy</div>
            </div>
          </div>
          <Button onClick={() => setHasStarted(true)} className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-indigo-700">
            Get started <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500">Your documents are encrypted and visible only to your PG owner.</p>
        </motion.main>
      </div>
    );
  }

  const currentStepData = ONBOARDING_FORM_STEPS[currentStep];
  const StepIcon = STEP_ICONS[currentStepData.icon] || User;
  const progress = Math.round(((currentStep + 1) / ONBOARDING_FORM_STEPS.length) * 100);
  const isLastStep = currentStep === ONBOARDING_FORM_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/30">
      {/* Premium Glass Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold">Tenant Onboarding</div>
                <div className="text-xs text-muted-foreground">Welcome, {tenantName}</div>
              </div>
            </div>
            {/* Auto-save indicator */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <Save className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Saved</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-2" />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step indicator dots */}
        <div className="flex items-center justify-between mb-8">
          {ONBOARDING_FORM_STEPS.map((step, index) => {
            const Icon = STEP_ICONS[step.icon] || User;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="flex items-center w-full">
                  {index > 0 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 transition-colors",
                        isCompleted || isCurrent ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700",
                      )}
                    />
                  )}
                  <motion.div
                    initial={false}
                    animate={{ scale: isCurrent ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex items-center justify-center rounded-full border-2 transition-all flex-shrink-0",
                      "w-9 h-9",
                      isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                          ? "bg-blue-500 border-blue-500 text-white shadow-lg ring-4 ring-blue-500/20"
                          : "bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700 text-gray-400",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </motion.div>
                  {index < ONBOARDING_FORM_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 transition-colors",
                        isCompleted ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700",
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[9px] text-center font-medium leading-tight hidden sm:block",
                    isCurrent ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {/* Glass card */}
            <div className="backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-border shadow-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                  <StepIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{currentStepData.title}</h2>
                  <p className="text-xs text-muted-foreground">{currentStepData.description}</p>
                </div>
              </div>

              {/* Render fields based on step */}
              <div className="space-y-4">
                {currentStep === 0 && <PersonalInfoStep formData={formData} updateField={updateField} />}
                {currentStep === 1 && <IdentityStep token={token} formData={formData} updateField={updateField} />}
                {currentStep === 2 && <StayStep lockedStay={lockedStay} />}
                {currentStep === 3 && <RulesStep formData={formData} updateField={updateField} tenantName={tenantName} pgName={pgName} rules={pgRules} lockedStay={lockedStay} />}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Submit Profile
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="gap-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-lg text-white"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

type StepProps = {
  formData: FormData;
  updateField: (field: string, value: string | boolean) => void;
};

function PersonalInfoStep({ formData, updateField }: StepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Full Name" required>
        <Input
          value={(formData.full_name as string) || ""}
          onChange={(e) => updateField("full_name", e.target.value)}
          placeholder="Enter your full name"
        />
      </Field>
      <Field label="Date of Birth">
        <Input
          type="date"
          value={(formData.date_of_birth as string) || ""}
          onChange={(e) => updateField("date_of_birth", e.target.value)}
        />
      </Field>
      <Field label="Gender">
        <Select
          value={(formData.gender as string) || ""}
          onValueChange={(v) => updateField("gender", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Blood Group">
        <Select
          value={(formData.blood_group as string) || ""}
          onValueChange={(v) => updateField("blood_group", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select blood group" />
          </SelectTrigger>
          <SelectContent>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <SelectItem key={bg} value={bg}>{bg}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Phone Number" required>
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={(formData.alternate_phone as string) || ""}
          onChange={(e) => updateField("alternate_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit phone number"
        />
      </Field>
      <Field label="Emergency Contact Name">
        <Input
          value={(formData.emergency_contact_name as string) || ""}
          onChange={(e) => updateField("emergency_contact_name", e.target.value)}
          placeholder="Emergency contact person"
        />
      </Field>
      <Field label="Emergency Contact Phone" required>
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={(formData.emergency_contact_phone as string) || ""}
          onChange={(e) => updateField("emergency_contact_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10-digit phone number"
        />
      </Field>
    </div>
  );
}

function IdentityStep({ token, formData, updateField }: StepProps & { token: string }) {
  return (
    <div className="space-y-4">
      <Field label="Identity document" required>
        <div className="flex h-11 items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm text-emerald-800">
          <Shield className="h-4 w-4" /> Aadhaar card
        </div>
      </Field>
      <Field label="ID Proof Number" required>
        <Input
          inputMode="numeric"
          maxLength={14}
          value={String(formData.id_proof_number || "").replace(/(\d{4})(?=\d)/g, "$1 ")}
          onChange={(e) => updateField("id_proof_number", e.target.value.replace(/\D/g, "").slice(0, 12))}
          placeholder="Auto-filled after upload"
        />
      </Field>
      <FileUploadField
        label="Upload Aadhaar (front or QR side)"
        field="id_proof_url"
        token={token}
        onAadhaarDetected={(number) => {
          updateField("id_proof_type", "aadhaar");
          updateField("id_proof_number", number);
        }}
        formData={formData}
        updateField={updateField}
      />
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted-foreground dark:bg-white/5">
        Upload one clear Aadhaar image or PDF. We read the QR code first, then look for the printed 12-digit Aadhaar number and auto-fill it. No separate address-proof file is required.
      </p>
    </div>
  );
}

function StayStep({ lockedStay }: { lockedStay: LockedStayDetails | null }) {
  const values = [
    ["Room", lockedStay?.roomNumber || "Assigned by owner"],
    ["Bed", lockedStay?.bedLabel || "Assigned by owner"],
    ["Move-in date", lockedStay?.moveInDate || "Set by owner"],
    ["Monthly rent", lockedStay?.monthlyRent != null ? `₹${lockedStay.monthlyRent.toLocaleString("en-IN")}` : "Set by owner"],
    ["Security deposit", `₹${Number(lockedStay?.securityDeposit ?? 0).toLocaleString("en-IN")}`],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-100">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
        <div><p className="text-sm font-semibold">Stay details are locked</p><p className="mt-1 text-xs text-violet-700 dark:text-violet-300">These details were confirmed by your PG owner. Contact them if anything is incorrect.</p></div>
      </div>
      <div className="border-y border-slate-200 dark:border-white/10">
        {values.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3.5 last:border-0 dark:border-white/10"><span className="text-xs text-slate-500 dark:text-slate-400">{label}</span><span className="flex items-center gap-2 text-right text-sm font-semibold text-slate-900 dark:text-slate-100"><LockKeyhole className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />{value}</span></div>)}
      </div>
    </div>
  );
}

function RulesStep({ formData, updateField, tenantName, pgName, rules, lockedStay }: StepProps & { tenantName: string; pgName: string; rules: Rule[]; lockedStay: LockedStayDetails | null }) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <ScrollText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold mb-1">{pgName} Rules & Regulations</h3>
            <p className="text-xs text-muted-foreground">
              These rules are maintained by your PG property. Review them before accepting.
            </p>
          </div>
        </div>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border bg-slate-50/70 p-3 dark:bg-white/[0.03]">
        {rules.map((rule, index) => (
          <article key={rule.id || String(index)} className="rounded-xl border bg-background p-3 shadow-sm">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{index + 1}</span>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold">{rule.title}</h4>
                {rule.description && <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>}
                {rule.details.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-foreground/80">
                    {rule.details.map((detail, detailIndex) => <li key={detailIndex} className="flex gap-2"><Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /><span>{detail}</span></li>)}
                  </ul>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <section aria-labelledby="review-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div><h3 id="review-heading" className="text-sm font-bold">Review before submitting</h3><p className="text-xs text-muted-foreground">Confirm these details are correct. Use Back to make changes.</p></div>
          <User className="h-5 w-5 shrink-0 text-violet-500" />
        </div>
        <div className="border-y border-border">
          {[
            ["Full name", formData.full_name || "Not provided"],
            ["Phone number", formData.alternate_phone || "Not provided"],
            ["Emergency phone", formData.emergency_contact_phone || "Not provided"],
            ["Aadhaar number", formData.id_proof_number ? String(formData.id_proof_number).replace(/(\d{4})(?=\d)/g, "$1 ") : "Not provided"],
            ["Aadhaar file", formData.id_proof_url ? "Uploaded" : "Not uploaded"],
            ["Room", lockedStay?.roomNumber || "Assigned by owner"],
            ["Monthly rent", lockedStay?.monthlyRent == null ? "Set by owner" : `₹${lockedStay.monthlyRent.toLocaleString("en-IN")}`],
            ["Security deposit", `₹${Number(lockedStay?.securityDeposit ?? 0).toLocaleString("en-IN")}`],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
              <span className="text-xs text-muted-foreground">{String(label)}</span>
              <span className="max-w-[65%] break-words text-right text-sm font-semibold">{String(value)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={(formData.rules_acknowledged as boolean) || false}
            onCheckedChange={(checked) => updateField("rules_acknowledged", checked === true)}
          />
          <div className="text-sm">
            <span className="font-medium">I acknowledge the PG rules</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              I have read and understood all PG rules including visitor policies, timing restrictions, and common area guidelines.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={(formData.agreement_accepted as boolean) || false}
            onCheckedChange={(checked) => updateField("agreement_accepted", checked === true)}
          />
          <div className="text-sm">
            <span className="font-medium">I accept the rental agreement</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              I agree to the terms of the rental agreement, including rent payment schedule, security deposit terms, and notice period for vacating.
            </p>
          </div>
        </label>
      </div>

      <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold mb-1">Almost Done, {tenantName}!</h3>
            <p className="text-xs text-muted-foreground">
              Click "Submit Profile" to complete your onboarding. The PG owner will be notified and will verify your details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Reusable Field Components
// ============================================================================

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

function FileUploadField({
  label,
  field,
  formData,
  updateField,
  token,
  onAadhaarDetected,
}: {
  label: string;
  field: string;
  formData: FormData;
  updateField: (field: string, value: string) => void;
  token: string;
  onAadhaarDetected?: (number: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("File must be smaller than 8 MB");
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") throw new Error("Use an image or PDF file");
      const fileExt = file.name.split(".").pop();
      const fileName = `${token}/${Date.now()}_${field}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tenant-onboarding-docs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      updateField(field, uploadData.path);
      if (field === "id_proof_url") updateField("id_proof_type", "aadhaar");
      if (onAadhaarDetected && file.type.startsWith("image/")) {
        const scanningToast = toast.loading("Reading the 12-digit Aadhaar number...");
        const detected = await detectAadhaarNumber(file);
        toast.dismiss(scanningToast);
        if (detected) {
          onAadhaarDetected(detected);
          toast.success("Aadhaar uploaded and 12-digit number filled automatically");
        } else {
          toast.info("Aadhaar uploaded. We could not read the printed number clearly—please enter the 12 digits manually.");
        }
      } else {
      toast.success(`${label} uploaded successfully`);
      }
    } catch (err) {
      console.error("File upload failed", err);
      toast.error(err instanceof Error ? err.message : `Failed to upload ${label}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,.pdf"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef?.current?.click()}
          disabled={uploading}
          className="gap-2 w-full"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : formData[field] ? (
            <>
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Uploaded</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Upload File</span>
            </>
          )}
        </Button>
      </div>
    </Field>
  );
}

async function detectAadhaarNumber(file: File): Promise<string | null> {
  try {
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect(source: ImageBitmap): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (Detector) {
      const bitmap = await createImageBitmap(file);
      const codes = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
      bitmap.close();
      for (const code of codes) {
        const match = code.rawValue.match(/(?:uid\s*=\s*["']|\b)(\d{4}[\s-]?\d{4}[\s-]?\d{4})(?:["']|\b)/i);
        if (match) return match[1].replace(/\D/g, "");
      }
    }
  } catch (qrError) {
    console.warn("Aadhaar QR scan unavailable; trying printed text", qrError);
  }

  try {
    const { recognize } = await import("tesseract.js");
    const { data } = await recognize(file, "eng");
    const normalizedText = data.text
      .replace(/[Oo]/g, "0")
      .replace(/[Il|]/g, "1");
    const candidates = normalizedText.match(/\b\d{4}[\s-]+\d{4}[\s-]+\d{4}\b|\b\d{12}\b/g) || [];
    const numbers = candidates.map((candidate) => candidate.replace(/\D/g, ""));
    return numbers.find(isLikelyAadhaarNumber) || numbers[0] || null;
  } catch (ocrError) {
    console.warn("Printed Aadhaar number OCR unavailable", ocrError);
  }
  return null;
}

function isLikelyAadhaarNumber(value: string): boolean {
  if (!/^[2-9]\d{11}$/.test(value)) return false;
  const multiplication = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ];
  const permutation = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ];
  let checksum = 0;
  [...value].reverse().forEach((digit, index) => {
    checksum = multiplication[checksum][permutation[index % 8][Number(digit)]];
  });
  return checksum === 0;
}
