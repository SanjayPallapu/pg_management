import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import journeyBuilding from "@/assets/pg-hub/journey-building-transparent.png";
import pgHubLogo from "@/assets/pg-hub/pg-hub-logo.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { useAuth } from "@/hooks/useAuth";
import { completeOnboarding } from "@/lib/onboardingState";
import {
  isPhoneOtpTestModeEnabled,
  startPhoneOtpTestChallenge,
} from "@/lib/phoneOtpTestMode";

export default function PhoneLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, requestPhoneOtp, signIn, signInWithGoogle } = useAuth();
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const digits = useMemo(() => phone.replace(/\D/g, "").slice(0, 10), [phone]);
  const valid = digits.length === 10;

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const continueWithOtp = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const fullPhone = `+91${digits}`;

    if (isPhoneOtpTestModeEnabled() && startPhoneOtpTestChallenge(fullPhone)) {
      sessionStorage.setItem("pghOtpPhone", fullPhone);
      setSubmitting(false);
      toast.info("OTP test mode is active. Use 123456.");
      navigate("/auth/otp");
      return;
    }

    const { error } = await requestPhoneOtp(fullPhone);
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not send OTP. Try email sign in instead.");
      return;
    }
    sessionStorage.setItem("pghOtpPhone", fullPhone);
    navigate("/auth/otp");
  };

  const continueWithEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setEmailError("Password must be at least 6 characters.");
      return;
    }
    setEmailError("");
    setSubmitting(true);
    const { error } = await signIn(cleanEmail, password);
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("Invalid login credentials") ? "Invalid email or password." : error.message);
      return;
    }
    completeOnboarding();
    window.location.replace("/");
  };

  const continueWithGoogle = async () => {
    setGoogleSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleSubmitting(false);
      const unsupported = error.message.toLowerCase().includes("unsupported provider");
      toast.error(unsupported ? "Google sign-in is not enabled yet. Use email or phone sign-in." : error.message);
    }
  };

  const [animKey, setAnimKey] = useState(0);

  const handleTabSwitch = (method: "phone" | "email") => {
    setAuthMethod(method);
    setAnimKey((prev) => prev + 1);
  };

  return (
    <PGHubShell variant="light" className="pgh-login min-h-dvh w-full bg-slate-50 flex flex-col items-center justify-center overflow-y-auto pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-6 transition-all duration-300">
      {/* Single Unified Content Group Centered Vertically */}
      <div className="w-full max-w-sm mx-auto my-auto flex flex-col items-center text-center py-4">
        
        {/* Header section — Clean Full Image Logo Left Beside Title + Animated PG HUB Text on Tab Switch */}
        <div className="flex flex-col items-center justify-center w-full mb-[24px]">
          <div className="flex items-center justify-center gap-3.5 mb-[10px]">
            <img src={pgHubLogo} alt="PG HUB" className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-2xl drop-shadow-sm shrink-0" />
            <h1 key={animKey} className="text-4xl sm:text-5xl font-black tracking-tight text-[#8b5cf6] m-0 animate-pghub-title-pulse">
              PG HUB
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-semibold tracking-wide m-0">
            Smart PG & Hostel Management
          </p>
        </div>

        {/* Tab Switcher — Fixed position directly below header */}
        <div className="pgh-login__method-switch w-full mb-[24px]" role="tablist" aria-label="Sign-in method">
          <button 
            type="button" 
            role="tab" 
            aria-selected={authMethod === "phone"} 
            className={authMethod === "phone" ? "is-active" : ""} 
            onClick={() => handleTabSwitch("phone")}
          >
            Mobile
          </button>
          <button 
            type="button" 
            role="tab" 
            aria-selected={authMethod === "email"} 
            className={authMethod === "email" ? "is-active" : ""} 
            onClick={() => handleTabSwitch("email")}
          >
            Email
          </button>
        </div>

        {/* Authentication Form Container — Expands smoothly for Email tab while maintaining perfect centering */}
        <div className="w-full flex flex-col items-center text-center relative transition-all duration-300">
          <div key={authMethod} className="w-full flex flex-col items-center animate-pghub-tab-slide">
            {authMethod === "phone" ? (
              <div className="w-full flex flex-col items-center">
                {/* Field */}
                <div className={`pgh-phone-field w-full ${valid ? "is-valid" : ""}`}>
                  <span className="pgh-phone-field__country">+91 <ChevronDown size={18} /></span>
                  <span className="pgh-phone-field__divider" />
                  <input 
                    id="phone" 
                    value={digits} 
                    onChange={(event) => setPhone(event.target.value)} 
                    inputMode="numeric" 
                    autoComplete="tel-national" 
                    placeholder="10-digit number" 
                    aria-label="Mobile number" 
                    aria-describedby="phone-help" 
                  />
                </div>

                {/* Button */}
                <PGHubButton 
                  onClick={continueWithOtp} 
                  disabled={!valid} 
                  loading={submitting} 
                  className="w-full h-12 mt-[24px] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 font-bold text-white shadow-lg shadow-blue-600/20 active:scale-98 transition-all"
                >
                  Continue with OTP
                </PGHubButton>

                {/* Footer text */}
                <div className="w-full mt-[28px] flex flex-col items-center gap-2">
                  <div className="pgh-trust"><span /><i><ShieldCheck size={22} /></i><span /></div>
                  <p id="phone-help" className="pgh-login__alternative text-center text-xs text-slate-500 m-0">
                    Secure OTP verification. No password required.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center">
                <button 
                  type="button" 
                  className="pgh-google-button w-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold shadow-sm rounded-2xl" 
                  onClick={continueWithGoogle} 
                  disabled={submitting || googleSubmitting}
                >
                  {googleSubmitting ? <Loader2 className="pgh-spin" size={19} /> : <GoogleIcon />} Continue with Google
                </button>

                <div className="pgh-auth-divider my-4 w-full"><span />or use email<span /></div>

                <form className="pgh-login__email-form w-full flex flex-col gap-[16px] text-left" onSubmit={continueWithEmail}>
                  <label className="pgh-auth-field m-0">
                    <span className="text-slate-700 font-medium">Email</span>
                    <div><Mail size={18} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" /></div>
                  </label>
                  <label className="pgh-auth-field m-0">
                    <span className="text-slate-700 font-medium">Password</span>
                    <div><Lock size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                  </label>
                  {emailError && <small className="pgh-login__error">{emailError}</small>}

                  <PGHubButton 
                    type="submit" 
                    loading={submitting} 
                    className="w-full h-12 mt-[24px] rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 font-bold text-white shadow-lg shadow-blue-600/20 active:scale-98 transition-all"
                  >
                    Sign in with email
                  </PGHubButton>
                </form>

                <p className="pgh-login__alternative text-center text-xs text-slate-500 mt-[28px] m-0">
                  Your account details stay encrypted and protected.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PGHubShell>
  );
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.56c2.09-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" fill="#34A853" />
    <path d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.58 10.58 0 0 0 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84A6.49 6.49 0 0 1 12 5.38Z" fill="#EA4335" />
  </svg>
);
