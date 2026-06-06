import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiringSubscription {
  user_id: string;
  email: string;
  expires_at: string;
  days_left: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find subscriptions expiring in exactly 7 days, 3 days, and 1 day
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Get subscriptions that expire within 7 days and are still active
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, expires_at, status")
      .eq("status", "active")
      .lte("expires_at", sevenDaysFromNow.toISOString())
      .gte("expires_at", now.toISOString());

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expiring subscriptions found", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails only for affected users (avoid scanning all users)
    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .in('id', userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const userEmailMap = new Map(
      (users || []).map(u => [u.id, u.email])
    );

    // Calculate days left and prepare reminder data
    const expiringSubscriptions: ExpiringSubscription[] = subscriptions.map(sub => {
      const expiresAt = new Date(sub.expires_at);
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      return {
        user_id: sub.user_id,
        email: userEmailMap.get(sub.user_id) || "unknown",
        expires_at: sub.expires_at,
        days_left: daysLeft,
      };
    });

    // Filter for specific reminder days (7, 3, 1)
    const remindersToSend = expiringSubscriptions.filter(
      sub => sub.days_left === 7 || sub.days_left === 3 || sub.days_left === 1
    );

    // Log reminder info (in production, you would send actual notifications here)
    console.log("Expiring subscriptions to remind:", remindersToSend);

    // Create audit log entries for the reminders
    for (const reminder of remindersToSend) {
      await supabase.from("audit_logs").insert({
        action: "subscription_expiry_reminder",
        table_name: "subscriptions",
        record_id: reminder.user_id,
        record_name: `${reminder.days_left} days reminder`,
        new_data: {
          email: reminder.email,
          expires_at: reminder.expires_at,
          days_left: reminder.days_left,
        },
      });
    }

    // Check for expired subscriptions and mark them
    const { data: expiredSubs, error: expiredError } = await supabase
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now.toISOString())
      .select();

    if (expiredError) {
      console.error("Error updating expired subscriptions:", expiredError);
    } else if (expiredSubs && expiredSubs.length > 0) {
      console.log(`Marked ${expiredSubs.length} subscriptions as expired`);
    }

    return new Response(
      JSON.stringify({
        message: "Subscription reminders processed",
        expiring_count: expiringSubscriptions.length,
        reminders_sent: remindersToSend.length,
        expired_count: expiredSubs?.length || 0,
        details: remindersToSend,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in subscription-reminder:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});