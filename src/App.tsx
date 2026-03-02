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
import SplashScreen from "./components/SplashScreen";
import { MonthProvider } from "@/contexts/MonthContext";
 import { PGProvider } from "@/contexts/PGContext";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Protected route component that wraps children with PGProvider
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, hasRole, isLoading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setTimedOut(true), 5000);
      return () => clearTimeout(timer);
    }
    setTimedOut(false);
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
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
     }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);
  
  return <SplashScreen />;
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
