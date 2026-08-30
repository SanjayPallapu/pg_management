import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type PlanKey = "monthly" | "yearly" | "pro" | "pro_yearly" | "promax" | "promax_yearly" | "lifetime";

export const PLAN_CONFIG: Record<PlanKey, {
  amount: number;
  period: "monthly" | "yearly";
  interval: number;
  totalCount: number;
  label: string;
  maxPgs: number;
  includedTenants: number;
}> = {
  monthly: { amount: 49900, period: "monthly", interval: 1, totalCount: 120, label: "Basic", maxPgs: 1, includedTenants: 100 },
  yearly: { amount: 499900, period: "yearly", interval: 1, totalCount: 10, label: "Basic Yearly", maxPgs: 1, includedTenants: 100 },
  pro: { amount: 79900, period: "monthly", interval: 1, totalCount: 120, label: "Plus", maxPgs: 2, includedTenants: 200 },
  pro_yearly: { amount: 799900, period: "yearly", interval: 1, totalCount: 10, label: "Plus Yearly", maxPgs: 2, includedTenants: 200 },
  promax: { amount: 99900, period: "monthly", interval: 1, totalCount: 120, label: "Pro", maxPgs: 4, includedTenants: 500 },
  promax_yearly: { amount: 999900, period: "yearly", interval: 1, totalCount: 10, label: "Pro Yearly", maxPgs: 4, includedTenants: 500 },
  lifetime: { amount: 999900, period: "yearly", interval: 100, totalCount: 1, label: "Pro Max Lifetime", maxPgs: 4, includedTenants: 500 },
};

export const PAID_PLANS = new Set<PlanKey>(Object.keys(PLAN_CONFIG) as PlanKey[]);
export const TRIAL_DAYS = 7;

export const getPlanDurationDays = (plan: PlanKey) =>
  plan === "lifetime" ? 36500 : plan === "yearly" || plan === "pro_yearly" || plan === "promax_yearly" ? 365 : 30;

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

    const body = await req.json();
    const { plan, razorpay_subscription_id, razorpay_payment_id, razorpay_order_id } = body;
    if (!plan || !PAID_PLANS.has(plan as PlanKey)) {
      return new Response(JSON.stringify({ error: "Invalid subscription request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const now = new Date();
    const planKey = plan as PlanKey;
    const planConfig = PLAN_CONFIG[planKey];

    // Special handling for Lifetime One-Time Payment
    if (planKey === "lifetime") {
      if (!razorpay_payment_id && !razorpay_order_id) {
        return new Response(JSON.stringify({ error: "Missing payment or order ID for lifetime verification" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify payment with Razorpay
      let paymentVerified = false;
      if (razorpay_payment_id) {
        const payRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
          headers: { Authorization: `Basic ${credentials}` },
        });
        const payJson = await payRes.json();
        if (payRes.ok && ["captured", "authorized"].includes(payJson?.status)) {
          paymentVerified = true;
        }
      } else if (razorpay_order_id) {
        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}/payments`, {
          headers: { Authorization: `Basic ${credentials}` },
        });
        const orderJson = await orderRes.json();
        if (orderRes.ok && Array.isArray(orderJson?.items) && orderJson.items.some((p: any) => ["captured", "authorized"].includes(p?.status))) {
          paymentVerified = true;
        }
      }

      if (!paymentVerified) {
        return new Response(JSON.stringify({ error: "Lifetime payment could not be verified with Razorpay" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 100 years lifetime expiry
      const lifetimeExpiresAt = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();

      await adminSupabase.from("subscriptions").upsert({
        user_id: userId,
        plan: "lifetime",
        status: "active",
        max_pgs: planConfig.maxPgs,
        max_tenants_per_pg: planConfig.includedTenants,
        features: {
          billing_cycle: "lifetime",
          ai_logo: true,
          auto_reminders: true,
          daily_reports: true,
          is_lifetime: true,
          razorpay_payment_id: razorpay_payment_id || null,
          razorpay_order_id: razorpay_order_id || null,
        },
        expires_at: lifetimeExpiresAt,
        payment_approved_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      if (razorpay_order_id) {
        await adminSupabase
          .from("payment_requests")
          .update({
            status: "approved",
            approved_at: now.toISOString(),
            notes: JSON.stringify({
              payment_type: "pghub_subscription",
              plan_key: "lifetime",
              razorpay_payment_id,
              razorpay_order_id,
              activated_at: now.toISOString(),
            }),
          })
          .eq("user_id", userId)
          .eq("payment_method", "razorpay");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Pro Max Lifetime VIP Activated Successfully",
          plan: "lifetime",
          expires_at: lifetimeExpiresAt,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!razorpay_subscription_id) {
      return new Response(JSON.stringify({ error: "Missing subscription ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const planConfig = PLAN_CONFIG[planKey];
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
          max_pgs: planConfig.maxPgs,
          max_tenants_per_pg: planConfig.includedTenants,
          features: {
            auto_reminders: true,
            daily_reports: true,
            ai_logo: true,
            billing_cycle: billingCycle,
            included_tenants: planConfig.includedTenants,
            tenant_limit_scope: "account",
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
