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
import { Building2, Loader2 } from "lucide-react";
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
        // Navigate immediately after successful sign-in
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
      // Create profile after successful signup
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
      // Navigate to dashboard — onboarding wizard triggers via isNewSignup flag
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
      </div>);
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
              <Building2 className="h-6 w-6 text-primary" />
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
      </div>);

  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-6">
      <Card className="w-full max-w-md border-primary/20 shadow-lg shadow-primary/5">
        <CardHeader className="text-center px-6 pb-5 pt-6">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <img src={appLogo} alt="PG logo" className="h-16 w-16 object-contain" decoding="async" />
          </div>
          <CardTitle className="text-2xl">PG Management</CardTitle>
          <CardDescription className="text-sm font-medium">
            Private workspace for every PG owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting} />

                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting} />

                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ?
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </> :

                  "Sign In"
                  }
                </Button>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting || isGoogleSubmitting}
                >
                  {isGoogleSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold">G</span>
                  )}
                  Continue with Google
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                












                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Full Name</Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting} />

                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubmitting} />

                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-city">City</Label>
                  <Input
                    id="signup-city"
                    type="text"
                    placeholder="Your city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={isSubmitting} />

                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting} />

                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting} />

                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ?
                  <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </> :

                  "Create Account"
                  }
                </Button>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting || isGoogleSubmitting}
                >
                  {isGoogleSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold">G</span>
                  )}
                  Continue with Google
                </Button>
                <p className="rounded-lg bg-primary/5 px-3 py-2 text-center text-xs text-muted-foreground">
                  Every signup creates a separate owner workspace. Your PG, tenants, and payments stay private to your account.
                </p>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Link to="/legal#privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/legal#terms" className="hover:text-foreground">Terms</Link>
            <Link to="/legal#refunds" className="hover:text-foreground">Refunds</Link>
            <Link to="/legal#deletion" className="hover:text-foreground">Delete account</Link>
          </div>
        </CardContent>
      </Card>
    </div>);

};

export default Auth;
