import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PlanKey = "monthly" | "quarterly" | "yearly";

const PLAN_CONFIG: Record<PlanKey, { amount: number; period: "monthly" | "yearly"; interval: number; totalCount: number; label: string }> = {
  monthly: { amount: 99900, period: "monthly", interval: 1, totalCount: 120, label: "Monthly" },
  quarterly: { amount: 269900, period: "monthly", interval: 3, totalCount: 40, label: "Quarterly" },
  yearly: { amount: 999900, period: "yearly", interval: 1, totalCount: 10, label: "Yearly" },
};

const TRIAL_DAYS = 30;

async function createOrFetchPlan(credentials: string, plan: PlanKey) {
  const cfg = PLAN_CONFIG[plan];
  const planName = `PG Manager ${cfg.label}`;

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
        description: `PG Manager ${cfg.label} auto-renewing subscription`,
      },
      notes: {
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
  options: { useTrialStart: boolean },
) {
  const body: Record<string, unknown> = {
    plan_id: planId,
    total_count: cfg.totalCount,
    quantity: 1,
    customer_notify: true,
    notes: {
      user_id: userId,
      plan_key: planKey,
      trial_days: String(TRIAL_DAYS),
    },
  };

  if (options.useTrialStart) {
    const startAt = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 24 * 60 * 60;
    body.start_at = startAt;
    body.expire_by = startAt + 7 * 24 * 60 * 60;
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
    const { plan } = await req.json();

    if (!plan || !(plan in PLAN_CONFIG)) {
      return new Response(JSON.stringify({ error: "Invalid plan selected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planKey = plan as PlanKey;
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const planId = await createOrFetchPlan(credentials, planKey);
    const cfg = PLAN_CONFIG[planKey];

    const { res: subscriptionRes, json: subscriptionJson } = await createSubscription(
      credentials,
      planId,
      cfg,
      planKey,
      userId,
      { useTrialStart: true },
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
        razorpay_plan_id: planId,
        razorpay_subscription_id: subscriptionJson.id,
        billing_cycle: planKey,
        trial_days: TRIAL_DAYS,
      }),
    });

    return new Response(
      JSON.stringify({
        subscription_id: subscriptionJson.id,
        key_id: RAZORPAY_KEY_ID,
        description: `PG Manager ${cfg.label} subscription`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating Razorpay subscription:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
