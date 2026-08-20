import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PAID_PLANS, getPlanDurationDays, type PlanKey } from "../_shared/subscriptionPlans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: "Payment service is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userSupabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan, razorpay_subscription_id } = await req.json();
    if (!razorpay_subscription_id || !plan || !PAID_PLANS.has(plan as PlanKey)) {
      return new Response(JSON.stringify({ error: "Invalid subscription request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    let subscriptionRes: Response | null = null;
    let subscription: any = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      subscriptionRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpay_subscription_id}`, {
        headers: { Authorization: `Basic ${credentials}` },
      });
      subscription = await subscriptionRes.json();

      if (!subscriptionRes.ok || ["authenticated", "active"].includes(String(subscription?.status || ""))) {
        break;
      }

      await sleep(1200);
    }

    if (!subscriptionRes?.ok || !subscription?.id) {
      return new Response(JSON.stringify({ error: subscription?.error?.description || "Unable to verify subscription" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const noteUserId = subscription?.notes?.user_id;
    const notePlan = subscription?.notes?.plan_key;
    if (noteUserId !== userId || notePlan !== plan) {
      return new Response(JSON.stringify({ error: "Subscription does not match this user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = String(subscription.status || "");
    if (!["authenticated", "active"].includes(status)) {
      return new Response(JSON.stringify({ error: `Subscription is ${status || "not authorized"}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const planKey = plan as PlanKey;
    const checkoutMode = String(subscription?.notes?.checkout_mode || "");
    const startAtMs = Number(subscription?.start_at || 0) * 1000;
    const isTrialAuthorization = checkoutMode === "trial_authorization" &&
      status === "authenticated" &&
      startAtMs > now.getTime();

    if (!isTrialAuthorization && status !== "active") {
      return new Response(JSON.stringify({
        error: "Payment is still being confirmed. Your plan will activate automatically once Razorpay confirms the charge.",
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const billingCycle = isTrialAuthorization ? "trial" : planKey;
    const expiresAt = isTrialAuthorization
      ? new Date(startAtMs).toISOString()
      : subscription?.current_end
        ? new Date(Number(subscription.current_end) * 1000).toISOString()
        : new Date(now.getTime() + getPlanDurationDays(planKey) * 24 * 60 * 60 * 1000).toISOString();

    const { error: subError } = await adminSupabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan: planKey, // EXACT plan saved
          status: "active",
          max_pgs: -1,
          max_tenants_per_pg: -1,
          features: {
            auto_reminders: true,
            daily_reports: true,
            ai_logo: true,
            billing_cycle: billingCycle,
            ...(isTrialAuthorization ? { next_billing_cycle: planKey } : {}),
            razorpay_subscription_id,
            razorpay_status: status,
            checkout_mode: checkoutMode || (isTrialAuthorization ? "trial_authorization" : "immediate_charge"),
          },
          payment_approved_at: now.toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: "user_id" },
      );

    if (subError) throw subError;

    await adminSupabase
      .from("payment_requests")
      .update({
        status: isTrialAuthorization ? "authenticated" : "approved",
        reviewed_at: now.toISOString(),
        notes: JSON.stringify({
          razorpay_subscription_id,
          billing_cycle: planKey,
          checkout_mode: checkoutMode || (isTrialAuthorization ? "trial_authorization" : "immediate_charge"),
          trial_ends_at: isTrialAuthorization ? expiresAt : null,
          razorpay_status: status,
        }),
      })
      .eq("user_id", userId)
      .eq("status", "pending");

    return new Response(
      JSON.stringify({
        success: true,
        status,
        billing_cycle: billingCycle,
        next_billing_cycle: isTrialAuthorization ? planKey : null,
        trial_ends_at: isTrialAuthorization ? expiresAt : null,
        paid_cycle_days: getPlanDurationDays(planKey),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error syncing Razorpay subscription:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
