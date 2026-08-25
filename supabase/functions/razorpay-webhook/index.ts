import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PAID_PLANS, PLAN_CONFIG, getPlanDurationDays, type PlanKey } from "../_shared/subscriptionPlans.ts";

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

  // Timing-safe comparison
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  const rawPlan = entity?.notes?.plan_key || entity?.notes?.plan;
  const plan = PAID_PLANS.has(rawPlan as PlanKey) ? (rawPlan as PlanKey) : undefined;
  return {
    userId: entity?.notes?.user_id,
    plan,
    subscriptionId: entity?.id,
    status: entity?.status,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 2 & 3: Webhook secret requirement - strictly require RAZORPAY_WEBHOOK_SECRET
    const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured in Deno environment");
      return new Response(JSON.stringify({ error: "Server configuration error: RAZORPAY_WEBHOOK_SECRET missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read raw body before parsing JSON for HMAC-SHA256 signature verification
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.error("Missing x-razorpay-signature header");
      return new Response(JSON.stringify({ error: "Missing x-razorpay-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifySignature(body, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!isValid) {
      console.error("Invalid webhook signature received");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);
    const eventType = payload.event;
    const eventId = payload.event_id || `${eventType}_${payload.created_at}_${payload.payload?.payment?.entity?.id || payload.payload?.subscription?.entity?.id || 'evt'}`;

    console.log(`Razorpay webhook verified: type=${eventType}, id=${eventId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Step 4: Idempotency check via razorpay_webhook_events
    const { data: existingEvent } = await supabase
      .from("razorpay_webhook_events")
      .select("id, status")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existingEvent?.status === "processed") {
      console.log(`Event ${eventId} already processed. Skipping.`);
      return new Response(JSON.stringify({ status: "already_processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert or update event status to processing
    await supabase
      .from("razorpay_webhook_events")
      .upsert({
        event_id: eventId,
        event_type: eventType,
        status: "processing",
        created_at: new Date().toISOString(),
      }, { onConflict: "event_id" });

    // Step 5: Domain Separation
    const entity = payload.payload?.payment?.entity || payload.payload?.subscription?.entity || payload.payload?.order?.entity || {};
    const notes = entity?.notes || {};
    const paymentType = notes.payment_type;

    const isTenantRent = paymentType === "tenant_rent" || !!notes.tenant_id || !!notes.tenant_payment_id;
    const isSaaS = paymentType === "pghub_subscription" || !!payload.payload?.subscription || !!notes.plan_key || (!isTenantRent && (eventType.startsWith("subscription.") || notes.user_id));

    console.log(`Processing event domain: ${isTenantRent ? "TENANT_RENT" : isSaaS ? "PGHUB_SAAS" : "UNKNOWN"}`);

    if (isTenantRent) {
      // -------------------------------------------------------------
      // TENANT RENT PAYMENTS
      // -------------------------------------------------------------
      const tenantId = notes.tenant_id;
      const month = notes.month ? Number(notes.month) : null;
      const year = notes.year ? Number(notes.year) : null;
      const tenantPaymentId = notes.tenant_payment_id;

      if (eventType === "payment.captured" || eventType === "order.paid") {
        const payment = payload.payload?.payment?.entity || {};
        const razorpayOrderId = payment.order_id || entity.id;
        const razorpayPaymentId = payment.id || entity.id;
        const paidAmountINR = (payment.amount || entity.amount || 0) / 100;

        console.log(`Tenant payment captured: tenantId=${tenantId}, month=${month}, year=${year}, amount=₹${paidAmountINR}`);

        // Locate existing tenant_payment record
        let query = supabase.from("tenant_payments").select("*");
        if (tenantPaymentId) {
          query = query.eq("id", tenantPaymentId);
        } else if (tenantId && month && year) {
          query = query.eq("tenant_id", tenantId).eq("month", month).eq("year", year);
        } else {
          console.warn("Tenant rent payment captured without tenant details in notes");
          await supabase.from("razorpay_webhook_events").update({ status: "failed", error_message: "Missing tenant notes", processed_at: new Date().toISOString() }).eq("event_id", eventId);
          return new Response(JSON.stringify({ status: "missing_tenant_notes" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const { data: tenantPaymentRecords, error: fetchErr } = await query;
        if (fetchErr || !tenantPaymentRecords || tenantPaymentRecords.length === 0) {
          console.error("Target tenant_payments record not found:", fetchErr);
          await supabase.from("razorpay_webhook_events").update({ status: "failed", error_message: "Record not found", processed_at: new Date().toISOString() }).eq("event_id", eventId);
          return new Response(JSON.stringify({ error: "Tenant payment record not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const record = tenantPaymentRecords[0];

        // Step 14: Server-side amount validation
        if (record.amount > 0 && paidAmountINR < record.amount) {
          console.warn(`Partial or mismatched payment: expected ₹${record.amount}, received ₹${paidAmountINR}`);
        }

        const newAmountPaid = (record.amount_paid || 0) + paidAmountINR;
        const newPaymentStatus = newAmountPaid >= record.amount ? "Paid" : newAmountPaid > 0 ? "Partial" : "Pending";
        const existingEntries = Array.isArray(record.payment_entries) ? record.payment_entries : [];

        // Check if this razorpay_payment_id was already recorded in payment_entries
        const duplicateEntry = existingEntries.some((entry: any) => entry.razorpay_payment_id === razorpayPaymentId);

        if (!duplicateEntry) {
          const newEntry = {
            id: crypto.randomUUID(),
            amount: paidAmountINR,
            date: new Date().toISOString(),
            mode: payment.method || "razorpay",
            type: "Rent",
            notes: `Razorpay Online Payment (${razorpayPaymentId})`,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
          };

          const updatedEntries = [...existingEntries, newEntry];

          await supabase
            .from("tenant_payments")
            .update({
              amount_paid: newAmountPaid,
              payment_status: newPaymentStatus,
              payment_date: new Date().toISOString(),
              payment_entries: updatedEntries,
              updated_at: new Date().toISOString(),
            })
            .eq("id", record.id);

          // Update tenant overall status if fully paid
          if (newPaymentStatus === "Paid") {
            await supabase
              .from("tenants")
              .update({ payment_status: "Paid", updated_at: new Date().toISOString() })
              .eq("id", record.tenant_id);
          }
        }
      } else if (eventType === "payment.failed") {
        const payment = payload.payload?.payment?.entity || {};
        console.warn(`Tenant payment failed for tenantId=${tenantId}: ${payment.error_description || "Payment failed"}`);
      }
    } else if (isSaaS) {
      // -------------------------------------------------------------
      // PGHUB SAAS SUBSCRIPTIONS
      // -------------------------------------------------------------
      if (eventType === "subscription.authenticated" || eventType === "subscription.activated") {
        const subscription = payload.payload?.subscription?.entity || {};
        const { userId, plan, subscriptionId, status } = getSubscriptionContext(subscription);

        if (!userId || !subscriptionId) {
          console.error("Missing subscription notes for event", eventType);
          await supabase.from("razorpay_webhook_events").update({ status: "failed", error_message: "Missing subscription notes", processed_at: new Date().toISOString() }).eq("event_id", eventId);
          return new Response(JSON.stringify({ error: "Missing subscription notes" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const planKey = plan || "monthly";
        const planConfig = PLAN_CONFIG[planKey];
        const now = new Date().toISOString();

        const checkoutMode = String(subscription?.notes?.checkout_mode || "");
        const startAtMs = Number(subscription?.start_at || 0) * 1000;
        const isTrialAuthorization = eventType === "subscription.authenticated" &&
          checkoutMode === "trial_authorization" &&
          startAtMs > Date.now();

        if (isTrialAuthorization || eventType === "subscription.activated") {
          const billingCycle = isTrialAuthorization ? "trial" : planKey;
          const expiresAt = isTrialAuthorization
            ? new Date(startAtMs).toISOString()
            : subscription?.current_end
              ? new Date(Number(subscription.current_end) * 1000).toISOString()
              : getFutureIso(getPlanDurationDays(planKey));
          const { error: subError } = await supabase
            .from("subscriptions")
            .upsert(
              {
                user_id: userId,
                plan: planKey,
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
                  razorpay_subscription_id: subscriptionId,
                  razorpay_status: status || eventType.replace("subscription.", ""),
                  checkout_mode: checkoutMode || (isTrialAuthorization ? "trial_authorization" : "immediate_charge"),
                },
                payment_approved_at: now,
                expires_at: expiresAt,
              },
              { onConflict: "user_id" },
            );

          if (subError) throw subError;
        }

        await supabase
          .from("payment_requests")
          .update({
            status: isTrialAuthorization ? "authenticated" : eventType === "subscription.activated" ? "approved" : "pending",
            reviewed_at: now,
            notes: JSON.stringify({
              razorpay_subscription_id: subscriptionId,
              billing_cycle: planKey,
              checkout_mode: checkoutMode || (isTrialAuthorization ? "trial_authorization" : "immediate_charge"),
              trial_ends_at: isTrialAuthorization ? new Date(startAtMs).toISOString() : null,
              razorpay_status: status || eventType.replace("subscription.", ""),
            }),
          })
          .eq("user_id", userId)
          .eq("status", "pending");

        console.log(`${isTrialAuthorization ? "Trial mandate authenticated" : eventType} for user ${userId}, plan: ${planKey}`);
      } else if (eventType === "subscription.charged" || eventType === "payment.captured") {
        const payment = payload.payload?.payment?.entity || {};
        const subscriptionEntity = payload.payload?.subscription?.entity;
        const subscriptionId = payment.subscription_id || subscriptionEntity?.id;
        const subscription = subscriptionId ? await fetchRazorpaySubscription(subscriptionId) : subscriptionEntity;
        
        const context = subscription ? getSubscriptionContext(subscription) : {
          userId: payment.notes?.user_id,
          plan: (PAID_PLANS.has(payment.notes?.plan_key as PlanKey) ? payment.notes?.plan_key : undefined) as PlanKey | undefined,
          subscriptionId,
        };

        const userId = context.userId;
        const planKey = context.plan || "monthly";
        const planConfig = PLAN_CONFIG[planKey];

        if (!userId) {
          console.error("Missing user_id in payment/subscription notes");
          await supabase.from("razorpay_webhook_events").update({ status: "failed", error_message: "Missing user_id", processed_at: new Date().toISOString() }).eq("event_id", eventId);
          return new Response(JSON.stringify({ error: "Missing billing context" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const isTrialMandatePayment = eventType === "payment.captured" &&
          subscription?.notes?.checkout_mode === "trial_authorization" &&
          subscription?.status === "authenticated" &&
          Number(subscription?.start_at || 0) * 1000 > Date.now();
        if (isTrialMandatePayment) {
          await supabase
            .from("payment_requests")
            .update({
              status: "authenticated",
              reviewed_at: new Date().toISOString(),
              notes: JSON.stringify({
                razorpay_subscription_id: context.subscriptionId,
                authorization_payment_id: payment.id,
                plan: planKey,
                checkout_mode: "trial_authorization",
                trial_ends_at: new Date(Number(subscription.start_at) * 1000).toISOString(),
              }),
            })
            .eq("user_id", userId)
            .eq("status", "pending");
          await supabase
            .from("razorpay_webhook_events")
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("event_id", eventId);
          console.log(`Mandate authentication payment recorded for user ${userId}; paid billing remains scheduled.`);
          return new Response(JSON.stringify({ status: "ok", kind: "trial_mandate" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.log(`Subscription charge successful for user ${userId}, plan: ${planKey}`);

        // Update payment_requests status
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
                razorpay_order_id: payment.order_id,
                razorpay_payment_id: payment.id,
                razorpay_subscription_id: context.subscriptionId,
                plan: planKey,
                auto_approved: true,
              }),
            })
            .eq("id", paymentRequests[0].id);
        }

        // Activate subscription with EXACT purchased plan key (no forced "pro" override)
        const durationDays = getPlanDurationDays(planKey);
        const paidExpiresAt = subscription?.current_end
          ? new Date(Number(subscription.current_end) * 1000).toISOString()
          : getFutureIso(durationDays);
        const { error: subError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan: planKey, // EXACT plan preserved
              status: "active",
              max_pgs: planConfig.maxPgs,
              max_tenants_per_pg: planConfig.includedTenants,
              features: {
                auto_reminders: true,
                daily_reports: true,
                ai_logo: true,
                billing_cycle: planKey,
                included_tenants: planConfig.includedTenants,
                tenant_limit_scope: "account",
                razorpay_subscription_id: context.subscriptionId,
                razorpay_payment_id: payment.id,
              },
              payment_approved_at: new Date().toISOString(),
              expires_at: paidExpiresAt,
            },
            { onConflict: "user_id" },
          );

        if (subError) throw subError;

        const { error: referralError } = await supabase.rpc("reward_referral_conversion", {
          p_referee_id: userId,
        });
        if (referralError) {
          // Do not fail or retry a genuine payment because an optional reward failed.
          // The verified webhook event remains available for operational replay.
          console.error(`Referral reward failed for user ${userId}: ${referralError.message}`);
        }

        console.log(`Subscription updated for user ${userId} to plan ${planKey} for ${durationDays} days`);
      } else if (eventType === "subscription.cancelled" || eventType === "subscription.halted") {
        const subscription = payload.payload?.subscription?.entity || {};
        const { userId } = getSubscriptionContext(subscription);

        if (userId) {
          await supabase
            .from("subscriptions")
            .update({
              status: "expired",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          console.log(`Subscription ${eventType} for user ${userId}`);
        }
      } else if (eventType === "subscription.paused" || eventType === "subscription.resumed" || eventType === "subscription.updated") {
        const subscription = payload.payload?.subscription?.entity || {};
        const { userId, status } = getSubscriptionContext(subscription);
        if (userId) {
          const subStatus = status === "active" ? "active" : status === "paused" ? "active" : "expired";
          await supabase
            .from("subscriptions")
            .update({
              status: subStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
      }
    }

    // Mark event as successfully processed in razorpay_webhook_events
    await supabase
      .from("razorpay_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", eventId);

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
