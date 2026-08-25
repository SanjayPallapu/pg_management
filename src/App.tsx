import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import EmailAuth from "./pages/EmailAuth";
import PhoneLogin from "./pages/PhoneLogin";
import OTPVerification from "./pages/OTPVerification";
import PGSetupProperty from "./pages/PGSetupProperty";
import PGSetupCapacity from "./pages/PGSetupCapacity";
import PGSetupSubscription from "./pages/PGSetupSubscription";
import SetupComplete from "./pages/SetupComplete";
import PGOverview from "./pages/PGOverview";
import Landing from "./pages/Landing";
import PayFlowDemo from "./pages/PayFlowDemo";
import NotFound from "./pages/NotFound";
import DayGuest from "./pages/DayGuest";
import LeftTenants from "./pages/LeftTenants";
import Legal from "./pages/Legal";
import SubscriptionPage from "./pages/SubscriptionPage";
import AppMenuPage from "./pages/AppMenuPage";
import ReferralPage from "./pages/ReferralPage";
import TenantProfilePage from "./pages/TenantProfilePage";
import TenantProfilesPage from "./pages/TenantProfilesPage";
import { lazy, Suspense } from "react";
const CityVisualization = lazy(() => import("./pages/CityVisualization"));
const PublishGuide = lazy(() => import("./pages/PublishGuide"));
const Showcase = lazy(() => import("./pages/Showcase"));
const VoiceAgent = lazy(() => import("./pages/VoiceAgent"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const TenantOnboardingFormPage = lazy(() => import("./pages/TenantOnboardingFormPage"));
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { MonthProvider } from "@/contexts/MonthContext";
import { PGProvider } from "@/contexts/PGContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ActiveTabProvider } from "@/contexts/ActiveTabContext";
import { Loader2 } from "lucide-react";
import { PGSetupDraftProvider } from "@/features/pg-hub/PGSetupDraftContext";

import { RentProvider } from "./contexts/RentContext";
import { useMonthContext } from "./contexts/MonthContext";
import { hasCompletedOnboarding, shouldShowOnboardingAfterLogout } from "@/lib/onboardingState";
import { captureReferralCodeFromUrl, getReferralStats, validateAndApplyReferralCode } from "@/utils/referralHelper";
import { PlayStoreUpdateManager } from "@/components/PlayStoreUpdateManager";
import { SubscriptionAccessGate } from "@/components/SubscriptionAccessGate";

// Protected route component that wraps children with PGProvider and RentProvider
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { selectedMonth, selectedYear } = useMonthContext();

  // While still loading auth state, show spinner (max 1s due to useAuth's force timeout)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (shouldShowOnboardingAfterLogout()) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to={hasCompletedOnboarding() ? "/auth" : "/onboarding"} replace />;
  }

  return (
    <PGProvider>
      <SubscriptionAccessGate>
        <RentProvider selectedMonth={selectedMonth} selectedYear={selectedYear}>
          {children}
        </RentProvider>
      </SubscriptionAccessGate>
    </PGProvider>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 min default staleness
      gcTime: 15 * 60 * 1000,   // 15 min garbage collection
      refetchOnWindowFocus: false, // prevent refetch storms
      retry: 1,                   // single retry on failure
      refetchOnReconnect: true,
    },
  },
});

