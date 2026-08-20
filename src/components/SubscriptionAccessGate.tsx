import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { usePG } from "@/contexts/PGContext";
import { useAuth } from "@/hooks/useAuth";
import { getPhoneOtpTestSession } from "@/lib/phoneOtpTestMode";
import { getSubscriptionAccess } from "@/lib/subscriptionAccess";

export function SubscriptionAccessGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { subscription, isLoading } = usePG();
  const { isAdmin } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isTestSession = Boolean(getPhoneOtpTestSession()) ||
    (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK_AUTH === "true");
  const access = getSubscriptionAccess(subscription);
  const mayEnterApp = isAdmin || isTestSession || access.allowed;

  if (!mayEnterApp && location.pathname !== "/subscription") {
    return <Navigate to="/subscription" replace state={{ accessLocked: true }} />;
  }
  return <>{children}</>;
}
