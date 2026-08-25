import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLAN_CONFIG, type PlanKey } from "../_shared/subscriptionPlans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function createOrFetchPlan(credentials: string, plan: PlanKey) {
  const cfg = PLAN_CONFIG[plan];
  const planName = `PG HUB ${cfg.label}`;

  const fetchPlansRes = await fetch("https://api.razorpay.com/v1/plans?count=100", {
    headers: { Authorization: `Basic ${credentials}` },
  });

  const fetchPlansJson = await fetchPlansRes.json();
  if (fetchPlansRes.ok && Array.isArray(fetchPlansJson?.items)) {
    const existing = fetchPlansJson.items.find((item: any) =>
      item?.item?.name === planName &&
      item?.item?.amount === cfg.amount &&
      item?.period === cfg.period &&
      item?.interval === cfg.interval
    );
    if (existing?.id) return existing.id as string;
  }

  const planRes = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      period: cfg.period,
      interval: cfg.interval,
      item: {
        name: planName,
        amount: cfg.amount,
        currency: "INR",
        description: `PG HUB ${cfg.label} auto-renewing subscription`,
      },
      notes: {
        payment_type: "pghub_subscription",
        plan_key: plan,
      },
    }),
  });

  const planJson = await planRes.json();
  if (!planRes.ok || !planJson?.id) {
    throw new Error(planJson?.error?.description || "Failed to create Razorpay plan");
  }

  return planJson.id as string;
}

async function createSubscription(
  credentials: string,
  planId: string,
  cfg: (typeof PLAN_CONFIG)[PlanKey],
  planKey: PlanKey,
  userId: string,
  options: { trialEndsAt?: string },
) {
  const checkoutMode = options.trialEndsAt ? "trial_authorization" : "immediate_charge";
  const body: Record<string, unknown> = {
    plan_id: planId,
    total_count: cfg.totalCount,
    quantity: 1,
    customer_notify: true,
    notes: {
      payment_type: "pghub_subscription",
      user_id: userId,
      plan_key: planKey,
      checkout_mode: checkoutMode,
      trial_ends_at: options.trialEndsAt || "",
    },
  };

  if (options.trialEndsAt) {
    body.start_at = Math.floor(new Date(options.trialEndsAt).getTime() / 1000);
  }

  const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return { res, json };
}

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const body = await req.json();
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Check if this is a Tenant Rent Order creation vs SaaS Subscription
    if (body.payment_type === "tenant_rent" || body.tenant_id) {
      const { tenant_id, month, year, tenant_payment_id } = body;
      if (!tenant_id) {
        return new Response(JSON.stringify({ error: "Invalid tenant rent payment details" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: ownedTenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id, monthly_rent")
        .eq("id", tenant_id)
        .maybeSingle();
      if (tenantError || !ownedTenant) {
        return new Response(JSON.stringify({ error: "Tenant does not belong to this user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let authoritativeAmount = Number(ownedTenant.monthly_rent);
      if (tenant_payment_id) {
        const { data: paymentRecord, error: paymentError } = await supabase
          .from("tenant_payments")
          .select("id, tenant_id, amount, amount_paid")
          .eq("id", tenant_payment_id)
          .eq("tenant_id", tenant_id)
          .maybeSingle();
        if (paymentError || !paymentRecord) {
          return new Response(JSON.stringify({ error: "Invalid tenant payment record" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        authoritativeAmount = Math.max(0, Number(paymentRecord.amount) - Number(paymentRecord.amount_paid || 0));
      }
      if (!Number.isFinite(authoritativeAmount) || authoritativeAmount <= 0) {
        return new Response(JSON.stringify({ error: "No outstanding rent amount" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amountPaise = Math.round(authoritativeAmount * 100);
      const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `rent_${tenant_id}_${month || 0}_${year || 0}`.substring(0, 40),
          notes: {
            payment_type: "tenant_rent",
            tenant_id,
            month: String(month || ""),
            year: String(year || ""),
            tenant_payment_id: tenant_payment_id || "",
            created_by: userId,
          },
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || !orderJson?.id) {
        throw new Error(orderJson?.error?.description || "Failed to create Razorpay order for rent");
      }

      return new Response(
        JSON.stringify({
          order_id: orderJson.id,
          key_id: RAZORPAY_KEY_ID,
          amount: orderJson.amount,
          currency: "INR",
          description: "PG Rent Payment",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Default: SaaS Subscription creation
    const { plan } = body;
    if (!plan || !(plan in PLAN_CONFIG)) {
      return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planKey = plan as PlanKey;
    const planId = await createOrFetchPlan(credentials, planKey);
    const cfg = PLAN_CONFIG[planKey];

    const { data: currentSubscription } = await supabase
      .from("subscriptions")
      .select("status, expires_at, features")
      .eq("user_id", userId)
      .maybeSingle();
    const features = currentSubscription?.features &&
      typeof currentSubscription.features === "object" &&
      !Array.isArray(currentSubscription.features)
      ? currentSubscription.features as Record<string, unknown>
      : {};
    const expiryMs = currentSubscription?.expires_at
      ? new Date(currentSubscription.expires_at).getTime()
      : Number.NaN;
    const hasActiveTrial = currentSubscription?.status === "active" &&
      features.billing_cycle === "trial" &&
      Number.isFinite(expiryMs) &&
      expiryMs > Date.now() + 60_000;
    const trialEndsAt = hasActiveTrial ? new Date(expiryMs).toISOString() : undefined;

    const { res: subscriptionRes, json: subscriptionJson } = await createSubscription(
      credentials,
      planId,
      cfg,
      planKey,
      userId,
      { trialEndsAt },
    );

    if (!subscriptionRes.ok || !subscriptionJson?.id) {
      throw new Error(subscriptionJson?.error?.description || "Failed to create Razorpay subscription");
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminSupabase.from("payment_requests").insert({
      user_id: userId,
      amount: cfg.amount / 100,
      payment_method: "razorpay",
      status: "pending",
      notes: JSON.stringify({
        payment_type: "pghub_subscription",
        razorpay_plan_id: planId,
        razorpay_subscription_id: subscriptionJson.id,
        billing_cycle: planKey,
        checkout_mode: hasActiveTrial ? "trial_authorization" : "immediate_charge",
        trial_ends_at: trialEndsAt || null,
      }),
    });

    return new Response(
      JSON.stringify({
        subscription_id: subscriptionJson.id,
        key_id: RAZORPAY_KEY_ID,
        amount: cfg.amount,
        currency: "INR",
        checkout_mode: hasActiveTrial ? "trial_authorization" : "immediate_charge",
        trial_ends_at: trialEndsAt || null,
        description: hasActiveTrial
          ? `₹${cfg.amount / 100} ${cfg.period === "yearly" ? "yearly" : "monthly"} after your current trial`
          : `₹${cfg.amount / 100} ${cfg.period === "yearly" ? "yearly" : "monthly"}, charged now`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating Razorpay order/subscription:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