// Inner app component that handles startup behaviours
const AppContent = () => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const pendingCode = localStorage.getItem("applied_referral_code");
    if (!pendingCode) return;
    const attemptKey = `referral-attempted-${user.id}-${pendingCode}`;
    if (sessionStorage.getItem(attemptKey)) return;
    sessionStorage.setItem(attemptKey, "true");
    void getReferralStats()
      .then(stats => validateAndApplyReferralCode(pendingCode, stats.referralCode))
      .then(result => {
        if (!result.success) localStorage.removeItem("applied_referral_code");
      })
      .catch(() => sessionStorage.removeItem(attemptKey));
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    // Configure native status bar & hide splash screen at startup
    const initNativeUI = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: "#1769ff" });
          await StatusBar.setStyle({ style: Style.Dark });

          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide();
        }
      } catch (e) {
        console.warn("[NativeUI] Failed to configure status bar/splash:", e);
      }
    };
    initNativeUI();
  }, []);

  return (
    <MonthProvider>
      <PlayStoreUpdateManager />
      <ActiveTabProvider>
      <PGSetupDraftProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<PhoneLogin />} />
          <Route path="/auth/otp" element={<OTPVerification />} />
          <Route path="/auth/email" element={<EmailAuth />} />
          <Route path="/tenant-profile/:tenantId" element={
            <ProtectedRoute>
              <TenantProfilePage view="details" />
            </ProtectedRoute>
          } />
          <Route path="/tenant-profile/:tenantId/details" element={<ProtectedRoute><TenantProfilePage view="details" /></ProtectedRoute>} />
          <Route path="/tenant-profile/:tenantId/actions" element={<ProtectedRoute><TenantProfilePage view="actions" /></ProtectedRoute>} />
          <Route path="/tenant-profile/:tenantId/share" element={<ProtectedRoute><TenantProfilePage view="share" /></ProtectedRoute>} />
          <Route path="/tenant-profile/:tenantId/timeline" element={<ProtectedRoute><TenantProfilePage view="timeline" /></ProtectedRoute>} />
          <Route path="/tenant-profile/:tenantId/verify" element={<ProtectedRoute><TenantProfilePage view="verify" /></ProtectedRoute>} />
          <Route path="/tenant-profiles" element={<ProtectedRoute><TenantProfilesPage /></ProtectedRoute>} />
          <Route path="/tenant-onboarding/:token" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <TenantOnboardingFormPage />
            </Suspense>
          } />
          <Route path="/legal" element={<Legal />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/payflow" element={<PayFlowDemo />} />
          <Route path="/onboarding" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#070913]"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}>
              <Onboarding />
            </Suspense>
          } />
          <Route path="/publish-guide" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <PublishGuide />
            </Suspense>
          } />
          <Route path="/showcase" element={
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <Showcase />
            </Suspense>
          } />
          <Route path="/voice" element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <VoiceAgent />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          <Route path="/setup/property" element={
            <ProtectedRoute>
              <PGSetupProperty />
            </ProtectedRoute>
          } />
          <Route path="/setup/capacity" element={
            <ProtectedRoute>
              <PGSetupCapacity />
            </ProtectedRoute>
          } />
          <Route path="/setup/subscription" element={
            <ProtectedRoute>
              <PGSetupSubscription />
            </ProtectedRoute>
          } />
          <Route path="/setup/complete" element={
            <ProtectedRoute>
              <SetupComplete />
            </ProtectedRoute>
          } />
          <Route path="/pg/overview" element={
            <ProtectedRoute>
              <PGOverview />
            </ProtectedRoute>
          } />
          <Route path="/day-guest/:roomId" element={
            <ProtectedRoute>
              <DayGuest />
            </ProtectedRoute>
          } />
          <Route path="/left-tenants" element={
            <ProtectedRoute>
              <LeftTenants />
            </ProtectedRoute>
          } />
          <Route path="/subscription" element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          } />
          <Route path="/menu" element={
            <ProtectedRoute>
              <AppMenuPage />
            </ProtectedRoute>
          } />
          <Route path="/referrals" element={
            <ProtectedRoute>
              <ReferralPage />
            </ProtectedRoute>
          } />
          <Route path="/city" element={
            <ProtectedRoute>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <CityVisualization />
              </Suspense>
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </PGSetupDraftProvider>
      </ActiveTabProvider>
    </MonthProvider>
  );
};

const App = () => {
  return (
    <AppErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="pg-manager-theme">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
};

export default App;
