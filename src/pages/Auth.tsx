import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail, Lock, User, Phone, MapPin, Eye, EyeOff, Building, ChevronLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import appLogo from "@/assets/splash-uploaded-logo.png";
import { gsap } from "gsap";

const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const signupStep1Schema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const signupStep2Schema = z.object({
  fullName: z.string().min(2, "Please enter your name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  city: z.string().min(2, "Please enter your city")
});

const getGoogleAuthErrorMessage = (message: string) => {
  let readableMessage = message;

  try {
    const parsed = JSON.parse(message);
    readableMessage = parsed?.msg || parsed?.message || parsed?.error_description || message;
  } catch {
    readableMessage = message;
  }

  const normalized = readableMessage.toLowerCase();
  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "Google login is not enabled in this Supabase project. Enable the Google provider in Supabase Auth settings, then try again.";
  }
  return readableMessage || "Google login failed. Please try email sign in.";
};

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="h-4 w-4 shrink-0 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.1.08 2.16-.52 2.82-1.33"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole, isLoading, signIn, signUp, signInWithGoogle, signOut } = useAuth();
  
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
    city?: string;
  }>({});

  // GSAP animation references
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);
  const logoTextRef = useRef<HTMLHeadingElement>(null);

  // Initial load entry animation
  useEffect(() => {
    if (isLoading) return;

    // Respect reduced-motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Soft entrance for the card and background
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 20, scale: 0.99 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out", delay: 0.1 }
    );
  }, [isLoading]);

  // Stagger-bounce character animation on title load or change
  useEffect(() => {
    if (isLoading) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    if (logoTextRef.current) {
      const chars = logoTextRef.current.querySelectorAll(".char");
      gsap.fromTo(
        chars,
        { opacity: 0, y: 15, scale: 0.7, rotateX: -35 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          rotateX: 0, 
          duration: 0.55, 
          stagger: 0.025, 
          ease: "back.out(2)", 
          delay: 0.15 
        }
      );
    }
  }, [mode, signupStep, isLoading]);

  // Mode transitions (Sign In <-> Sign Up)
  const handleModeChange = (newMode: "signin" | "signup") => {
    if (newMode === mode) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setMode(newMode);
      setSignupStep(1);
      setErrors({});
      return;
    }

    // GSAP Cross-fade & horizontal slide on mode toggle
    const tl = gsap.timeline({
      onComplete: () => {
        setMode(newMode);
        setSignupStep(1);
        setErrors({});
        // Animate new form in
        gsap.fromTo(
          formSectionRef.current,
          { opacity: 0, x: newMode === "signup" ? 30 : -30 },
          { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
        );
      }
    });

    tl.to(formSectionRef.current, {
      opacity: 0,
      x: newMode === "signup" ? -30 : 30,
      duration: 0.25,
      ease: "power2.in"
    });
  };

  // Step transitions (Sign Up Step 1 <-> Step 2)
  const handleSignUpStepContinue = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      signupStep1Schema.parse({ email, password });
      setErrors({});

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        setSignupStep(2);
        return;
      }

      // Slide Step 1 out to the left, bring Step 2 in from the right
      gsap.to(formSectionRef.current, {
        opacity: 0,
        x: -40,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => {
          setSignupStep(2);
          gsap.fromTo(
            formSectionRef.current,
            { opacity: 0, x: 40 },
            { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }
          );
        }
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: { email?: string; password?: string } = {};
        err.errors.forEach((e) => {
          if (e.path[0] === "email") newErrors.email = e.message;
          if (e.path[0] === "password") newErrors.password = e.message;
        });
        setErrors(newErrors);
      }
    }
  };

  const handleSignUpStepBack = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setSignupStep(1);
      return;
    }

    // Slide Step 2 out to the right, bring Step 1 in from the left
    gsap.to(formSectionRef.current, {
      opacity: 0,
      x: 40,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        setSignupStep(1);
        gsap.fromTo(
          formSectionRef.current,
          { opacity: 0, x: -40 },
          { opacity: 1, x: 0, duration: 0.35, ease: "power2.out" }
        );
      }
    });
  };

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate("/", { replace: true });
      } else {
        const hasCompleted = localStorage.getItem("hasCompletedOnboarding") === "true";
        if (!hasCompleted) {
          navigate("/onboarding", { replace: true });
        }
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  const validateSignInForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: { email?: string; password?: string } = {};
        err.errors.forEach((e) => {
          if (e.path[0] === "email") newErrors.email = e.message;
          if (e.path[0] === "password") newErrors.password = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateSignUpFormComplete = () => {
    try {
      signupStep2Schema.parse({ fullName, phone, city });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: { fullName?: string; phone?: string; city?: string } = {};
        err.errors.forEach((e) => {
          if (e.path[0] === "fullName") newErrors.fullName = e.message;
          if (e.path[0] === "phone") newErrors.phone = e.message;
          if (e.path[0] === "city") newErrors.city = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignInForm()) return;

    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        setIsSubmitting(false);
      } else {
        navigate("/", { replace: true });
      }
    } catch {
      toast.error("Sign in failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignUpFormComplete()) return;

    setIsSubmitting(true);
    const { error, data } = await signUp(email, password);

    if (error) {
      setIsSubmitting(false);
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please sign in instead.");
      } else {
        toast.error(error.message);
      }
    } else if (data?.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        full_name: fullName,
        phone: phone,
        city: city,
        is_new_signup: true
      });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }
      setIsSubmitting(false);
      navigate("/", { replace: true });
    } else {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsGoogleSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setIsGoogleSubmitting(false);
      toast.error(getGoogleAuthErrorMessage(error.message));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070913]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const handlePendingSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  if (isAuthenticated && !hasRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070913] p-4">
        <Card className="w-full max-w-md border-white/[0.08] bg-black/40 backdrop-blur-2xl text-white">
          <div className="text-center px-6 py-10 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
              <Building className="h-7 w-7 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Workspace Setup Pending</h3>
            <p className="text-sm text-gray-400">
              Your owner workspace is being created. Sign out and sign in again if this message stays visible.
            </p>
            <Button variant="outline" className="w-full h-11 border-white/10 hover:bg-white/5 text-white" onClick={handlePendingSignOut}>
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div ref={pageContainerRef} className="relative h-[100dvh] w-full flex items-center justify-center bg-[#070913] overflow-hidden px-4">
      {/* Floating glowing background blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#1d2d5f] to-transparent opacity-50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#121c3b] to-transparent opacity-40 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-[#18214d]/20 blur-[90px] pointer-events-none" />

      {/* Main centered content container (no full-height stretch, perfectly centered vertically) */}
      <div ref={cardRef} className="w-full max-w-md flex flex-col justify-center py-6 px-2 relative z-10 overflow-hidden">
        <div className="space-y-6">
          {/* Animated Header titles for both Sign In and Sign Up */}
          <div className="text-center pb-2">
            {mode === "signin" ? (
              <div className="flex flex-col items-center justify-center pt-2">
                <h2 ref={logoTextRef} className="text-4xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent flex justify-center gap-[1px] select-none perspective-[1000px]">
                  {"PG Manager".split("").map((char, index) => (
                    <span 
                      key={index} 
                      className="char inline-block origin-bottom will-change-transform"
                      style={{ width: char === " " ? "0.25em" : "auto" }}
                    >
                      {char}
                    </span>
                  ))}
                </h2>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 ref={logoTextRef} className="text-4xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent flex justify-center gap-[1px] select-none perspective-[1000px]">
                  {"Create an Account".split("").map((char, index) => (
                    <span 
                      key={index} 
                      className="char inline-block origin-bottom will-change-transform"
                      style={{ width: char === " " ? "0.25em" : "auto" }}
                    >
                      {char}
                    </span>
                  ))}
                </h2>
                <p className="text-sm text-gray-400">
                  To create an account, enter details.
                </p>
              </div>
            )}
          </div>

          {/* Social Sign-In: side-by-side dark glassmorphic buttons */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white font-medium gap-2 transition-all active:scale-[0.98] shadow-sm shadow-black/20"
                onClick={handleGoogleAuth}
                disabled={isSubmitting || isGoogleSubmitting}
              >
                {isGoogleSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <GoogleIcon />
                )}
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white font-medium gap-2 transition-all active:scale-[0.98] shadow-sm shadow-black/20"
                onClick={() => {}}
                disabled={isSubmitting}
              >
                <AppleIcon />
                Apple
              </Button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/[0.08]" />
              </div>
              <span className="relative bg-[#070913] px-3 text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                Or
              </span>
            </div>
          </div>

          {/* Form container with GSAP animated section */}
          <div ref={formSectionRef} className="will-change-transform px-1">
            
            {/* SIGN IN VIEW */}
            {mode === "signin" && (
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-gray-300 text-xs font-semibold">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Email address"
                      className="pl-10 h-11 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-gray-600 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400 font-medium mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="signin-password" className="text-gray-300 text-xs font-semibold">Password</Label>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="pl-10 pr-10 h-11 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-gray-600 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-500 hover:text-gray-300 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400 font-medium mt-1">{errors.password}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-[#4f8eff] to-[#3a76e8] hover:from-[#609aff] hover:to-[#4a84fa] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      Signing in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>

                <div className="text-center pt-2 text-sm text-gray-400">
                  Create an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleModeChange("signup")}
                    className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            )}

            {/* SIGN UP VIEW - STEP 1 (Email / Password) */}
            {mode === "signup" && signupStep === 1 && (
              <form onSubmit={handleSignUpStepContinue} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-gray-300 text-xs font-semibold">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Email address"
                      className="pl-10 h-11 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-gray-600 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-400 font-medium mt-1">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-gray-300 text-xs font-semibold">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      className="pl-10 pr-10 h-11 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-gray-600 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-gray-500 hover:text-gray-300 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400 font-medium mt-1">{errors.password}</p>}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-[#4f8eff] to-[#3a76e8] hover:from-[#609aff] hover:to-[#4a84fa] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="text-center pt-2 text-sm text-gray-400">
                  Have an account?{" "}
                  <button
                    type="button"
                    onClick={() => handleModeChange("signin")}
                    className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors"
                  >
                    Log In
                  </button>
                </div>
              </form>
            )}

            {/* SIGN UP VIEW - STEP 2 (Profile Details) */}
            {mode === "signup" && signupStep === 2 && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-fullname" className="text-gray-300 text-xs font-semibold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="Your full name"
                      className="pl-10 h-11 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-gray-600 transition-all"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-red-400 font-medium mt-1">{errors.fullName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone" className="text-gray-300 text-xs font-semibold">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="9876543210"
                      className="pl-10 h-11 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-gray-600 transition-all"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-400 font-medium mt-1">{errors.phone}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-city" className="text-gray-300 text-xs font-semibold">City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="signup-city"
                      type="text"
                      placeholder="Your city"
                      className="pl-10 h-11 bg-white/[0.02] border-white/10 text-white rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 placeholder:text-gray-600 transition-all"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.city && <p className="text-xs text-red-400 font-medium mt-1">{errors.city}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    className="flex-1 h-11 border-white/10 bg-white/[0.01] hover:bg-white/[0.05] text-white rounded-xl font-medium gap-1.5"
                    onClick={handleSignUpStepBack}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                  
                  <Button 
                    type="submit" 
                    className="flex-[2] h-11 bg-gradient-to-r from-[#4f8eff] to-[#3a76e8] hover:from-[#609aff] hover:to-[#4a84fa] text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                        Creating...
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </div>

                <p className="rounded-xl bg-white/[0.01] border border-white/[0.04] px-4 py-3 text-center text-xs text-gray-400 leading-relaxed mt-4">
                  Every signup creates a separate owner workspace. Your PG, tenants, and payments stay private to your account.
                </p>
              </form>
            )}

          </div>

        </div>

        {/* Legal footer links */}
        <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-white/[0.06] pt-4">
          <Link to="/legal#privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
          <Link to="/legal#terms" className="hover:text-gray-300 transition-colors">Terms</Link>
          <Link to="/legal#refunds" className="hover:text-gray-300 transition-colors">Refunds</Link>
          <Link to="/legal#deletion" className="hover:text-gray-300 transition-colors">Delete account</Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
