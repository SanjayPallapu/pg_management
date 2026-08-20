import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Authentication required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user?.email) return json({ error: "Authentication required" }, 401);

    const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : [];
    if (user.app_metadata?.provider !== "google" && !providers.includes("google")) {
      return json({ verified: true });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "status");
    const { data: record } = await admin
      .from("google_email_verifications")
      .select("verified_at, expires_at, resend_available_at, attempts, code_hash")
      .eq("user_id", user.id)
      .maybeSingle();

    if (record?.verified_at) return json({ verified: true, email: user.email });
    if (action === "status") return json({ verified: false, email: user.email });

    if (action === "send") {
      const now = Date.now();
      if (record?.resend_available_at && new Date(record.resend_available_at).getTime() > now) {
        const retryAfter = Math.ceil((new Date(record.resend_available_at).getTime() - now) / 1000);
        return json({ error: `Please wait ${retryAfter} seconds before resending.`, retryAfter }, 429);
      }

      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
      const pepper = Deno.env.get("EMAIL_OTP_PEPPER") || serviceKey;
      const codeHash = await sha256(`${user.id}:${code}:${pepper}`);
      const expiresAt = new Date(now + 15 * 60_000).toISOString();
      const resendAvailableAt = new Date(now + 60_000).toISOString();

      const { error: saveError } = await admin.from("google_email_verifications").upsert({
        user_id: user.id,
        email: user.email,
        code_hash: codeHash,
        expires_at: expiresAt,
        resend_available_at: resendAvailableAt,
        attempts: 0,
        verified_at: null,
        updated_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;

      const apiKey = Deno.env.get("RESEND_API_KEY");
      if (!apiKey) throw new Error("Email service is not configured");
      const resend = new Resend(apiKey);
      const sent = await resend.emails.send({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "PG HUB <no-reply@pghub.in>",
        to: user.email,
        subject: `${code} is your PG HUB confirmation code`,
        html: `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:32px auto;background:#fff;border-radius:18px;overflow:hidden"><div style="padding:28px;background:#0e6ce7;color:#fff;text-align:center"><h1 style="margin:0;font-size:24px">Confirm your PG HUB sign-in</h1></div><div style="padding:32px;text-align:center"><p>Enter this code in PG HUB to finish signing in as <strong>${user.email}</strong>.</p><div style="margin:26px auto;padding:18px;border:2px dashed #9db9e8;border-radius:14px;font-size:36px;font-weight:800;letter-spacing:9px;color:#0e6ce7">${code}</div><p style="font-size:13px;color:#667085">Valid for 15 minutes. Never share this code.</p></div></div></body></html>`,
      });
      if (sent.error) throw new Error(sent.error.message);
      return json({ sent: true, email: user.email, retryAfter: 60 });
    }

    if (action === "verify") {
      const code = String(body?.code || "").replace(/\D/g, "");
      if (!/^\d{6}$/.test(code)) return json({ error: "Enter the six-digit code." }, 400);
      if (!record?.code_hash || !record.expires_at) return json({ error: "Request a new code first." }, 400);
      if (new Date(record.expires_at).getTime() < Date.now()) return json({ error: "This code expired. Request a new one." }, 400);
      if ((record.attempts || 0) >= 5) return json({ error: "Too many attempts. Request a new code." }, 429);

      const pepper = Deno.env.get("EMAIL_OTP_PEPPER") || serviceKey;
      const candidate = await sha256(`${user.id}:${code}:${pepper}`);
      if (candidate !== record.code_hash) {
        await admin.from("google_email_verifications").update({
          attempts: (record.attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
        return json({ error: "Incorrect code. Please try again." }, 400);
      }

      const { error: verifyError } = await admin.from("google_email_verifications").update({
        verified_at: new Date().toISOString(),
        code_hash: null,
        expires_at: null,
        attempts: 0,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
      if (verifyError) throw verifyError;
      return json({ verified: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("google-email-verification error", error);
    return json({ error: error instanceof Error ? error.message : "Verification failed" }, 500);
  }
});
