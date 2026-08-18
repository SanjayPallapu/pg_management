import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import journeySecurity from "@/assets/pg-hub/hub-security.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { useAuth } from "@/hooks/useAuth";
import { completeOnboarding, hasCompletedOnboarding, shouldShowOnboardingAfterLogout } from "@/lib/onboardingState";
import { sendAccountAuthEmail } from "@/lib/resend";

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type FieldErrors = Partial<Record<"email" | "password", string>>;

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
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      completeOnboarding();
      navigate("/", { replace: true });
      return;
    }
    if (shouldShowOnboardingAfterLogout() || !hasCompletedOnboarding()) {
      navigate("/onboarding", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (requestedMode === "signup") {
      setMode("signup");
      setErrors({});
    } else if (requestedMode === "signin") {
      setMode("signin");
      setErrors({});
    }
  }, [searchParams]);

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
    else {
      completeOnboarding();
      window.location.replace("/");
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateCredentials()) return;
    setSubmitting(true);
    const targetEmail = email.trim();
    const { data, error } = await signUp(targetEmail, password);
    setSubmitting(false);
    if (error || !data.user) {
      toast.error(error?.message || "Could not create your account.");
      return;
    }
    sendAccountAuthEmail({ to: targetEmail, action: "signup_welcome" }).catch(err => console.warn("[Auth Email Error]", err));
    toast.success("Account created! Confirmation email sent.");
    setEmail("");
    setPassword("");
    setMode("signin");
    navigate("/auth/email?mode=signin", { replace: true });
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
    setErrors({});
    navigate(`/auth/email?mode=${next}`, { replace: true });
  };

  return (
    <PGHubShell variant="light" className="pgh-email-auth">
      <div className="pgh-email-auth__page">
        <header className="pgh-email-auth__header">
          <button type="button" onClick={() => navigate("/auth")}><ArrowLeft size={19} /> Back</button>
          <span>Secure access</span>
        </header>

        <section className="pgh-email-auth__hero">
          <div><span>Email & Google</span><h1>Welcome back</h1></div>
          <img src={journeySecurity} alt="Secure account access" />
        </section>

        <section className="pgh-email-auth__card">
          <button type="button" className="pgh-google-button" onClick={handleGoogle} disabled={submitting || googleSubmitting}>
            {googleSubmitting ? <Loader2 className="pgh-spin" size={19} /> : <GoogleIcon />} Continue with Google
          </button>

          <div className="pgh-auth-divider"><span />or use email<span /></div>

          <form className="pgh-email-auth__form" onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
            <AuthField icon={Mail} label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" />
            <PasswordField value={password} onChange={setPassword} error={errors.password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />
            <PGHubButton type="submit" loading={submitting}>
              {mode === "signin" ? "Sign in with email" : "Sign up with email"}
            </PGHubButton>
            <p>
              {mode === "signin" ? (
                <>
                  Don’t have an account? <button type="button" onClick={() => switchMode("signup")}>Sign up</button>
                </>
              ) : (
                <>
                  Already have an account? <button type="button" onClick={() => switchMode("signin")}>Sign in</button>
                </>
              )}
            </p>
          </form>
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
