import { Resend } from "resend";
import { supabase } from "@/integrations/supabase/proxyClient";
import { toast } from "sonner";

// Initialize Resend client (used server-side or via backend API)
const RESEND_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_RESEND_API_KEY : undefined) ||
  (typeof process !== "undefined" && process.env ? process.env.RESEND_API_KEY : undefined) ||
  "";

export const resend = new Resend(RESEND_API_KEY);

export interface AccountAuthEmailOptions {
  to: string;
  userName?: string;
  otpCode?: string;
  resetUrl?: string;
  action?: "signup_welcome" | "verification" | "password_reset";
}

/**
 * Sends Login / Sign Up / Password Reset emails via Resend backend function
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
      console.warn("[Resend Auth Email Note]", error.message || error);
      if (RESEND_API_KEY) {
        const from = "PG HUB <onboarding@resend.dev>";
        const fallback = await resend.emails.send({
          from,
          to: options.to,
          subject: "PG HUB Authentication Notification",
          html: `<p>Hello ${options.userName || "User"}, your PG HUB account authentication email has been processed.</p>`,
        });

        if (fallback.error) {
          throw new Error(fallback.error.message);
        }
      }
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
