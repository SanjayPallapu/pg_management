import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StripeCheckoutOptions {
  plan: "manual" | "automatic";
  amount: number;
  onSuccess?: () => void;
  onFailure?: () => void;
}

export const useStripeCheckout = () => {
  const [isLoading, setIsLoading] = useState(false);

  const initiateCheckout = useCallback(
    async ({ plan, amount, onSuccess, onFailure }: StripeCheckoutOptions) => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Please sign in to continue");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
          body: {
            plan,
            amount,
            returnUrl: window.location.origin,
          },
        });

        if (error) {
          throw new Error(error?.message || "Failed to initiate payment");
        }

        if (!data?.url) {
          throw new Error("Failed to create checkout session");
        }

        // Redirect to Stripe Checkout
        window.location.href = data.url;
        onSuccess?.();
      } catch (err) {
        console.error("Stripe checkout error:", err);
        toast.error(err instanceof Error ? err.message : "Failed to initiate payment");
        setIsLoading(false);
        onFailure?.();
      }
    },
    []
  );

  return { initiateCheckout, isLoading };
};
