import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailPayload {
  type: "tenant_welcome" | "payment_confirmation" | "rent_reminder" | "account_auth";
  to: string;
  subject?: string;
  data: Record<string, any>;
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
    const { type, to, subject: customSubject, data = {} } = payload;

    if (!to) {
      return new Response(JSON.stringify({ error: "Recipient email ('to') is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = customSubject || "";
    let html = "";
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "PG HUB <onboarding@resend.dev>";

    switch (type) {
      case "tenant_welcome":
        subject = subject || `Welcome to ${data.pgName || "PG HUB"}!`;
        html = getWelcomeEmailHtml(data);
        break;

      case "payment_confirmation":
        subject = subject || `Rent Payment Receipt - ${data.monthYear || "PG HUB"}`;
        html = getPaymentConfirmationEmailHtml(data);
        break;

      case "rent_reminder":
        subject = subject || `Reminder: Rent Payment Due - ${data.pgName || "PG HUB"}`;
        html = getRentReminderEmailHtml(data);
        break;

      case "account_auth":
        subject = subject || `Verify your PG HUB account`;
        html = getAccountAuthEmailHtml(data);
        break;

      default:
        return new Response(JSON.stringify({ error: `Unsupported email type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const resendResponse = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (resendResponse.error) {
      console.error("[Resend Error]", resendResponse.error);
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
// Email HTML Templates
// ============================================================================

function getWelcomeEmailHtml(data: Record<string, any>): string {
  const { tenantName = "Tenant", pgName = "PG HUB", roomNo = "", onboardingUrl = "", ownerPhone = "" } = data;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Welcome to ${pgName}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0e6ce7 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
      .content { padding: 32px 24px; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
      .row:last-child { border-bottom: none; }
      .label { color: #64748b; font-weight: 500; }
      .value { color: #0f172a; font-weight: 700; }
      .btn { display: block; width: fit-content; margin: 28px auto 12px auto; background: #0e6ce7; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; text-align: center; }
      .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🏢 ${pgName}</h1>
        <p>Welcome to your new home!</p>
      </div>
      <div class="content">
        <p>Hi <strong>${tenantName}</strong>,</p>
        <p>We are excited to welcome you to <strong>${pgName}</strong>! Your room allocation details are set up below:</p>
        
        <div class="card">
          <div class="row"><span class="label">Tenant Name:</span><span class="value">${tenantName}</span></div>
          ${roomNo ? `<div class="row"><span class="label">Assigned Room:</span><span class="value">Room ${roomNo}</span></div>` : ""}
          <div class="row"><span class="label">Property:</span><span class="value">${pgName}</span></div>
          ${ownerPhone ? `<div class="row"><span class="label">Contact Owner:</span><span class="value">${ownerPhone}</span></div>` : ""}
        </div>

        ${
          onboardingUrl
            ? `<p>Please click the button below to complete your tenant profile and upload your Aadhaar ID proof:</p>
               <a href="${onboardingUrl}" class="btn">Complete Onboarding Profile →</a>`
            : `<p>If you have any questions, feel free to reach out to your PG owner.</p>`
        }
      </div>
      <div class="footer">
        Powered by PG HUB — Smart PG & Hostel Management<br>
        This is an automated email notification.
      </div>
    </div>
  </body>
  </html>
  `;
}

function getPaymentConfirmationEmailHtml(data: Record<string, any>): string {
  const { tenantName = "Tenant", amount = "0", monthYear = "", paymentDate = "", paymentMode = "UPI", receiptNo = "", pgName = "PG HUB" } = data;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Rent Payment Receipt</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
      .header p { margin: 8px 0 0 0; opacity: 0.95; font-size: 14px; }
      .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 10px; }
      .content { padding: 32px 24px; }
      .amount-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; text-align: center; padding: 20px; margin: 20px 0; }
      .amount-box span { font-size: 13px; color: #047857; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .amount-box h2 { margin: 4px 0 0 0; font-size: 32px; color: #065f46; font-weight: 900; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
      .row:last-child { border-bottom: none; }
      .label { color: #64748b; font-weight: 500; }
      .value { color: #0f172a; font-weight: 700; }
      .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>✓ Payment Received</h1>
        <p>Rent Receipt for ${monthYear}</p>
        <span class="badge">STATUS: PAID</span>
      </div>
      <div class="content">
        <p>Hi <strong>${tenantName}</strong>,</p>
        <p>Thank you! Your rent payment for <strong>${monthYear}</strong> at <strong>${pgName}</strong> has been successfully recorded.</p>
        
        <div class="amount-box">
          <span>Amount Paid</span>
          <h2>₹${Number(amount).toLocaleString("en-IN")}</h2>
        </div>

        <div class="card">
          <div class="row"><span class="label">Tenant Name:</span><span class="value">${tenantName}</span></div>
          <div class="row"><span class="label">Period:</span><span class="value">${monthYear}</span></div>
          <div class="row"><span class="label">Payment Mode:</span><span class="value">${paymentMode}</span></div>
          ${paymentDate ? `<div class="row"><span class="label">Date:</span><span class="value">${paymentDate}</span></div>` : ""}
          ${receiptNo ? `<div class="row"><span class="label">Receipt No:</span><span class="value">${receiptNo}</span></div>` : ""}
        </div>
      </div>
      <div class="footer">
        Powered by PG HUB — Smart PG & Hostel Management<br>
        Thank you for being a valued resident!
      </div>
    </div>
  </body>
  </html>
  `;
}

function getRentReminderEmailHtml(data: Record<string, any>): string {
  const { tenantName = "Tenant", dueAmount = "0", monthYear = "", dueDate = "", upiId = "", pgName = "PG HUB", roomNo = "" } = data;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Rent Payment Due Reminder</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
      .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
      .header p { margin: 8px 0 0 0; opacity: 0.95; font-size: 14px; }
      .content { padding: 32px 24px; }
      .due-box { background: #fffbebf1; border: 1px solid #fde68a; border-radius: 12px; text-align: center; padding: 20px; margin: 20px 0; }
      .due-box span { font-size: 13px; color: #b45309; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
      .due-box h2 { margin: 4px 0 0 0; font-size: 32px; color: #92400e; font-weight: 900; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
      .row:last-child { border-bottom: none; }
      .label { color: #64748b; font-weight: 500; }
      .value { color: #0f172a; font-weight: 700; }
      .upi-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px; text-align: center; margin: 20px 0; color: #1e40af; font-size: 14px; font-weight: 700; }
      .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🔔 Rent Payment Due Reminder</h1>
        <p>${pgName}</p>
      </div>
      <div class="content">
        <p>Hi <strong>${tenantName}</strong>,</p>
        <p>This is a gentle reminder that your monthly rent payment for <strong>${monthYear}</strong> is due.</p>
        
        <div class="due-box">
          <span>Total Balance Due</span>
          <h2>₹${Number(dueAmount).toLocaleString("en-IN")}</h2>
        </div>

        <div class="card">
          <div class="row"><span class="label">Tenant Name:</span><span class="value">${tenantName}</span></div>
          ${roomNo ? `<div class="row"><span class="label">Room:</span><span class="value">Room ${roomNo}</span></div>` : ""}
          <div class="row"><span class="label">Period:</span><span class="value">${monthYear}</span></div>
          ${dueDate ? `<div class="row"><span class="label">Due Date:</span><span class="value">${dueDate}</span></div>` : ""}
        </div>

        ${
          upiId
            ? `<div class="upi-box">
                💳 Pay via UPI ID: <span style="font-family: monospace; font-size: 16px; background: #dbeafe; padding: 2px 8px; border-radius: 4px;">${upiId}</span>
               </div>`
            : `<p>Please clear your pending dues at your earliest convenience. Thank you!</p>`
        }
      </div>
      <div class="footer">
        Powered by PG HUB — Smart PG & Hostel Management<br>
        Kindly ignore this reminder if you have already completed payment.
      </div>
    </div>
  </body>
  </html>
  `;
}

function getAccountAuthEmailHtml(data: Record<string, any>): string {
  const { userName = "User", otpCode = "", resetUrl = "", action = "verification" } = data;
  const isReset = action === "password_reset";
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${isReset ? "Reset Your Password" : "Verify Your Account"}</title>
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
        <p>${isReset ? "We received a request to reset your PG HUB account password." : "Use the security code below to complete your account verification:"}</p>
        
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
