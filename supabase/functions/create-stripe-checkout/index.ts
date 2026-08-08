import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_CONFIG = {
  manual: { amount: 499, label: "Manual" },
  automatic: { amount: 999, label: "Automatic" },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan, returnUrl } = await req.json();

    if (!plan || !(plan in PLAN_CONFIG)) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-08-27.basil",
    });

    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];
    const allowedOrigins = new Set(["https://pgmanagee.vercel.app", Deno.env.get("APP_URL")].filter(Boolean));
    let origin = "https://pgmanagee.vercel.app";
    try {
      const requestedOrigin = new URL(returnUrl || req.headers.get("origin") || origin).origin;
      if (allowedOrigins.has(requestedOrigin) || requestedOrigin.startsWith("http://localhost:")) origin = requestedOrigin;
    } catch {
      // Keep the production origin for malformed or untrusted return URLs.
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `PG HUB - ${planConfig.label} Plan`,
              description: `Monthly subscription - ${planConfig.label} Plan`,
            },
            unit_amount: planConfig.amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        user_id: user.id,
        plan: plan,
      },
      success_url: `${origin}?payment=success&plan=${plan}`,
      cancel_url: `${origin}?payment=cancelled`,
    });

    // Store payment request
    await supabaseAdmin.from("payment_requests").insert({
      user_id: user.id,
      amount: planConfig.amount,
      payment_method: "stripe",
      status: "pending",
      notes: JSON.stringify({ stripe_session_id: session.id, plan }),
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating Stripe checkout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
