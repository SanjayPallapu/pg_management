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

type PlanKey = "monthly" | "quarterly" | "yearly";

const TRIAL_DAYS = 30;
const PAID_PLANS = new Set<PlanKey>(["monthly", "quarterly", "yearly"]);

const getPlanDurationDays = (plan: PlanKey) => {
  if (plan === "yearly") return 365;
  if (plan === "quarterly") return 90;
  return 30;
};

const getFutureIso = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

async function fetchRazorpaySubscription(subscriptionId: string) {
  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return null;

  const credentials = btoa(`${keyId}:${keySecret}`);
  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

function getSubscriptionContext(entity: any): { userId?: string; plan?: PlanKey; subscriptionId?: string; status?: string } {
  const plan = entity?.notes?.plan_key;
  return {
    userId: entity?.notes?.user_id,
    plan: PAID_PLANS.has(plan) ? plan : undefined,
    subscriptionId: entity?.id,
    status: entity?.status,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Razorpay signs webhooks with a separate webhook secret (configured in
    // Razorpay Dashboard → Webhooks). Fall back to the key secret only as a
    // last resort to avoid breaking older configs.
    const RAZORPAY_WEBHOOK_SECRET =
      Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_WEBHOOK_SECRET) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET not configured");
    }

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify webhook signature
    if (signature) {
      const isValid = await verifySignature(body, signature, RAZORPAY_WEBHOOK_SECRET);
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

    if (event === "subscription.authenticated" || event === "subscription.activated") {
      const subscription = payload.payload.subscription.entity;
      const { userId, plan, subscriptionId, status } = getSubscriptionContext(subscription);

      if (!userId || !plan || !subscriptionId) {
        console.error("Missing subscription notes for event", event);
        return new Response(JSON.stringify({ error: "Missing subscription notes" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date().toISOString();
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: userId,
            plan: "pro",
            status: "active",
            max_pgs: -1,
            max_tenants_per_pg: -1,
            features: {
              auto_reminders: true,
              daily_reports: true,
              ai_logo: true,
              billing_cycle: "trial",
              next_billing_cycle: plan,
              razorpay_subscription_id: subscriptionId,
              razorpay_status: status || event.replace("subscription.", ""),
            },
            payment_approved_at: now,
            expires_at: getFutureIso(TRIAL_DAYS),
          },
          { onConflict: "user_id" },
        );

      if (subError) throw subError;

      await supabase
        .from("payment_requests")
        .update({
          status: "authenticated",
          reviewed_at: now,
          notes: JSON.stringify({
            razorpay_subscription_id: subscriptionId,
            billing_cycle: plan,
            trial_days: TRIAL_DAYS,
            razorpay_status: status || event.replace("subscription.", ""),
          }),
        })
        .eq("user_id", userId)
        .eq("status", "pending");

      console.log(`Trial activated for user ${userId}, next billing cycle: ${plan}`);
    }

    if (event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const orderId = payment.order_id;
      const subscriptionId = payment.subscription_id;
      const subscription = subscriptionId ? await fetchRazorpaySubscription(subscriptionId) : null;
      const context = subscription ? getSubscriptionContext(subscription) : {
        userId: payment.notes?.user_id,
        plan: payment.notes?.plan_key,
        subscriptionId,
      };
      const userId = context.userId;
      const plan = context.plan;

      if (!userId || !plan) {
        console.error("Missing user_id or plan in payment/subscription notes");
        return new Response(JSON.stringify({ error: "Missing billing context" }), {
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
              razorpay_subscription_id: context.subscriptionId,
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
            auto_reminders: true,
            daily_reports: true,
            ai_logo: true,
            billing_cycle: plan,
            razorpay_subscription_id: context.subscriptionId,
            razorpay_payment_id: payment.id,
          },
          payment_approved_at: new Date().toISOString(),
          expires_at: getFutureIso(getPlanDurationDays(plan)),
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
