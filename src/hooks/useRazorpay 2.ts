import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/proxyClient";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  plan: "manual" | "automatic";
  amount: number;
  onSuccess: () => void;
  onFailure?: () => void;
}

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
          throw new Error(error?.message || "Failed to initiate payment. Please try later");
        }

        if (!data?.order_id) {
          console.error("Invalid response from edge function:", data);
          throw new Error("Failed to create payment order. Please try again");
        }

        // Open Razorpay checkout
        const options = {
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: "PG Manager",
          description: `${plan === "automatic" ? "Automatic" : "Manual"} Plan - Monthly`,
          order_id: data.order_id,
          handler: function () {
            toast.success("Payment successful! Activating your subscription...");
            onSuccess();
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
        razorpay.on("payment.failed", (response: any) => {
          console.error("Payment failed:", response.error);
          toast.error("Payment failed. Please try again.");
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
