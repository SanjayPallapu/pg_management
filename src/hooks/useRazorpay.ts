import { useState, useEffect, useCallback } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/proxyClient";
import { toast } from "sonner";
import type { SubscriptionPlanKey } from "@/types/pg";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

interface RazorpayCheckoutResponse {
  razorpay_payment_id?: string;
  razorpay_subscription_id?: string;
  razorpay_signature?: string;
}

interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
  };
}

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayCheckoutResponse) => void | Promise<void>;
  prefill: {
    email?: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayCheckoutInstance {
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
  open: () => void;
}

interface RazorpayOptions {
  plan: SubscriptionPlanKey;
  amount?: number;
  onSuccess: () => void;
  onFailure?: () => void;
}

const getFunctionErrorMessage = async (error: unknown, fallback: string) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return body?.error || body?.message || fallback;
    } catch {
      return error.message || fallback;
    }
  }

  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    if (document.getElementById("razorpay-script")) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  const initiatePayment = useCallback(
    async ({ plan, amount, onSuccess, onFailure }: RazorpayOptions) => {
      if (!scriptLoaded) {
        toast.error("Payment system is loading. Please try again.");
        return;
      }

      setIsLoading(true);
      try {
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Please sign in to continue");
          return;
        }

        // Create order via edge function
        const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
          body: { plan, amount },
        });

        if (error) {
          console.error("Edge function error:", error);
          throw new Error(await getFunctionErrorMessage(error, "Failed to initiate payment. Please try later"));
        }

        if (!data?.subscription_id) {
          console.error("Invalid response from edge function:", data);
          throw new Error("Failed to start subscription checkout. Please try again");
        }

        // Open Razorpay checkout
        const options = {
          key: data.key_id,
          subscription_id: data.subscription_id,
          name: "PG Manager",
          description: data.description,
          handler: async function (response: RazorpayCheckoutResponse) {
            try {
              const razorpaySubscriptionId = response.razorpay_subscription_id || data.subscription_id;
              const { data: syncData, error: syncError } = await supabase.functions.invoke("sync-razorpay-subscription", {
                body: {
                  plan,
                  razorpay_subscription_id: razorpaySubscriptionId,
                },
              });

              if (syncError || !syncData?.success) {
                throw new Error(syncError
                  ? await getFunctionErrorMessage(syncError, "Subscription authorization failed")
                  : syncData?.error || "Subscription authorization failed");
              }

              setIsLoading(false);
              onSuccess();
            } catch (syncErr) {
              console.error("Error syncing subscription:", syncErr);
              toast.error(syncErr instanceof Error ? syncErr.message : "Subscription authorization failed");
              setIsLoading(false);
              onFailure?.();
            }
          },
          prefill: {
            email: session.user.email,
          },
          theme: {
            color: "#7C85E8",
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              onFailure?.();
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", (response: RazorpayFailureResponse) => {
          console.error("Payment failed:", response.error);
          toast.error(response.error?.description || response.error?.reason || "Payment failed. Please try again.");
          setIsLoading(false);
          onFailure?.();
        });

        razorpay.open();
      } catch (err) {
        console.error("Error initiating payment:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to initiate payment. Please try later";
        toast.error(errorMessage);
        setIsLoading(false);
        onFailure?.();
      }
    },
    [scriptLoaded]
  );

  return { initiatePayment, isLoading, scriptLoaded };
};
