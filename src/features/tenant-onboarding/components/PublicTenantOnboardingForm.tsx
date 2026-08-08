import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  Phone,
  Briefcase,
  Home,
  CreditCard,
  Utensils,
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
import { Textarea } from "@/components/ui/textarea";
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
import { MedalBadgeIcon } from "./MedalBadgeIcon";
import onboardingBuilding from "@/assets/pg-hub/hub-building-hero.png";

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  User,
  Shield,
  Phone,
  Briefcase,
  Home,
  CreditCard,
  Utensils,
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

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const restoreDark = root.classList.contains("dark");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
    return () => {
      if (restoreDark) root.classList.add("dark");
      root.style.colorScheme = "";
    };
  }, []);

  // Per-step required fields — used to guard Next/Submit
  const STEP_REQUIRED: Record<number, string[]> = {
    0: ["full_name"],         // Personal: Full Name required
    1: ["id_proof_type", "id_proof_number", "id_proof_url"],
    5: ["rules_acknowledged", "agreement_accepted"],
  };

  const validateToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (import.meta.env.DEV && token === "preview") {
      setValid(true);
      setTenantName("Aman Verma");
      setTenantPhone("9876543210");
      setFormData({ full_name: "Aman Verma", id_proof_type: "aadhaar", id_proof_number: "123456789012", id_proof_url: "preview/aadhaar.png" });
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
      setError("Invalid or expired onboarding link.");
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

    // If form was already completed, show completion screen
    if (result.onboarding_status === "profile_completed" || result.onboarding_status === "pending_verification" || result.onboarding_status === "verified") {
      setCompleted(true);
    }

    // Restore saved form data if the RPC returns it
    if (result.form_data && typeof result.form_data === "object") {
      setFormData(result.form_data as FormData);
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
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaff] p-5 text-slate-950">
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex min-h-[min(760px,calc(100vh-40px))] w-full max-w-sm flex-col overflow-hidden rounded-[32px] border border-violet-100 bg-white p-6 shadow-2xl shadow-violet-200/40"
        >
          <div className="flex items-center gap-2 text-sm font-black text-violet-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white"><Home className="h-4 w-4" /></span>
            PGHub
          </div>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 120 }}
              src={onboardingBuilding}
              alt="Your PG building"
              className="mb-7 h-52 w-full object-contain drop-shadow-2xl"
            />
            <span className="mb-3 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Secure tenant onboarding</span>
            <h1 className="text-3xl font-black tracking-tight">Welcome to PGHub</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">Hi {tenantName}, complete your verified profile so your stay is smooth from day one.</p>
            <div className="mt-7 grid w-full grid-cols-3 gap-2 text-[10px] font-semibold text-slate-600">
              <div className="rounded-2xl bg-slate-50 p-3"><Shield className="mx-auto mb-2 h-4 w-4 text-violet-600" />Secure</div>
              <div className="rounded-2xl bg-slate-50 p-3"><Save className="mx-auto mb-2 h-4 w-4 text-violet-600" />Auto-saved</div>
              <div className="rounded-2xl bg-slate-50 p-3"><CheckCircle2 className="mx-auto mb-2 h-4 w-4 text-violet-600" />Easy</div>
            </div>
          </div>
          <Button onClick={() => setHasStarted(true)} className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-indigo-700">
            Get started <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <p className="mt-3 text-center text-[10px] text-slate-400">Your documents are encrypted and visible only to your PG owner.</p>
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
                {currentStep === 2 && <ContactStep formData={formData} updateField={updateField} />}
                {currentStep === 3 && <StayStep lockedStay={lockedStay} />}
                {currentStep === 4 && <PaymentStep formData={formData} updateField={updateField} />}
                {currentStep === 5 && <RulesStep formData={formData} updateField={updateField} tenantName={tenantName} />}
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
      <Field label="Emergency Contact Name">
        <Input
          value={(formData.emergency_contact_name as string) || ""}
          onChange={(e) => updateField("emergency_contact_name", e.target.value)}
          placeholder="Emergency contact person"
        />
      </Field>
      <Field label="Emergency Contact Phone">
        <Input
          type="tel"
          value={(formData.emergency_contact_phone as string) || ""}
          onChange={(e) => updateField("emergency_contact_phone", e.target.value)}
          placeholder="Emergency contact number"
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
      <FileUploadField
        label="Upload Address Proof"
        field="address_proof_url"
        token={token}
        formData={formData}
        updateField={updateField}
      />
    </div>
  );
}

