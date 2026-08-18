import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailPayload {
  type: "account_auth";
  to: string;
  subject?: string;
  data: {
    userName?: string;
    otpCode?: string;
    resetUrl?: string;
    action?: "signup_welcome" | "verification" | "password_reset";
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY environment variable is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(apiKey);
    const payload: SendEmailPayload = await req.json();
    const { to, subject: customSubject, data = {} } = payload;

    if (!to) {
      return new Response(JSON.stringify({ error: "Recipient email ('to') is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const action = data.action || "verification";
    const subject =
      customSubject ||
      (action === "password_reset"
        ? "Reset your PG HUB password"
        : action === "signup_welcome"
        ? "Welcome to PG HUB — Account Confirmation"
        : "Verify your PG HUB account");

    const html = getAccountAuthEmailHtml(data);
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "PG HUB <onboarding@resend.dev>";

    const resendResponse = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (resendResponse.error) {
      console.error("[Resend Auth Email Error]", resendResponse.error);
      return new Response(JSON.stringify({ error: resendResponse.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: resendResponse.data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Send Email Exception]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// ============================================================================
// Auth & Login / Sign Up Email HTML Template
// ============================================================================

function getAccountAuthEmailHtml(data: Record<string, any>): string {
  const { userName = "Owner", otpCode = "", resetUrl = "", action = "verification" } = data;
  const isReset = action === "password_reset";
  const isWelcome = action === "signup_welcome";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${isReset ? "Reset Your Password" : isWelcome ? "Welcome to PG HUB" : "Verify Your Account"}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0e6ce7 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
      .content { padding: 32px 24px; text-align: center; }
      .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; display: inline-block; width: 80%; }
      .otp-code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0e6ce7; }
      .btn { display: inline-block; background: #0e6ce7; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-top: 16px; }
      .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🔒 PG HUB Security</h1>
      </div>
      <div class="content">
        <p>Hi <strong>${userName}</strong>,</p>
        
        ${
          isWelcome
            ? `<p>Welcome to <strong>PG HUB</strong>! Your account sign up was successful. You can now manage your PG properties, rooms, and tenant records seamlessly.</p>`
            : isReset
            ? `<p>We received a request to reset your PG HUB account password.</p>`
            : `<p>Use the security code below to complete your account login / sign up verification:</p>`
        }

        ${
          otpCode
            ? `<div class="otp-box"><div class="otp-code">${otpCode}</div></div><p style="font-size: 12px; color: #64748b;">This code is valid for 15 minutes. Do not share it with anyone.</p>`
            : ""
        }

        ${
          resetUrl
            ? `<a href="${resetUrl}" class="btn">Reset My Password →</a>`
            : ""
        }
      </div>
      <div class="footer">
        Powered by PG HUB — Smart PG & Hostel Management<br>
        If you did not request this email, you can safely ignore it.
      </div>
    </div>
  </body>
  </html>
  `;
}
