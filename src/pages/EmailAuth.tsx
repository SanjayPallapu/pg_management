import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import journeySecurity from "@/assets/pg-hub/hub-security.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { hasCompletedOnboarding, shouldShowOnboardingAfterLogout } from "@/lib/onboardingState";

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length >= 10, "Enter a valid phone number."),
  city: z.string().trim().min(2, "Enter your city."),
});

type FieldErrors = Partial<Record<"email" | "password" | "fullName" | "phone" | "city", string>>;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.56c2.09-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" fill="#34A853" />
    <path d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.58 10.58 0 0 0 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84A6.49 6.49 0 0 1 12 5.38Z" fill="#EA4335" />
  </svg>
);

const googleErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "Google sign-in is not enabled yet. Use email or phone sign-in.";
  }
  return message || "Google sign-in failed.";
};

export default function EmailAuth() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (isLoading) return;
    if (shouldShowOnboardingAfterLogout() || !hasCompletedOnboarding()) {
      navigate("/onboarding", { replace: true });
    } else if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const readErrors = (error: z.ZodError) => {
    const next: FieldErrors = {};
    error.errors.forEach((issue) => {
      const key = issue.path[0] as keyof FieldErrors;
      next[key] = issue.message;
    });
    setErrors(next);
  };

  const validateCredentials = () => {
    const result = credentialsSchema.safeParse({ email, password });
    if (!result.success) {
      readErrors(result.error);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateCredentials()) return;
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) toast.error(error.message.includes("Invalid login credentials") ? "Invalid email or password." : error.message);
    else window.location.replace("/");
  };

  const continueSignup = (event: React.FormEvent) => {
    event.preventDefault();
    if (validateCredentials()) setSignupStep(2);
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = profileSchema.safeParse({ fullName, phone, city });
    if (!result.success) {
      readErrors(result.error);
      return;
    }
    setErrors({});
    setSubmitting(true);
    const { data, error } = await signUp(email.trim(), password);
    if (error || !data.user) {
      setSubmitting(false);
      toast.error(error?.message || "Could not create your account.");
      return;
    }
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: data.user.id,
      full_name: fullName.trim(),
      phone: phone.replace(/\D/g, ""),
      city: city.trim(),
      is_new_signup: true,
    });
    setSubmitting(false);
    if (profileError) console.error("[EmailAuth] Failed to create profile:", profileError.message);
    navigate("/", { replace: true });
  };

  const handleGoogle = async () => {
    setGoogleSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleSubmitting(false);
      toast.error(googleErrorMessage(error.message));
    }
  };

  if (isLoading) {
    return <div className="pgh-auth-loading"><Loader2 className="pgh-spin" /></div>;
  }

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setSignupStep(1);
    setErrors({});
  };

  return (
    <PGHubShell variant="light" className="pgh-email-auth">
      <div className="pgh-email-auth__page">
        <header className="pgh-email-auth__header">
          <button type="button" onClick={() => navigate("/auth")}><ArrowLeft size={19} /> Back</button>
          <span>Secure access</span>
        </header>

        <section className="pgh-email-auth__hero">
          <div><span>Email & Google</span><h1>{mode === "signin" ? "Welcome back" : "Create account"}</h1></div>
          <img src={journeySecurity} alt="Secure account access" />
        </section>

        <section className="pgh-email-auth__card">
          {signupStep === 1 && (
            <button type="button" className="pgh-google-button" onClick={handleGoogle} disabled={submitting || googleSubmitting}>
              {googleSubmitting ? <Loader2 className="pgh-spin" size={19} /> : <GoogleIcon />} Continue with Google
            </button>
          )}

          {signupStep === 1 && <div className="pgh-auth-divider"><span />or use email<span /></div>}

          {mode === "signin" && (
            <form className="pgh-email-auth__form" onSubmit={handleSignIn}>
              <AuthField icon={Mail} label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
              <PasswordField value={password} onChange={setPassword} error={errors.password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
              <PGHubButton type="submit" loading={submitting}>Sign in</PGHubButton>
              <p>New here? <button type="button" onClick={() => switchMode("signup")}>Create account</button></p>
            </form>
          )}

          {mode === "signup" && signupStep === 1 && (
            <form className="pgh-email-auth__form" onSubmit={continueSignup}>
              <AuthField icon={Mail} label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
              <PasswordField value={password} onChange={setPassword} error={errors.password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
              <PGHubButton type="submit" showArrow>Continue</PGHubButton>
              <p>Already registered? <button type="button" onClick={() => switchMode("signin")}>Sign in</button></p>
            </form>
          )}

          {mode === "signup" && signupStep === 2 && (
            <form className="pgh-email-auth__form pgh-email-auth__form--profile" onSubmit={handleSignUp}>
              <AuthField icon={User} label="Full name" value={fullName} onChange={setFullName} error={errors.fullName} autoComplete="name" />
              <AuthField icon={Phone} label="Phone" type="tel" value={phone} onChange={setPhone} error={errors.phone} autoComplete="tel" />
              <AuthField icon={MapPin} label="City" value={city} onChange={setCity} error={errors.city} autoComplete="address-level2" />
              <div className="pgh-email-auth__actions">
                <button type="button" onClick={() => setSignupStep(1)}>Back</button>
                <PGHubButton type="submit" loading={submitting}>Create account</PGHubButton>
              </div>
            </form>
          )}
        </section>
      </div>
    </PGHubShell>
  );
}

function AuthField({ icon: Icon, label, type = "text", value, onChange, error, autoComplete }: {
  icon: typeof Mail;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <label className="pgh-auth-field">
      <span>{label}</span>
      <div><Icon size={18} /><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} autoComplete={autoComplete} /></div>
      {error && <small>{error}</small>}
    </label>
  );
}

function PasswordField({ value, onChange, error, visible, onToggle }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="pgh-auth-field">
      <span>Password</span>
      <div><Lock size={18} /><input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Password" autoComplete="current-password" /><button type="button" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
      {error && <small>{error}</small>}
    </label>
  );
}