function ContactStep({ formData, updateField }: StepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Email Address">
        <Input
          type="email"
          value={(formData.email as string) || ""}
          onChange={(e) => updateField("email", e.target.value)}
          placeholder="your@email.com"
        />
      </Field>
      <Field label="Alternate Phone">
        <Input
          type="tel"
          value={(formData.alternate_phone as string) || ""}
          onChange={(e) => updateField("alternate_phone", e.target.value)}
          placeholder="Alternate phone number"
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Permanent Address">
          <Textarea
            value={(formData.permanent_address as string) || ""}
            onChange={(e) => updateField("permanent_address", e.target.value)}
            placeholder="Enter your permanent address"
            rows={3}
          />
        </Field>
      </div>
    </div>
  );
}

function StayStep({ lockedStay }: { lockedStay: LockedStayDetails | null }) {
  const values = [
    ["Room", lockedStay?.roomNumber || "Assigned by owner"],
    ["Bed", lockedStay?.bedLabel || "Assigned by owner"],
    ["Move-in date", lockedStay?.moveInDate || "Set by owner"],
    ["Monthly rent", lockedStay?.monthlyRent != null ? `₹${lockedStay.monthlyRent.toLocaleString("en-IN")}` : "Set by owner"],
    ["Security deposit", lockedStay?.securityDeposit != null ? `₹${lockedStay.securityDeposit.toLocaleString("en-IN")}` : "Set by owner"],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-violet-950">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
        <div><p className="text-sm font-semibold">Stay details are locked</p><p className="mt-1 text-xs text-violet-700">These details were confirmed by your PG owner. Contact them if anything is incorrect.</p></div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-slate-50/80">
        {values.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-0"><span className="text-xs text-muted-foreground">{label}</span><span className="flex items-center gap-2 text-sm font-semibold text-right"><LockKeyhole className="h-3.5 w-3.5 text-slate-400" />{value}</span></div>)}
      </div>
    </div>
  );
}

function PaymentStep({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <Field label="Preferred Payment Mode">
        <Select
          value={(formData.payment_mode as string) || ""}
          onValueChange={(v) => updateField("payment_mode", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {(formData.payment_mode === "upi") && (
        <Field label="UPI ID">
          <Input
            value={(formData.upi_id as string) || ""}
            onChange={(e) => updateField("upi_id", e.target.value)}
            placeholder="yourname@upi"
          />
        </Field>
      )}
      {(formData.payment_mode === "bank_transfer") && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Bank Account Number">
              <Input
                value={(formData.bank_account_number as string) || ""}
                onChange={(e) => updateField("bank_account_number", e.target.value)}
                placeholder="Account number"
              />
            </Field>
            <Field label="IFSC Code">
              <Input
                value={(formData.ifsc_code as string) || ""}
                onChange={(e) => updateField("ifsc_code", e.target.value)}
                placeholder="IFSC code"
              />
            </Field>
          </div>
          <Field label="Bank Name">
            <Input
              value={(formData.bank_name as string) || ""}
              onChange={(e) => updateField("bank_name", e.target.value)}
              placeholder="Bank name"
            />
          </Field>
        </>
      )}
    </div>
  );
}

function RulesStep({ formData, updateField, tenantName }: StepProps & { tenantName: string }) {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <div className="flex items-start gap-3">
          <ScrollText className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold mb-1">PG Rules & Agreement</h3>
            <p className="text-xs text-muted-foreground">
              Please review and accept the following terms to complete your onboarding.
            </p>
          </div>
        </div>
      </div>

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
      if (onAadhaarDetected && file.type.startsWith("image/")) {
        const detected = await detectAadhaarNumber(file);
        if (detected) {
          onAadhaarDetected(detected);
          toast.success("Aadhaar uploaded and number filled automatically");
        } else {
          toast.info("Aadhaar uploaded. Enter the number if the QR is not visible.");
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
    if (!Detector) return null;
    const bitmap = await createImageBitmap(file);
    const codes = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
    bitmap.close();
    for (const code of codes) {
      const match = code.rawValue.match(/(?:uid\s*=\s*["']|\b)(\d{4}\s?\d{4}\s?\d{4})(?:["']|\b)/i);
      if (match) return match[1].replace(/\D/g, "");
    }
  } catch (error) {
    console.warn("Aadhaar QR scan unavailable", error);
  }
  return null;
}
