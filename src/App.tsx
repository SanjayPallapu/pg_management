// Splash screen functionality restored
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DayGuest from "./pages/DayGuest";
import LeftTenants from "./pages/LeftTenants";
import SplashScreen from "./components/SplashScreen";
import { MonthProvider } from "@/contexts/MonthContext";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Protected route component
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

  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem("hasSeenSplash");
    const urlParams = new URLSearchParams(window.location.search);
    const forceSplash = urlParams.get('splash') === 'true';
    
    if (hasSeen && !forceSplash) {
      setShowSplash(false);
    } else {
      const timer = setTimeout(() => {
        sessionStorage.setItem("hasSeenSplash", "true");
        setShowSplash(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          {showSplash ? (
            <AnimatePresence mode="wait">
              <SplashScreen key="splash" />
            </AnimatePresence>
          ) : (
            <PropertyProvider>
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
            </PropertyProvider>
          )}
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
