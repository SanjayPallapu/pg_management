import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error("RAZORPAY_KEY_SECRET not configured");
    }

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify webhook signature
    if (signature) {
      const isValid = await verifySignature(body, signature, RAZORPAY_KEY_SECRET);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(body);
    const event = payload.event;

    console.log("Razorpay webhook event:", event);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const userId = payment.notes?.user_id;
      const plan = payment.notes?.plan;

      if (!userId) {
        console.error("No user_id in payment notes");
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Payment captured for user ${userId}, plan: ${plan}, order: ${orderId}`);

      // Update payment request status
      const { data: paymentRequests } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (paymentRequests && paymentRequests.length > 0) {
        await supabase
          .from("payment_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            notes: JSON.stringify({
              razorpay_order_id: orderId,
              razorpay_payment_id: payment.id,
              plan,
              auto_approved: true,
            }),
          })
          .eq("id", paymentRequests[0].id);
      }

      // Activate subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({
          plan: "pro",
          status: "active",
          max_pgs: -1,
          max_tenants_per_pg: -1,
          features: {
            auto_reminders: plan === "automatic",
            daily_reports: plan === "automatic",
            ai_logo: true,
          },
          payment_approved_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("user_id", userId);

      if (subError) {
        console.error("Error updating subscription:", subError);
        throw subError;
      }

      console.log(`Subscription activated for user ${userId}`);
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
