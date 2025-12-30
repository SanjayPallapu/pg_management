import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptData {
  tenantName: string;
  paymentMode: string;
  paymentDate: string;
  joiningDate: string;
  forMonth: string;
  roomNo: string;
  sharingType: string;
  amount: number;
  amountPaid: number;
  isFullPayment: boolean;
  remainingBalance?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Check if user has any role (admin or staff)
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error("Role check failed:", roleError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    console.log(`User ${user.id} with role ${roleData.role} generating receipt`);

    const receiptData: ReceiptData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const paymentType = receiptData.isFullPayment ? "Full Payment" : "Partial Payment";
    const paymentMessage = receiptData.isFullPayment 
      ? "Your full payment has been successfully completed."
      : `You have made a partial payment of ₹ ${receiptData.amountPaid.toLocaleString()}.`;
    
    const thankYouMessage = receiptData.isFullPayment
      ? "Your full payment has been successfully completed."
      : `You have successfully made a partial payment of ₹ ${receiptData.amountPaid.toLocaleString()}. Please pay the remaining ₹ ${receiptData.remainingBalance?.toLocaleString()} at your earliest convenience.`;

    const prompt = `Generate a beautiful payment receipt image for a women's hostel called "Amma Women's Hostel".

The receipt should have:
- A beautiful header with the hostel logo showing a mother and daughter embrace in pink/magenta crescent moon design with flowers and leaves
- "Amma" in elegant script font, "WOMEN'S HOSTEL" below it
- A green checkmark with "Payment Successful!" text

Payment Section (light green background):
- "₹ ${receiptData.amountPaid.toLocaleString()} ${paymentType}" as the title
- "${paymentMessage}"
${!receiptData.isFullPayment ? `- "₹ ${receiptData.remainingBalance?.toLocaleString()} Remaining Balance" in red/pink text` : ''}

Tenant & Transaction Details (white background with light border):
- Section header: "Tenant & Transaction Details" with light green background
- Tenant Name: ${receiptData.tenantName}
- Payment Mode: ${receiptData.paymentMode}
- Payment Date: ${receiptData.paymentDate}
- Joining Date: ${receiptData.joiningDate}

Stay & Payment Details:
- Section header: "Stay & Payment Details" with light green background  
- For Month: ${receiptData.forMonth}
- Room No: ${receiptData.roomNo}
- Sharing Type: ${receiptData.sharingType}
- Amount: ₹ ${receiptData.amount.toLocaleString()}

Footer:
- Decorative illustration of a pink hostel building with green checkmark, money stacks, coins, and plants
- "Thank You!" in elegant green script
- "${thankYouMessage}"

Style: Clean, professional, feminine, with pink, green, and white color scheme. Use soft gradients and decorative flower elements.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating receipt:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
