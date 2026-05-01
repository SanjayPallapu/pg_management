 import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import DayGuest from "./pages/DayGuest";
import LeftTenants from "./pages/LeftTenants";
import { lazy, Suspense } from "react";
const CityVisualization = lazy(() => import("./pages/CityVisualization"));
import SplashScreen from "./components/SplashScreen";
import { MonthProvider } from "@/contexts/MonthContext";
import { PGProvider } from "@/contexts/PGContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Protected route component that wraps children with PGProvider
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, hasRole, isLoading } = useAuth();

  // While still loading auth state, show spinner (max 1s due to useAuth's force timeout)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <PGProvider>{children}</PGProvider>;
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

 // Simple splash handler
 const SplashHandler = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem("hasSeenSplash", "true");
      onComplete();
     }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return <SplashScreen />;
};

// Inner app component that handles splash screen logic
const AppContent = () => {
  // Initialize synchronously so we never flash splash for returning users
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const hasSeen = sessionStorage.getItem("hasSeenSplash");
      const urlParams = new URLSearchParams(window.location.search);
      const forceSplash = urlParams.get('splash') === 'true';
      return forceSplash || !hasSeen;
    } catch {
      return false;
    }
  });

  // Safety net: ALWAYS dismiss splash after 3s, no matter what.
  // Also dismiss immediately when the app comes back from background — users
  // resuming the app should never see the splash again.
  useEffect(() => {
    if (!showSplash) return;
    const hardTimer = setTimeout(() => {
      sessionStorage.setItem("hasSeenSplash", "true");
      setShowSplash(false);
    }, 3000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        sessionStorage.setItem("hasSeenSplash", "true");
        setShowSplash(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(hardTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [showSplash]);

  if (showSplash) {
    return (
      <AnimatePresence mode="wait">
         <SplashHandler key="splash" onComplete={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  return (
    <MonthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
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
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
