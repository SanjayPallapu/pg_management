import { supabase } from "@/integrations/supabase/proxyClient";
import { toast } from "sonner";

export interface AccountAuthEmailOptions {
  to: string;
  userName?: string;
  otpCode?: string;
  resetUrl?: string;
  action?: "signup_welcome" | "verification" | "password_reset";
}

/**
 * Sends Login / Sign Up / Password Reset emails via Supabase Edge Function securely
 * without dragging Node.js dependencies into the client browser bundle.
 */
export async function sendAccountAuthEmail(options: AccountAuthEmailOptions, showToast = false) {
  try {
    const { data: result, error } = await supabase.functions.invoke("send-email", {
      body: {
        type: "account_auth",
        to: options.to,
        subject:
          options.action === "password_reset"
            ? "Reset your PG HUB password"
            : options.action === "signup_welcome"
            ? "Welcome to PG HUB — Your Account is Ready"
            : "Verify your PG HUB account",
        data: options,
      },
    });

    if (error) {
      throw new Error(error.message || "Authentication email service is unavailable");
    }

    if (showToast) {
      toast.success(`Authentication email sent to ${options.to}`);
    }
    return { success: true, result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send auth email";
    console.error("[Auth Email Dispatch Error]", err);
    if (showToast) {
      toast.error(`Email error: ${errorMsg}`);
    }
    return { success: false, error: errorMsg };
  }
}
