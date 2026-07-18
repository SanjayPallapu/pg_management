import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PremiumOnboarding } from "@/components/pg/PremiumOnboarding";

const Onboarding = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate("/", { replace: true });
    } else {
      const hasCompleted = localStorage.getItem("hasCompletedOnboarding") === "true";
      if (hasCompleted) {
        navigate("/auth", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasCompletedOnboarding", "true");
    navigate("/auth", { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return <PremiumOnboarding onComplete={handleOnboardingComplete} />;
};

export default Onboarding;
