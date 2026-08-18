import { Resend } from "resend";
import { supabase } from "@/integrations/supabase/proxyClient";
import { toast } from "sonner";

// Initialize Resend client (used server-side or via backend API)
const RESEND_API_KEY =
  (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_RESEND_API_KEY : undefined) ||
  (typeof process !== "undefined" && process.env ? process.env.RESEND_API_KEY : undefined) ||
  "";

export const resend = new Resend(RESEND_API_KEY);

export interface WelcomeEmailOptions {
  to: string;
  tenantName: string;
  pgName: string;
  roomNo?: string;
  onboardingUrl?: string;
  ownerPhone?: string;
}

export interface PaymentConfirmationEmailOptions {
  to: string;
  tenantName: string;
  amount: number | string;
  monthYear: string;
  paymentDate?: string;
  paymentMode?: string;
  receiptNo?: string;
  pgName?: string;
}

export interface RentReminderEmailOptions {
  to: string;
  tenantName: string;
  dueAmount: number | string;
  monthYear: string;
  dueDate?: string;
  upiId?: string;
  pgName?: string;
  roomNo?: string;
}

export interface AccountAuthEmailOptions {
  to: string;
  userName?: string;
  otpCode?: string;
  resetUrl?: string;
  action?: "verification" | "password_reset";
}

/**
 * Universal email dispatcher: Invokes the Supabase backend Edge Function 'send-email'
 * or uses Resend API directly.
 */
export async function sendEmail({
  type,
  to,
  subject,
  data,
  showToast = false,
}: {
  type: "tenant_welcome" | "payment_confirmation" | "rent_reminder" | "account_auth";
  to: string;
  subject?: string;
  data: Record<string, any>;
  showToast?: boolean;
}) {
  try {
    // Invoke Supabase Edge Function to dispatch securely from backend
    const { data: result, error } = await supabase.functions.invoke("send-email", {
      body: { type, to, subject, data },
    });

    if (error) {
      console.warn("[Resend Edge Function Note]", error.message || error);
      if (RESEND_API_KEY) {
        const from = "PG HUB <onboarding@resend.dev>";
        const fallback = await resend.emails.send({
          from,
          to,
          subject: subject || "PG HUB Notification",
          html: `<p>Notification for ${data.tenantName || data.userName || "User"}</p>`,
        });

        if (fallback.error) {
          throw new Error(fallback.error.message);
        }
      } else {
        throw new Error(error.message || "Failed to invoke send-email function");
      }
    }

    if (showToast) {
      toast.success(`Email sent to ${to}`);
    }
    return { success: true, result };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email";
    console.error("[Email Dispatch Error]", err);
    if (showToast) {
      toast.error(`Email error: ${errorMsg}`);
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * 1. Tenant Onboarding Welcome Email
 */
export async function sendTenantWelcomeEmail(options: WelcomeEmailOptions, showToast = true) {
  return sendEmail({
    type: "tenant_welcome",
    to: options.to,
    subject: `Welcome to ${options.pgName || "PG HUB"}!`,
    data: options,
    showToast,
  });
}

/**
 * 2. Rent Payment Confirmation Email
 */
export async function sendPaymentConfirmationEmail(options: PaymentConfirmationEmailOptions, showToast = true) {
  return sendEmail({
    type: "payment_confirmation",
    to: options.to,
    subject: `Rent Payment Receipt - ${options.monthYear || "PG HUB"}`,
    data: options,
    showToast,
  });
}

/**
 * 3. Rent Due Reminder Email
 */
export async function sendRentDueReminderEmail(options: RentReminderEmailOptions, showToast = true) {
  return sendEmail({
    type: "rent_reminder",
    to: options.to,
    subject: `Reminder: Rent Payment Due - ${options.pgName || "PG HUB"}`,
    data: options,
    showToast,
  });
}

/**
 * 4. Password Reset / Account Verification Email
 */
export async function sendAccountAuthEmail(options: AccountAuthEmailOptions, showToast = true) {
  return sendEmail({
    type: "account_auth",
    to: options.to,
    subject: options.action === "password_reset" ? "Reset your PG HUB password" : "Verify your PG HUB account",
    data: options,
    showToast,
  });
}
