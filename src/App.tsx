import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PhoneLogin from "./pages/PhoneLogin";
import OTPVerification from "./pages/OTPVerification";
import PGSetupProperty from "./pages/PGSetupProperty";
import PGSetupCapacity from "./pages/PGSetupCapacity";
import SetupComplete from "./pages/SetupComplete";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import DayGuest from "./pages/DayGuest";
import LeftTenants from "./pages/LeftTenants";
import Legal from "./pages/Legal";
import { lazy, Suspense } from "react";
const CityVisualization = lazy(() => import("./pages/CityVisualization"));
const PublishGuide = lazy(() => import("./pages/PublishGuide"));
const Showcase = lazy(() => import("./pages/Showcase"));
const VoiceAgent = lazy(() => import("./pages/VoiceAgent"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
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

  if (shouldShowOnboardingAfterLogout()) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to={hasCompletedOnboarding() ? "/auth" : "/onboarding"} replace />;
  }

  return (
    <PGProvider>
      <RentProvider selectedMonth={selectedMonth} selectedYear={selectedYear}>
        {children}
      </RentProvider>
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
  useEffect(() => {
    // Configure native status bar behaviour at startup
    const initStatusBar = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: "#1769ff" });
          await StatusBar.setStyle({ style: Style.Dark });
        }
      } catch (e) {
        console.warn("[StatusBar] Failed to configure status bar:", e);
      }
    };
    initStatusBar();
  }, []);

  return (
    <MonthProvider>
    <ActiveTabProvider>
      <PGSetupDraftProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<PhoneLogin />} />
          <Route path="/auth/otp" element={<OTPVerification />} />
          <Route path="/auth/email" element={<Auth />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/landing" element={<Landing />} />
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
          <Route path="/setup/complete" element={
            <ProtectedRoute>
              <SetupComplete />
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
    <ThemeProvider defaultTheme="light" storageKey="pg-manager-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppErrorBoundary>
              <AppContent />
            </AppErrorBoundary>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
