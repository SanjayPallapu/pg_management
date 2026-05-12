import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Tool definitions exposed to the LLM
const tools = [
  {
    type: "function",
    function: {
      name: "get_pg_overview",
      description:
        "Get a high-level overview of the current PG: total rooms, occupied/vacant beds, total tenants, total monthly rent expected.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_collection_summary",
      description:
        "Get rent collection summary for a given month/year: collected, pending, partial, count of paid/unpaid tenants.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "1-12. Defaults to current month." },
          year: { type: "number", description: "Year, e.g. 2026. Defaults to current year." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_tenants",
      description:
        "List tenants who have NOT fully paid rent for the given month. Returns name, room, phone, amount due.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number" },
          year: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_tenant",
      description:
        "Search for a tenant by name (partial match). Returns their room, rent, payment status for current month, phone, join date.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_room_details",
      description: "Get details about a specific room by room number, including tenants and rent.",
      parameters: {
        type: "object",
        properties: { roomNo: { type: "string" } },
        required: ["roomNo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_vacant_beds",
      description: "List rooms with vacant beds (capacity > current tenants).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function executeTool(
  name: string,
  args: any,
  supabase: any,
  pgId: string,
) {
  const now = new Date();
  const month = args?.month ?? now.getMonth() + 1;
  const year = args?.year ?? now.getFullYear();
  const today = todayISO();

  if (name === "get_pg_overview") {
    const { data: rooms } = await supabase
      .from("rooms").select("id, capacity, rent_amount").eq("pg_id", pgId);
    const roomIds = (rooms || []).map((r: any) => r.id);
    const { data: tenants } = await supabase
      .from("tenants").select("id, monthly_rent, end_date, is_locked")
      .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"]);
    const active = (tenants || []).filter(
      (t: any) => !t.is_locked && (!t.end_date || t.end_date > today),
    );
    const totalCapacity = (rooms || []).reduce((s: number, r: any) => s + (r.capacity || 0), 0);
    const expectedRent = active.reduce((s: number, t: any) => s + (t.monthly_rent || 0), 0);
    return {
      total_rooms: rooms?.length || 0,
      total_beds: totalCapacity,
      active_tenants: active.length,
      vacant_beds: totalCapacity - active.length,
      expected_monthly_rent: expectedRent,
    };
  }

  if (name === "get_collection_summary" || name === "list_pending_tenants") {
    const { data: rooms } = await supabase
      .from("rooms").select("id").eq("pg_id", pgId);
    const roomIds = (rooms || []).map((r: any) => r.id);
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, phone, monthly_rent, end_date, is_locked, room_id, rooms(room_no)")
      .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"]);
    const active = (tenants || []).filter(
      (t: any) => !t.is_locked && (!t.end_date || t.end_date > today),
    );
    const tenantIds = active.map((t: any) => t.id);
    const { data: payments } = await supabase
      .from("tenant_payments")
      .select("tenant_id, amount, amount_paid, payment_status")
      .in("tenant_id", tenantIds.length ? tenantIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("month", month).eq("year", year);
    const payMap = new Map((payments || []).map((p: any) => [p.tenant_id, p]));

    let collected = 0, pending = 0, paidCount = 0, partialCount = 0, dueCount = 0;
    const pendingList: any[] = [];
    for (const t of active) {
      const p = payMap.get(t.id);
      const due = t.monthly_rent || 0;
      const paid = p?.amount_paid || 0;
      collected += paid;
      const remaining = Math.max(0, due - paid);
      pending += remaining;
      if (paid >= due && due > 0) paidCount++;
      else if (paid > 0) { partialCount++; pendingList.push({ name: t.name, room: t.rooms?.room_no, phone: t.phone, due: remaining, status: "partial" }); }
      else { dueCount++; pendingList.push({ name: t.name, room: t.rooms?.room_no, phone: t.phone, due, status: "unpaid" }); }
    }

    if (name === "list_pending_tenants") {
      return { month, year, pending_tenants: pendingList.slice(0, 50), count: pendingList.length };
    }
    return {
      month, year, collected, pending,
      paid_count: paidCount, partial_count: partialCount, unpaid_count: dueCount,
      total_active_tenants: active.length,
    };
  }

  if (name === "find_tenant") {
    const { data: rooms } = await supabase.from("rooms").select("id, room_no").eq("pg_id", pgId);
    const roomIds = (rooms || []).map((r: any) => r.id);
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id, name, phone, monthly_rent, start_date, end_date, is_locked, room_id, rooms(room_no)")
      .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"])
      .ilike("name", `%${args.name}%`);
    if (!tenants?.length) return { found: false };
    const ids = tenants.map((t: any) => t.id);
    const { data: payments } = await supabase
      .from("tenant_payments").select("tenant_id, amount, amount_paid, payment_status, payment_date")
      .in("tenant_id", ids).eq("month", month).eq("year", year);
    const payMap = new Map((payments || []).map((p: any) => [p.tenant_id, p]));
    return {
      found: true,
      tenants: tenants.map((t: any) => ({
        name: t.name, phone: t.phone, room: t.rooms?.room_no,
        monthly_rent: t.monthly_rent, start_date: t.start_date, end_date: t.end_date,
        is_locked: t.is_locked,
        current_month_status: payMap.get(t.id) || { payment_status: "Pending", amount_paid: 0 },
      })),
    };
  }

  if (name === "get_room_details") {
    const { data: room } = await supabase
      .from("rooms").select("id, room_no, floor, capacity, rent_amount, status, notes")
      .eq("pg_id", pgId).eq("room_no", args.roomNo).maybeSingle();
    if (!room) return { found: false };
    const { data: tenants } = await supabase
      .from("tenants").select("name, phone, monthly_rent, start_date, end_date, is_locked")
      .eq("room_id", room.id);
    const active = (tenants || []).filter((t: any) => !t.is_locked && (!t.end_date || t.end_date > today));
    return { found: true, room, active_tenants: active };
  }

  if (name === "get_vacant_beds") {
    const { data: rooms } = await supabase
      .from("rooms").select("id, room_no, floor, capacity, rent_amount").eq("pg_id", pgId);
    const result: any[] = [];
    for (const r of rooms || []) {
      const { data: tenants } = await supabase
        .from("tenants").select("id, end_date, is_locked").eq("room_id", r.id);
      const active = (tenants || []).filter((t: any) => !t.is_locked && (!t.end_date || t.end_date > today));
      const vacant = (r.capacity || 0) - active.length;
      if (vacant > 0) result.push({ room_no: r.room_no, floor: r.floor, vacant_beds: vacant, rent: r.rent_amount });
    }
    return { vacant_rooms: result, total_vacant_beds: result.reduce((s, r) => s + r.vacant_beds, 0) };
  }

  return { error: `Unknown tool: ${name}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, pgId, lang } = await req.json();
    if (!pgId) {
      return new Response(JSON.stringify({ error: "pgId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: pg } = await supabase.from("pgs").select("id, name, owner_id").eq("id", pgId).maybeSingle();
    if (!pg || pg.owner_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isTelugu = lang === "te-IN";
    const systemPrompt = `You are an advanced, friendly voice assistant for "${pg.name}", a PG (paying guest) hostel management system. The owner is talking to you by VOICE in a real-time conversation.

LANGUAGE:
${isTelugu
  ? `- ALWAYS reply in natural spoken Telugu (తెలుగు) script. Use simple, conversational Telugu the way a friendly assistant in Hyderabad would speak.
- Numbers and money: speak in Telugu (e.g. "పన్నెండు వేల రూపాయలు"). Mix English words only for proper nouns (room numbers, names).
- Greetings like "నమస్కారం" are welcome. Keep it warm and natural.`
  : `- Reply in clear, natural English (Indian English style is fine).
- For money say "rupees" (e.g. "twelve thousand rupees"). Speak numbers naturally.`}

CONVERSATION STYLE:
- This is a REAL conversation, not a Q&A. Be warm, natural, and human-like.
- Keep responses SHORT (1-3 sentences). Voice-friendly: no markdown, no bullets, no asterisks, no symbols.
- Remember context from earlier turns. If the user says "and him?" or "what about that room?", use prior messages.
- If a question is ambiguous, ask a brief clarifying question instead of guessing.
- Use small acknowledgements ("Sure", "Got it", "సరే", "అలాగే") to feel natural.
- If the user is just chatting (greetings, thanks), reply briefly and naturally — no tool needed.

DATA RULES:
- ALWAYS use tools to fetch real data before stating numbers. Never fabricate.
- For "how much collected", "who hasn't paid", "vacant rooms", tenant or room lookups — call the right tool.
- After tool data, summarize in 1-3 short spoken sentences.
- If asked something outside PG data, politely steer back.

Today's date: ${todayISO()}.`;

    const convo: any[] = [{ role: "system", content: systemPrompt }, ...messages];

    // Tool-calling loop
    for (let step = 0; step < 5; step++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: convo,
          tools,
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI error", aiResp.status, errText);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;
      convo.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return new Response(JSON.stringify({ reply: msg.content || "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const tc of toolCalls) {
        let parsed: any = {};
        try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch {}
        const result = await executeTool(tc.function.name, parsed, supabase, pgId);
        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    return new Response(JSON.stringify({ reply: "I couldn't complete that request." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-agent error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});