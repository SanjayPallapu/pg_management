// Splash screen functionality restored
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
import NotFound from "./pages/NotFound";
import DayGuest from "./pages/DayGuest";
import LeftTenants from "./pages/LeftTenants";
import SplashScreen from "./components/SplashScreen";
import { MonthProvider } from "@/contexts/MonthContext";
import { PGProvider, usePG } from "@/contexts/PGContext";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Protected route component that wraps children with PGProvider
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !hasRole) {
    return <Navigate to="/auth" replace />;
  }

  return <PGProvider>{children}</PGProvider>;
};

const queryClient = new QueryClient();

// Component to provide PG context for splash screen
const SplashWithPGContext = ({ onComplete }: { onComplete: () => void }) => {
  const { currentPG, isLoading } = usePG();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem("hasSeenSplash", "true");
      onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  // While loading PG context, show default logo
  // Once loaded, show PG-specific logo if available
  if (isLoading) {
    return <SplashScreen />;
  }
  
  return <SplashScreen pgLogoUrl={currentPG?.logoUrl} pgName={currentPG?.name} />;
};

// Simple default splash for unauthenticated users
const DefaultSplash = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      sessionStorage.setItem("hasSeenSplash", "true");
      onComplete();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return <SplashScreen />;
};

// Wrapper to determine if we should show PG-branded splash (authenticated) or default splash
const AuthAwareSplash = ({ onComplete }: { onComplete: () => void }) => {
  const { isAuthenticated, hasRole, isLoading } = useAuth();
  
  // If still checking auth, show default splash
  if (isLoading) {
    return <DefaultSplash onComplete={onComplete} />;
  }
  
  // If authenticated with role, wrap in PGProvider to get PG branding
  if (isAuthenticated && hasRole) {
    return (
      <PGProvider>
        <SplashWithPGContext onComplete={onComplete} />
      </PGProvider>
    );
  }
  
  // Not authenticated - show default app splash
  return <DefaultSplash onComplete={onComplete} />;
};

// Inner app component that handles splash screen logic
const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("hasSeenSplash");
    const urlParams = new URLSearchParams(window.location.search);
    const forceSplash = urlParams.get('splash') === 'true';
    
    if (hasSeen && !forceSplash) {
      setShowSplash(false);
    }
  }, []);

  if (showSplash) {
    return (
      <AnimatePresence mode="wait">
        <AuthAwareSplash key="splash" onComplete={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  return (
    <MonthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
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
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
