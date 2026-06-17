import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Lock, User, Phone, MapPin, Eye, EyeOff, Building } from "lucide-react";
import { toast } from "sonner";
import appLogo from "@/assets/splash-uploaded-logo.png";

const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const signupSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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
  <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const { isAuthenticated, hasRole, isLoading, signIn, signUp, signInWithGoogle, signOut } = useAuth();
  
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

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const validateSignInForm = () => {
    try {
      authSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: {email?: string;password?: string;} = {};
        err.errors.forEach((e) => {
          if (e.path[0] === "email") newErrors.email = e.message;
          if (e.path[0] === "password") newErrors.password = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const validateSignUpForm = () => {
    try {
      signupSchema.parse({ email, password, fullName, phone, city });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: {email?: string;password?: string;fullName?: string;phone?: string;city?: string;} = {};
        err.errors.forEach((e) => {
          if (e.path[0] === "email") newErrors.email = e.message;
          if (e.path[0] === "password") newErrors.password = e.message;
          if (e.path[0] === "fullName") newErrors.fullName = e.message;
          if (e.path[0] === "phone") newErrors.phone = e.message;
          if (e.path[0] === "city") newErrors.city = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
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
        toast.success("Signed in successfully");
        navigate("/", { replace: true });
      }
    } catch {
      toast.error("Sign in failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignUpForm()) return;

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
      toast.success("Account created!");
      navigate("/", { replace: true });
    } else {
      setIsSubmitting(false);
      toast.success("Account created! You can now sign in.");
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePendingSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  if (isAuthenticated && !hasRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Workspace Setup Pending</CardTitle>
            <CardDescription>
              Your owner workspace is being created. Sign out and sign in again if this message stays visible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handlePendingSignOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background/90 to-primary/5 px-4 py-8">
      <Card className="w-full max-w-md border-primary/10 shadow-2xl overflow-hidden rounded-2xl">
        {/* Full-width premium Logo Header Banner */}
        <div className="w-full overflow-hidden bg-primary/[0.03] dark:bg-primary/[0.01] border-b border-border/40 py-10 flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
          <img 
            src={appLogo} 
            alt="PG Manager Logo" 
            className="h-20 w-auto object-contain max-w-[80%] drop-shadow-md hover:scale-102 transition-transform duration-300" 
            decoding="async" 
          />
        </div>

        <CardHeader className="text-center px-6 pb-2 pt-6">
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            PG Manager
          </CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
            Private workspace for every PG owner.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6 pt-4 space-y-6">
          {/* Unified prominent Google Button at the top */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 h-11 border-border/80 hover:bg-muted/50 transition-all font-semibold shadow-sm active:scale-[0.99]"
              onClick={handleGoogleAuth}
              disabled={isSubmitting || isGoogleSubmitting}
            >
              {isGoogleSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-card px-3 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                or email
              </span>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full space-y-4">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/60 rounded-xl h-11">
              <TabsTrigger value="signin" className="rounded-lg font-semibold text-xs sm:text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg font-semibold text-xs sm:text-sm">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-2">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9 h-11 rounded-lg border-border/80 focus-visible:ring-primary/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1 font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-9 pr-9 h-11 rounded-lg border-border/80 focus-visible:ring-primary/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1 font-medium">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full h-11 font-semibold rounded-lg text-sm transition-all active:scale-[0.99]" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-2">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="Your full name"
                      className="pl-9 h-11 rounded-lg border-border/80 focus-visible:ring-primary/20"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-destructive mt-1 font-medium">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="9876543210"
                      className="pl-9 h-11 rounded-lg border-border/80 focus-visible:ring-primary/20"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive mt-1 font-medium">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-city">City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="signup-city"
                      type="text"
                      placeholder="Your city"
                      className="pl-9 h-11 rounded-lg border-border/80 focus-visible:ring-primary/20"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.city && <p className="text-xs text-destructive mt-1 font-medium">{errors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-9 h-11 rounded-lg border-border/80 focus-visible:ring-primary/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting} 
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1 font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-9 pr-9 h-11 rounded-lg border-border/80 focus-visible:ring-primary/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1 font-medium">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full h-11 font-semibold rounded-lg text-sm transition-all active:scale-[0.99]" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <p className="rounded-xl bg-primary/[0.03] dark:bg-primary/[0.01] border border-primary/5 px-4 py-3 text-center text-xs text-muted-foreground leading-relaxed mt-4">
                  Every signup creates a separate owner workspace. Your PG, tenants, and payments stay private to your account.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border/30 pt-4">
            <Link to="/legal#privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/legal#terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/legal#refunds" className="hover:text-foreground transition-colors">Refunds</Link>
            <Link to="/legal#deletion" className="hover:text-foreground transition-colors">Delete account</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
