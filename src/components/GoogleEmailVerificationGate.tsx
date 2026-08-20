import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";

export function GoogleEmailVerificationGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<"checking" | "verified" | "required">("checking");
  const providers = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [];
  const usesGoogle = user?.app_metadata?.provider === "google" || providers.includes("google");

  useEffect(() => {
    let active = true;
    if (!usesGoogle) {
      setState("verified");
      return () => { active = false; };
    }

    supabase.functions.invoke("google-email-verification", { body: { action: "status" } })
      .then(({ data, error }) => {
        if (!active) return;
        setState(!error && data?.verified === true ? "verified" : "required");
      });
    return () => { active = false; };
  }, [user?.id, usesGoogle]);

  if (state === "checking") {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (state === "required") return <Navigate to="/auth/confirm-email" replace />;
  return <>{children}</>;
}
