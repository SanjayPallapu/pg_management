import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crushJSON, compressSystemPrompt, trimConversation, estimateConversationTokens } from "./compress.ts";
import { classifyVoiceCommand, normalizeVoiceText } from "./intent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const WRITE_ACTIONS = new Set([
  "mark_payment",
  "update_notes",
  "add_expense",
  "add_tenant",
  "transfer_tenant_room",
  "remove_tenant",
]);

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
        "Search for a tenant by name or room (partial match). Returns their room, rent, payment status for current month, phone, join date.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, roomNo: { type: "string" } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_room_details",
      description: "Get details about a specific room by room number, including active tenants, capacity, rent amount, and notes.",
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
      description: "List rooms with vacant beds (capacity > current tenants), with floor and rent amount.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expenses_summary",
      description: "Get PG expenses summary and category breakdown (Electricity, Food, Maintenance, Water, Internet, Staff, etc.) for a month and year.",
      parameters: {
        type: "object",
        properties: {
          month: { type: "number", description: "1-12. Defaults current month." },
          year: { type: "number", description: "Year. Defaults current year." },
          category: { type: "string", description: "Optional category filter." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_expense",
      description: "Record a new PG expense (e.g. electricity, repairs, food, cleaning, staff wages). Must preview and confirm before calling with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Category: Electricity, Food, Maintenance, Water, Internet, Staff, Cleaning, Other." },
          amount: { type: "number", description: "Amount in rupees." },
          label: { type: "string", description: "Short description of the expense." },
          month: { type: "number" },
          year: { type: "number" },
          date: { type: "string", description: "YYYY-MM-DD date." },
          notes: { type: "string" },
          confirmed: { type: "boolean" },
        },
        required: ["category", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_analytics",
      description: "Get financial performance and profit/loss analytics for a month: revenue (rent + day guests), total expenses, net profit/loss, occupancy rate, collection rate.",
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
      name: "get_security_deposits",
      description: "Get security deposit status for the PG: total deposits collected, count of tenants with deposits, and individual tenant deposit records.",
      parameters: {
        type: "object",
        properties: {
          tenantName: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_day_guests",
      description: "List active or recent day guests / daily rentals, rooms, dates, total charges, and payment status.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_electricity_readings",
      description: "Get room electricity meter readings, units consumed, unit price, and bills for a month.",
      parameters: {
        type: "object",
        properties: {
          roomNo: { type: "string" },
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
      name: "get_onboarding_status",
      description: "Check pending tenant onboardings (submitted profiles, unverified documents, link status).",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_whatsapp_reminder",
      description: "Draft a polite WhatsApp rent reminder message for a tenant with pending rent.",
      parameters: {
        type: "object",
        properties: {
          tenantName: { type: "string" },
          roomNo: { type: "string" },
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
      name: "add_tenant",
      description: "Add a new tenant to a room. Preview and confirm with the user before calling with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          roomNo: { type: "string" },
          monthlyRent: { type: "number" },
          startDate: { type: "string" },
          securityDeposit: { type: "number" },
          confirmed: { type: "boolean" },
        },
        required: ["name", "roomNo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_tenant_room",
      description: "Transfer an existing tenant to another room. Preview and confirm with user before calling with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          tenantName: { type: "string" },
          targetRoomNo: { type: "string" },
          confirmed: { type: "boolean" },
        },
        required: ["tenantName", "targetRoomNo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_tenant",
      description: "Check out or remove a tenant. High impact: preview and confirm with user before calling with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          tenantName: { type: "string" },
          roomNo: { type: "string" },
          confirmed: { type: "boolean" },
        },
        required: ["tenantName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_payment",
      description:
        "Record/update rent payment for a tenant for a given month. Use this when the user says things like 'mark Ramesh as paid', 'రాము పెయిడ్ అని పెట్టు', '101 rent received cash 5000'. ALWAYS confirm with the user (read back tenant + amount + mode) before calling with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          tenantName: { type: "string", description: "Tenant name (partial ok). Optional if roomNo given and room has 1 tenant." },
          roomNo: { type: "string", description: "Room number to disambiguate." },
          month: { type: "number", description: "1-12. Defaults current." },
          year: { type: "number" },
          status: { type: "string", enum: ["Paid", "Partial", "Pending"], description: "Resulting status. 'Paid' = full month rent." },
          amount: { type: "number", description: "Amount paid in this entry (rupees). For status=Paid leave empty to use full monthly rent." },
          mode: { type: "string", enum: ["upi", "cash"], description: "Defaults upi." },
          collectedBy: { type: "string", description: "Collector name. Defaults to PG owner." },
          confirmed: { type: "boolean", description: "Must be true to actually write. If false, returns a preview." },
        },
        required: ["status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_notes",
      description: "Add/replace a note on a tenant or room. Confirm before calling with confirmed=true.",
      parameters: {
        type: "object",
        properties: {
          target: { type: "string", enum: ["tenant", "room"] },
          tenantName: { type: "string" },
          roomNo: { type: "string" },
          month: { type: "number" },
          year: { type: "number" },
          notes: { type: "string" },
          confirmed: { type: "boolean" },
        },
        required: ["target", "notes"],
        additionalProperties: false,
      },
    },
  },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Telugu/Hindi digit normalization for room numbers, names, etc.
function normalizeDigits(s: string): string {
  if (!s) return s;
  const map: Record<string, string> = {
    "౦":"0","౧":"1","౨":"2","౩":"3","౪":"4","౫":"5","౬":"6","౭":"7","౮":"8","౯":"9",
    "०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9",
  };
  return s.replace(/[౦-౯०-९]/g, (c) => map[c] || c);
}

function actionSummary(name: string, preview: any): string {
  if (name === "mark_payment") {
    return `Record ₹${preview.entry_amount} ${preview.mode} rent for ${preview.tenant} in room ${preview.room} (${preview.month}/${preview.year})`;
  }
  if (name === "add_expense") {
    return `Add expense of ₹${preview.amount} for ${preview.category} (${preview.label})`;
  }
  if (name === "add_tenant") {
    return `Add tenant ${preview.name} to room ${preview.roomNo} with ₹${preview.monthlyRent}/month rent`;
  }
  if (name === "transfer_tenant_room") {
    return `Transfer ${preview.tenant} from room ${preview.fromRoom} to room ${preview.targetRoom}`;
  }
  if (name === "remove_tenant") {
    return `Check out / remove tenant ${preview.tenant} from room ${preview.room}`;
  }
  if (preview.target === "room") return `Update notes for room ${preview.room}: ${preview.notes}`;
  return `Update notes for ${preview.tenant || "tenant"}: ${preview.notes}`;
}

async function createPendingAction(
  supabase: any,
  userId: string,
  pgId: string,
  name: string,
  args: any,
  preview: any,
  transcript: string,
  lang: string,
  source: string,
) {
  const summary = actionSummary(name, preview);
  // Only one active confirmation is allowed per owner and property.
  await supabase.from("voice_action_audit").update({ status: "cancelled" })
    .eq("pg_id", pgId).eq("actor_id", userId).eq("status", "pending");
  const { data, error } = await supabase.from("voice_action_audit").insert({
    pg_id: pgId,
    actor_id: userId,
    action_name: name,
    action_payload: { ...args, confirmed: false, resolvedPreview: preview },
    status: "pending",
    source: source === "typed" ? "typed" : "voice",
    language: lang === "te-IN" ? "te-IN" : "en-IN",
    transcript: transcript.slice(0, 2000),
    summary,
  }).select("id, action_name, summary, expires_at").single();
  if (error) throw new Error(`Could not prepare confirmation: ${error.message}`);
  return data;
}

async function undoAction(supabase: any, audit: any) {
  const before = audit.before_state || {};
  if (audit.action_name === "mark_payment" || (audit.action_name === "update_notes" && before.table === "tenant_payments")) {
    const paymentId = audit.after_state?.payment_id;
    if (paymentId) {
      const { data: current, error: currentError } = await supabase.from("tenant_payments").select("*").eq("id", paymentId).maybeSingle();
      if (currentError) throw currentError;
      const expected = audit.after_state?.row;
      if (!current || !expected || current.amount_paid !== expected.amount_paid ||
          JSON.stringify(current.payment_entries) !== JSON.stringify(expected.payment_entries) ||
          current.notes !== expected.notes) {
        throw new Error("This record changed after the voice action, so automatic undo was stopped for safety.");
      }
    }
    if (before.existed && before.row?.id) {
      const row = { ...before.row };
      delete row.table;
      const { error } = await supabase.from("tenant_payments").update(row).eq("id", row.id);
      if (error) throw error;
    } else if (audit.after_state?.payment_id) {
      const { error } = await supabase.from("tenant_payments").delete().eq("id", audit.after_state.payment_id);
      if (error) throw error;
    }
    return;
  }
  if (audit.action_name === "update_notes" && before.table === "rooms") {
    const { data: current, error: currentError } = await supabase.from("rooms").select("notes").eq("id", before.id).maybeSingle();
    if (currentError) throw currentError;
    if (!current || current.notes !== audit.after_state?.notes) {
      throw new Error("This room note changed after the voice action, so automatic undo was stopped for safety.");
    }
    const { error } = await supabase.from("rooms").update({ notes: before.notes }).eq("id", before.id);
    if (error) throw error;
    return;
  }
  if (audit.action_name === "add_expense" && audit.after_state?.expense_id) {
    const { error } = await supabase.from("expense_entries").delete().eq("id", audit.after_state.expense_id);
    if (error) throw error;
    return;
  }
  if (audit.action_name === "add_tenant" && audit.after_state?.tenant_id) {
    const { error } = await supabase.from("tenants").delete().eq("id", audit.after_state.tenant_id);
    if (error) throw error;
    return;
  }
  if (audit.action_name === "transfer_tenant_room" && before.tenant_id && before.room_id) {
    const { error } = await supabase.from("tenants").update({ room_id: before.room_id }).eq("id", before.tenant_id);
    if (error) throw error;
    return;
  }
  if (audit.action_name === "remove_tenant" && before.tenant_id) {
    const { error } = await supabase.from("tenants").update({ end_date: before.end_date || null }).eq("id", before.tenant_id);
    if (error) throw error;
    return;
  }
  throw new Error("This action cannot be undone safely.");
}

async function resolveTenant(supabase: any, pgId: string, name?: string, roomNo?: string) {
  const today = todayISO();
  const { data: rooms } = await supabase.from("rooms").select("id, room_no").eq("pg_id", pgId);
  const roomIds = (rooms || []).map((r: any) => r.id);
  if (!roomIds.length) return [];
  let q = supabase.from("tenants")
    .select("id, name, phone, monthly_rent, end_date, is_locked, room_id, rooms(room_no)")
    .in("room_id", roomIds);
  if (name) q = q.ilike("name", `%${normalizeDigits(name)}%`);
  const { data: tenants } = await q;
  let list = (tenants || []).filter((t: any) => !t.is_locked && (!t.end_date || t.end_date > today));
  if (roomNo) {
    const rn = normalizeDigits(roomNo).trim();
    list = list.filter((t: any) => (t.rooms?.room_no || "").toLowerCase() === rn.toLowerCase());
  }
  return list;
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
    let q = supabase
      .from("tenants")
      .select("id, name, phone, monthly_rent, start_date, end_date, is_locked, room_id, rooms(room_no)")
      .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"]);
    if (args?.name && args.name.trim()) {
      q = q.ilike("name", `%${normalizeDigits(args.name.trim())}%`);
    } else if (args?.roomNo && args.roomNo.trim()) {
      const rn = normalizeDigits(args.roomNo.trim()).toLowerCase();
      // will filter in memory below
    }
    const { data: tenants } = await q;
    let active = (tenants || []).filter((t: any) => !t.is_locked && (!t.end_date || t.end_date > today));
    if (args?.roomNo && args.roomNo.trim()) {
      const rn = normalizeDigits(args.roomNo.trim()).toLowerCase();
      active = active.filter((t: any) => (t.rooms?.room_no || "").toLowerCase() === rn);
    }
    if (!active.length) return { found: false };
    const ids = active.map((t: any) => t.id);
    const { data: payments } = await supabase
      .from("tenant_payments").select("tenant_id, amount, amount_paid, payment_status, payment_date")
      .in("tenant_id", ids).eq("month", month).eq("year", year);
    const payMap = new Map((payments || []).map((p: any) => [p.tenant_id, p]));
    return {
      found: true,
      tenants: active.map((t: any) => ({
        name: t.name, phone: t.phone, room: t.rooms?.room_no,
        monthly_rent: t.monthly_rent, start_date: t.start_date, end_date: t.end_date,
        is_locked: t.is_locked,
        current_month_status: payMap.get(t.id) || { payment_status: "Pending", amount_paid: 0 },
      })),
    };
  }

  if (name === "get_room_details") {
    const rn = normalizeDigits(args.roomNo || "");
    const { data: room } = await supabase
      .from("rooms").select("id, room_no, floor, capacity, rent_amount, status, notes")
      .eq("pg_id", pgId).eq("room_no", rn).maybeSingle();
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
    const roomIds = (rooms || []).map((room: any) => room.id);
    const { data: tenants } = roomIds.length
      ? await supabase.from("tenants").select("room_id, end_date, is_locked").in("room_id", roomIds)
      : { data: [] as any[] };
    const activeByRoom = new Map<string, number>();
    for (const tenant of tenants || []) {
      if (!tenant.is_locked && (!tenant.end_date || tenant.end_date > today)) {
        activeByRoom.set(tenant.room_id, (activeByRoom.get(tenant.room_id) || 0) + 1);
      }
    }
    const result: any[] = [];
    for (const r of rooms || []) {
      const vacant = (r.capacity || 0) - (activeByRoom.get(r.id) || 0);
      if (vacant > 0) result.push({ room_no: r.room_no, floor: r.floor, vacant_beds: vacant, rent: r.rent_amount });
    }
    return { vacant_rooms: result, total_vacant_beds: result.reduce((s, r) => s + r.vacant_beds, 0) };
  }

  if (name === "mark_payment") {
    const previewTenantId = args.resolvedPreview?.tenant_id;
    const matches = previewTenantId
      ? (await resolveTenant(supabase, pgId)).filter((tenant: any) => tenant.id === previewTenantId)
      : await resolveTenant(supabase, pgId, args.tenantName, args.roomNo);
    if (!matches.length) return { ok: false, reason: "no_tenant_match", hint: "Ask user for clearer name or room." };
    if (matches.length > 1) {
      return {
        ok: false, reason: "ambiguous",
        candidates: matches.map((t: any) => ({ name: t.name, room: t.rooms?.room_no })),
      };
    }
    const t = matches[0];
    const status = args.status as "Paid" | "Partial" | "Pending";
    const monthlyRent = t.monthly_rent || 0;
    const entryAmount = status === "Paid"
      ? (args.amount ?? monthlyRent)
      : status === "Pending" ? 0 : (args.amount ?? 0);
    const mode = args.mode || "upi";
    const collectedBy = args.collectedBy || "Owner";
    const preview = {
      tenant_id: t.id, tenant: t.name, room: t.rooms?.room_no, month, year,
      status, entry_amount: entryAmount, mode, collected_by: collectedBy,
      monthly_rent: monthlyRent,
    };
    if (!args.confirmed) return { ok: false, reason: "needs_confirmation", preview };

    // Fetch existing payment row
    const { data: existing } = await supabase
      .from("tenant_payments").select("*")
      .eq("tenant_id", t.id).eq("month", month).eq("year", year).maybeSingle();
    const prevPaid = existing?.amount_paid || 0;
    const prevEntries = (existing?.payment_entries as any[]) || [];
    let newPaid = prevPaid;
    let newEntries = prevEntries;
    if (status !== "Pending" && entryAmount > 0) {
      newPaid = prevPaid + entryAmount;
      newEntries = [...prevEntries, {
        amount: entryAmount, date: today, mode,
        type: status === "Paid" ? "full" : "partial",
        collectedBy,
      }];
    }
    const finalStatus = newPaid >= monthlyRent && monthlyRent > 0 ? "Paid"
      : newPaid > 0 ? "Partial" : "Pending";
    const { data: saved, error } = await supabase.from("tenant_payments").upsert({
      tenant_id: t.id, month, year,
      amount: monthlyRent, amount_paid: newPaid,
      payment_status: finalStatus, payment_entries: newEntries,
      payment_date: status !== "Pending" ? today : null,
    }, { onConflict: "tenant_id,month,year" }).select("*").single();
    if (error) return { ok: false, error: error.message };
    return {
      ok: true, tenant: t.name, room: t.rooms?.room_no, total_paid: newPaid, status: finalStatus,
      before_state: { table: "tenant_payments", existed: Boolean(existing), row: existing },
      after_state: { payment_id: saved.id, row: saved },
    };
  }

  if (name === "update_notes") {
    if (!args.confirmed) {
      return { ok: false, reason: "needs_confirmation", preview: { target: args.target, notes: args.notes, tenant: args.tenantName, room: args.roomNo } };
    }
    if (args.target === "room") {
      const rn = normalizeDigits(args.roomNo || "");
      const { data: room } = await supabase.from("rooms").select("id, notes").eq("pg_id", pgId).eq("room_no", rn).maybeSingle();
      if (!room) return { ok: false, reason: "room_not_found" };
      const { error } = await supabase.from("rooms").update({ notes: args.notes }).eq("id", room.id);
      if (error) return { ok: false, error: error.message };
      return {
        ok: true, target: "room", room: rn,
        before_state: { table: "rooms", id: room.id, notes: room.notes },
        after_state: { room_id: room.id, notes: args.notes },
      };
    }
    // tenant note → store on tenant_payments.notes for given month
    const matches = await resolveTenant(supabase, pgId, args.tenantName, args.roomNo);
    if (matches.length !== 1) return { ok: false, reason: matches.length ? "ambiguous" : "no_tenant_match" };
    const t = matches[0];
    const { data: existing } = await supabase.from("tenant_payments").select("*")
      .eq("tenant_id", t.id).eq("month", month).eq("year", year).maybeSingle();
    const { data: saved, error } = await supabase.from("tenant_payments").upsert({
      tenant_id: t.id, month, year,
      amount: t.monthly_rent || 0,
      notes: args.notes,
    } as any, { onConflict: "tenant_id,month,year" }).select("*").single();
    if (error) return { ok: false, error: error.message };
    return {
      ok: true, target: "tenant", tenant: t.name,
      before_state: { table: "tenant_payments", existed: Boolean(existing), row: existing },
      after_state: { payment_id: saved.id, row: saved },
    };
  }

  if (name === "get_expenses_summary") {
    let q = supabase.from("expense_entries").select("id, amount, category, subcategory, label, entry_date, month, year")
      .eq("pg_id", pgId).eq("month", month).eq("year", year);
    if (args?.category) q = q.ilike("category", `%${args.category}%`);
    const { data: expenses } = await q;
    const list = expenses || [];
    const total = list.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    const catMap = new Map<string, number>();
    for (const e of list) {
      const c = e.category || "Other";
      catMap.set(c, (catMap.get(c) || 0) + (Number(e.amount) || 0));
    }
    const breakdown = Array.from(catMap.entries()).map(([category, catTotal]) => ({ category, total: catTotal }));
    return { month, year, total_expenses: total, count: list.length, category_breakdown: breakdown, recent: list.slice(0, 5) };
  }

  if (name === "add_expense") {
    const amount = Number(args.amount) || 0;
    const category = args.category || "Other";
    const label = args.label || category;
    const date = args.date || today;
    const preview = { pg_id: pgId, amount, category, label, month, year, date, notes: args.notes || "" };
    if (!args.confirmed) return { ok: false, reason: "needs_confirmation", preview };
    const { data: saved, error } = await supabase.from("expense_entries").insert({
      pg_id: pgId, amount, category, label, month, year, entry_date: date, notes: args.notes || null,
    }).select("*").single();
    if (error) return { ok: false, error: error.message };
    return {
      ok: true, id: saved.id, amount, category, label,
      before_state: { table: "expense_entries", existed: false },
      after_state: { expense_id: saved.id },
    };
  }

  if (name === "get_financial_analytics") {
    const [collection, dayGuestsData, expenseData, overview] = await Promise.all([
      executeTool("get_collection_summary", { month, year }, supabase, pgId),
      executeTool("get_day_guests", {}, supabase, pgId),
      executeTool("get_expenses_summary", { month, year }, supabase, pgId),
      executeTool("get_pg_overview", {}, supabase, pgId),
    ]);
    const rentCollected = collection.collected || 0;
    const dayGuestRevenue = dayGuestsData.total_revenue || 0;
    const totalRevenue = rentCollected + dayGuestRevenue;
    const totalExpenses = expenseData.total_expenses || 0;
    const netProfit = totalRevenue - totalExpenses;
    const expectedRent = overview.expected_monthly_rent || 1;
    const collectionRate = Math.min(100, Math.round((rentCollected / expectedRent) * 100));
    const totalBeds = overview.total_beds || 1;
    const occupiedBeds = overview.active_tenants || 0;
    const occupancyRate = Math.min(100, Math.round((occupiedBeds / totalBeds) * 100));
    return {
      month, year,
      total_revenue: totalRevenue,
      rent_collected: rentCollected,
      day_guest_revenue: dayGuestRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      collection_rate_percent: collectionRate,
      occupancy_rate_percent: occupancyRate,
    };
  }

  if (name === "get_security_deposits") {
    const { data: rooms } = await supabase.from("rooms").select("id, room_no").eq("pg_id", pgId);
    const roomIds = (rooms || []).map((r: any) => r.id);
    let q = supabase.from("tenants").select("id, name, phone, security_deposit_amount, security_deposit_date, security_deposit_mode, rooms(room_no)").in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"]);
    if (args?.tenantName) q = q.ilike("name", `%${normalizeDigits(args.tenantName)}%`);
    const { data: tenants } = await q;
    const list = (tenants || []).map((t: any) => ({
      name: t.name, phone: t.phone, room: t.rooms?.room_no,
      deposit: t.security_deposit_amount || 0,
      date: t.security_deposit_date, mode: t.security_deposit_mode || "upi",
    }));
    const collected = list.filter((t: any) => t.deposit > 0);
    const total = collected.reduce((sum: number, t: any) => sum + t.deposit, 0);
    return {
      total_deposits_collected: total,
      tenants_with_deposits: collected.length,
      pending_deposit_count: list.length - collected.length,
      deposits: list.slice(0, 20),
    };
  }

  if (name === "get_day_guests") {
    const { data: rooms } = await supabase.from("rooms").select("id, room_no").eq("pg_id", pgId);
    const roomIds = (rooms || []).map((r: any) => r.id);
    const { data: guests } = await supabase.from("day_guests")
      .select("id, guest_name, mobile_number, from_date, to_date, number_of_days, total_amount, amount_paid, payment_status, room_no")
      .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false }).limit(20);
    const list = (guests || []).map((g: any) => ({
      name: g.guest_name, phone: g.mobile_number, room_no: g.room_no,
      days: g.number_of_days, from: g.from_date, to: g.to_date,
      total: g.total_amount, paid: g.amount_paid || 0, status: g.payment_status,
    }));
    const totalRev = list.reduce((s: number, g: any) => s + (g.paid || 0), 0);
    return { total_guests: list.length, total_revenue: totalRev, guests: list };
  }

  if (name === "get_electricity_readings") {
    const { data: rooms } = await supabase.from("rooms").select("id, room_no").eq("pg_id", pgId);
    const roomMap = new Map((rooms || []).map((r: any) => [r.id, r.room_no]));
    const roomIds = (rooms || []).map((r: any) => r.id);
    let q = supabase.from("room_electricity_readings")
      .select("id, room_id, units, unit_price, start_reading, end_reading, month, year")
      .in("room_id", roomIds.length ? roomIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("month", month).eq("year", year);
    if (args?.roomNo) {
      const targetRoom = (rooms || []).find((r: any) => r.room_no === normalizeDigits(args.roomNo));
      if (targetRoom) q = q.eq("room_id", targetRoom.id);
    }
    const { data: readings } = await q;
    const list = (readings || []).map((rd: any) => ({
      room: roomMap.get(rd.room_id),
      units: rd.units || 0,
      unit_price: rd.unit_price || 0,
      total_bill: (rd.units || 0) * (rd.unit_price || 0),
      start: rd.start_reading, end: rd.end_reading,
    }));
    const totalUnits = list.reduce((s: number, r: any) => s + r.units, 0);
    const totalBill = list.reduce((s: number, r: any) => s + r.total_bill, 0);
    return { month, year, room_count: list.length, total_units: totalUnits, total_bill: totalBill, readings: list };
  }

  if (name === "get_onboarding_status") {
    const { data: profiles } = await supabase.from("tenant_onboarding_profiles")
      .select("id, full_name, status, verification_status, emergency_contact_name, emergency_contact_phone, created_at")
      .eq("pg_id", pgId).neq("status", "verified").order("created_at", { ascending: false }).limit(15);
    const list = (profiles || []).map((p: any) => ({
      name: p.full_name || "New Tenant",
      status: p.status,
      verification: p.verification_status,
    }));
    return { pending_count: list.length, profiles: list };
  }

  if (name === "prepare_whatsapp_reminder") {
    const matches = await resolveTenant(supabase, pgId, args.tenantName, args.roomNo);
    if (!matches.length) return { ok: false, reason: "no_tenant_match" };
    const t = matches[0];
    const { data: payment } = await supabase.from("tenant_payments").select("amount_paid, amount, payment_status")
      .eq("tenant_id", t.id).eq("month", month).eq("year", year).maybeSingle();
    const due = (t.monthly_rent || 0) - (payment?.amount_paid || 0);
    const msg = `Dear ${t.name}, this is a gentle reminder that your rent for room ${t.rooms?.room_no || ""} (${month}/${year}) of ₹${due} is pending. Please make the payment at your earliest convenience. Thank you!`;
    const cleanPhone = (t.phone || "").replace(/[^\d]/g, "");
    const whatsappUrl = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}` : "";
    return { ok: true, tenant: t.name, room: t.rooms?.room_no, phone: t.phone, due, message: msg, whatsapp_url: whatsappUrl };
  }

  if (name === "add_tenant") {
    const roomNo = normalizeDigits(args.roomNo || "").trim();
    const { data: room } = await supabase.from("rooms").select("id, room_no, capacity, rent_amount")
      .eq("pg_id", pgId).eq("room_no", roomNo).maybeSingle();
    if (!room) return { ok: false, reason: "room_not_found" };
    const preview = {
      name: args.name, phone: args.phone || "",
      roomNo: room.room_no, roomId: room.id,
      monthlyRent: args.monthlyRent || room.rent_amount || 0,
      startDate: args.startDate || today,
      securityDeposit: args.securityDeposit || 0,
    };
    if (!args.confirmed) return { ok: false, reason: "needs_confirmation", preview };
    const { data: saved, error } = await supabase.from("tenants").insert({
      room_id: room.id,
      name: args.name,
      phone: args.phone || "",
      start_date: preview.startDate,
      monthly_rent: preview.monthlyRent,
      security_deposit_amount: preview.securityDeposit,
      security_deposit_date: preview.securityDeposit ? today : null,
      payment_status: "Pending",
    }).select("*").single();
    if (error) return { ok: false, error: error.message };
    return {
      ok: true, tenant: saved.name, room: room.room_no, rent: saved.monthly_rent,
      before_state: { table: "tenants", existed: false },
      after_state: { tenant_id: saved.id },
    };
  }

  if (name === "transfer_tenant_room") {
    const matches = await resolveTenant(supabase, pgId, args.tenantName);
    if (matches.length !== 1) return { ok: false, reason: matches.length ? "ambiguous" : "no_tenant_match" };
    const t = matches[0];
    const targetRoomNo = normalizeDigits(args.targetRoomNo || "").trim();
    const { data: targetRoom } = await supabase.from("rooms").select("id, room_no, capacity")
      .eq("pg_id", pgId).eq("room_no", targetRoomNo).maybeSingle();
    if (!targetRoom) return { ok: false, reason: "target_room_not_found" };
    const preview = { tenant: t.name, tenant_id: t.id, fromRoom: t.rooms?.room_no, targetRoom: targetRoom.room_no, targetRoomId: targetRoom.id };
    if (!args.confirmed) return { ok: false, reason: "needs_confirmation", preview };
    const { error } = await supabase.from("tenants").update({ room_id: targetRoom.id }).eq("id", t.id);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true, tenant: t.name, fromRoom: t.rooms?.room_no, toRoom: targetRoom.room_no,
      before_state: { table: "tenants", tenant_id: t.id, room_id: t.room_id },
      after_state: { tenant_id: t.id, room_id: targetRoom.id },
    };
  }

  if (name === "remove_tenant") {
    const matches = await resolveTenant(supabase, pgId, args.tenantName, args.roomNo);
    if (matches.length !== 1) return { ok: false, reason: matches.length ? "ambiguous" : "no_tenant_match" };
    const t = matches[0];
    const preview = { tenant: t.name, tenant_id: t.id, room: t.rooms?.room_no, end_date: t.end_date };
    if (!args.confirmed) return { ok: false, reason: "needs_confirmation", preview };
    const { error } = await supabase.from("tenants").update({ end_date: today }).eq("id", t.id);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true, tenant: t.name, room: t.rooms?.room_no,
      before_state: { table: "tenants", tenant_id: t.id, end_date: t.end_date },
      after_state: { tenant_id: t.id, end_date: today },
    };
  }

  return { error: `Unknown tool: ${name}` };
}

function formatRupees(value: number | null | undefined): string {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function deterministicReply(toolName: string, result: any, isTelugu: boolean): string {
  if (toolName === "get_pg_overview") {
    return isTelugu
      ? `${result.total_rooms || 0} గదులు, ${result.active_tenants || 0} యాక్టివ్ టెనెంట్లు, ${result.vacant_beds || 0} ఖాళీ బెడ్లు ఉన్నాయి. నెలకు అంచనా అద్దె ${formatRupees(result.expected_monthly_rent)}.`
      : `${result.total_rooms || 0} rooms, ${result.active_tenants || 0} active tenants and ${result.vacant_beds || 0} vacant beds. Expected monthly rent is ${formatRupees(result.expected_monthly_rent)}.`;
  }
  if (toolName === "get_collection_summary") {
    return isTelugu
      ? `${result.month}/${result.year}లో ${formatRupees(result.collected)} వసూలైంది. ఇంకా ${formatRupees(result.pending)} పెండింగ్‌లో ఉంది.`
      : `For ${result.month}/${result.year}, ${formatRupees(result.collected)} is collected and ${formatRupees(result.pending)} is pending.`;
  }
  if (toolName === "list_pending_tenants") {
    const list = (result.pending_tenants || []).slice(0, 6)
      .map((tenant: any) => `${tenant.name}, room ${tenant.room}, ${formatRupees(tenant.due)}`)
      .join("; ");
    if (!result.count) return isTelugu ? "ఈ నెల పెండింగ్ అద్దె లేదు." : "There is no pending rent for this month.";
    const more = result.count > 6 ? ` ${result.count - 6} more.` : "";
    return isTelugu
      ? `${result.count} మంది టెనెంట్ల అద్దె పెండింగ్‌లో ఉంది: ${list}.${more}`
      : `${result.count} tenants have pending rent: ${list}.${more}`;
  }
  if (toolName === "get_vacant_beds") {
    const rooms = (result.vacant_rooms || []).slice(0, 6)
      .map((room: any) => `room ${room.room_no}: ${room.vacant_beds}`)
      .join(", ");
    if (!result.total_vacant_beds) return isTelugu ? "ప్రస్తుతం ఖాళీ బెడ్లు లేవు." : "There are no vacant beds right now.";
    return isTelugu
      ? `మొత్తం ${result.total_vacant_beds} ఖాళీ బెడ్లు ఉన్నాయి. ${rooms}.`
      : `There are ${result.total_vacant_beds} vacant beds. ${rooms}.`;
  }
  if (toolName === "get_room_details") {
    if (!result.found) return isTelugu ? "ఆ గది కనబడలేదు." : "I couldn't find that room.";
    const names = (result.active_tenants || []).map((tenant: any) => tenant.name).join(", ");
    return isTelugu
      ? `రూమ్ ${result.room.room_no}లో ${result.active_tenants?.length || 0} మంది యాక్టివ్ టెనెంట్లు ఉన్నారు${names ? `: ${names}` : ""}.`
      : `Room ${result.room.room_no} has ${result.active_tenants?.length || 0} active tenants${names ? `: ${names}` : ""}.`;
  }
  if (toolName === "find_tenant") {
    if (!result.found || !result.tenants?.length) return isTelugu ? "టెనెంట్లు ఎవరూ కనబడలేదు." : "I couldn't find any matching tenants.";
    if (result.tenants.length === 1) {
      const t = result.tenants[0];
      return isTelugu
        ? `${t.name}, రూమ్ ${t.room || "–"}, అద్దె ${formatRupees(t.monthly_rent)}, స్టేటస్ ${t.current_month_status?.payment_status || "Pending"}.`
        : `${t.name}, room ${t.room || "–"}, rent ${formatRupees(t.monthly_rent)}, status ${t.current_month_status?.payment_status || "Pending"}.`;
    }
    const count = result.tenants.length;
    const list = result.tenants.slice(0, 6).map((t: any) => `${t.name} (Room ${t.room || "–"})`).join(", ");
    const more = count > 6 ? (isTelugu ? ` మరియు మరో ${count - 6} మంది` : ` and ${count - 6} more`) : "";
    return isTelugu
      ? `మొత్తం ${count} మంది టెనెంట్లు ఉన్నారు: ${list}${more}.`
      : `You have ${count} active tenants: ${list}${more}.`;
  }
  if (toolName === "get_expenses_summary") {
    return isTelugu
      ? `${result.month}/${result.year} ఖర్చులు మొత్తం ${formatRupees(result.total_expenses)} (${result.count} అంశాలు).`
      : `Total expenses for ${result.month}/${result.year} are ${formatRupees(result.total_expenses)} across ${result.count} entries.`;
  }
  if (toolName === "get_financial_analytics") {
    return isTelugu
      ? `${result.month}/${result.year} ఆదాయం ${formatRupees(result.total_revenue)}, ఖర్చులు ${formatRupees(result.total_expenses)}, నికర లాభం ${formatRupees(result.net_profit)}.`
      : `For ${result.month}/${result.year}, total revenue is ${formatRupees(result.total_revenue)}, expenses are ${formatRupees(result.total_expenses)}, giving a net profit of ${formatRupees(result.net_profit)}.`;
  }
  if (toolName === "get_security_deposits") {
    return isTelugu
      ? `మొత్తం సెక్యూరిటీ డిపాజిట్ ${formatRupees(result.total_deposits_collected)} వసూలైంది (${result.tenants_with_deposits} మంది టెనెంట్లు).`
      : `Total security deposits collected are ${formatRupees(result.total_deposits_collected)} from ${result.tenants_with_deposits} tenants.`;
  }
  if (toolName === "get_day_guests") {
    return isTelugu
      ? `మొత్తం ${result.total_guests} మంది డే గెస్ట్‌లు ఉన్నారు, ఆదాయం ${formatRupees(result.total_revenue)}.`
      : `You have ${result.total_guests} day guests with total revenue of ${formatRupees(result.total_revenue)}.`;
  }
  if (toolName === "get_electricity_readings") {
    return isTelugu
      ? `${result.month}/${result.year} విద్యుత్ వాడకం ${result.total_units} యూనిట్లు, బిల్లు ${formatRupees(result.total_bill)}.`
      : `For ${result.month}/${result.year}, electricity usage is ${result.total_units} units, billing ${formatRupees(result.total_bill)}.`;
  }
  if (toolName === "get_onboarding_status") {
    return isTelugu
      ? `${result.pending_count} మంది టెనెంట్ల ఆన్‌బోర్డింగ్ పెండింగ్‌లో ఉంది.`
      : `${result.pending_count} tenant onboarding profiles are currently pending.`;
  }
  if (toolName === "prepare_whatsapp_reminder") {
    if (!result.ok) return "Couldn't prepare reminder: " + (result.reason || "tenant not found");
    return isTelugu
      ? `${result.tenant} కి రూమ్ ${result.room} కోసం ${formatRupees(result.due)} వాట్సాప్ రిమైండర్ సిద్ధమైంది.`
      : `Prepared a WhatsApp rent reminder for ${result.tenant} in room ${result.room} for ${formatRupees(result.due)}.`;
  }
  if (toolName === "mark_payment") {
    if (result.reason === "needs_confirmation") {
      const preview = result.preview;
      return isTelugu
        ? `${preview.tenant}, రూమ్ ${preview.room} కోసం ${formatRupees(preview.entry_amount)} ${preview.mode} అద్దె నమోదు చేయాలా? సేవ్ చేయడానికి అవును అని చెప్పండి.`
        : `Confirm: record ${formatRupees(preview.entry_amount)} ${preview.mode} rent for ${preview.tenant} in room ${preview.room}? Say yes to save.`;
    }
    if (result.reason === "ambiguous") {
      const choices = (result.candidates || []).map((candidate: any) => `${candidate.name}, room ${candidate.room}`).join("; ");
      return `I found multiple matching tenants. Please specify one: ${choices}.`;
    }
    if (result.reason === "no_tenant_match") return isTelugu ? "టెనెంట్ కనబడలేదు. పేరు లేదా రూమ్ నంబర్ మళ్లీ చెప్పండి." : "I couldn't identify the tenant. Please say the name or room number again.";
  }
  if (toolName === "add_expense" && result.reason === "needs_confirmation") {
    return `Confirm: add expense of ${formatRupees(result.preview?.amount)} for ${result.preview?.category}? Say yes to save.`;
  }
  if (toolName === "add_tenant" && result.reason === "needs_confirmation") {
    return `Confirm: add ${result.preview?.name} to room ${result.preview?.roomNo} at ${formatRupees(result.preview?.monthlyRent)}/mo? Say yes to save.`;
  }
  if (toolName === "transfer_tenant_room" && result.reason === "needs_confirmation") {
    return `Confirm: move ${result.preview?.tenant} to room ${result.preview?.targetRoom}? Say yes to save.`;
  }
  if (toolName === "remove_tenant" && result.reason === "needs_confirmation") {
    return `Confirm: check out/remove ${result.preview?.tenant} from room ${result.preview?.room}? Say yes to save.`;
  }
  return isTelugu ? "ఆ అభ్యర్థనను పూర్తి చేయలేకపోయాను." : "I couldn't complete that request.";
}

function conversationalFallback(
  text: string,
  isTelugu: boolean,
  pgName: string,
  snapshot?: any,
  collection?: any,
): string {
  const clean = normalizeVoiceText(text).replace(/\s*\|.*$/, "").trim();
  const lower = clean.toLowerCase();

  // Percentage or math calculation
  const percentMatch = lower.match(/(?:what(?:'s|\s+is)\s+)?(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*([\d,]+)/i);
  if (percentMatch) {
    const pct = parseFloat(percentMatch[1]);
    const total = parseFloat(percentMatch[2].replace(/,/g, ""));
    const ans = (pct / 100) * total;
    return isTelugu
      ? `${total} లో ${pct}% అంటే ${ans.toLocaleString("en-IN")}.`
      : `${pct}% of ${total.toLocaleString("en-IN")} is ${ans.toLocaleString("en-IN")}.`;
  }

  // Greetings
  if (/^(hi|hello|hey|namaste|నమస్తే|హలో)\b/u.test(lower)) {
    return isTelugu
      ? `నమస్తే! నేను మీ PG Hub AI అసిస్టెంట్. ${pgName} లేదా ఇతర విషయాలపై మీకు ఎలా సహాయపడగలను?`
      : `Hello! I'm PG Hub AI, your voice assistant for ${pgName}. How can I help you today?`;
  }

  // Thanks
  if (/thank|thanks|ధన్యవాద/u.test(lower)) {
    return isTelugu ? "సంతోషం! ఇంకేమైనా సహాయం కావాలా?" : "You're welcome! Let me know what you'd like to check next.";
  }

  // Jokes
  if (/\bjoke|నవ్వించు/u.test(lower)) {
    return isTelugu
      ? "టెనెంట్ ఓనర్‌తో: 'రూమ్‌లో వై-ఫై సరిగ్గా రావట్లేదు.' ఓనర్: 'రూమ్ అద్దె రాని చోట వై-ఫై ఎలా వస్తుంది బాబూ!' 😄"
      : "Why did the tenant break up with their landlord? Because they couldn't find common ground on rent! 😄";
  }

  // EBITDA / Financial concept
  if (/ebitda/i.test(lower)) {
    return "EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization. It measures a business's core operating profitability.";
  }

  // Quantum computing or science
  if (/quantum computing/i.test(lower)) {
    return "Quantum computing uses quantum bits or qubits that exist in superposition, allowing them to solve complex computations exponentially faster than classical computers.";
  }

  // Capabilities
  if (/what can you do|help|commands?|who are you|ఏమి చేయగల/u.test(lower)) {
    return isTelugu
      ? `నేను PG Hub AI. మీరు నన్ను సాధారణ నాలెడ్జ్, లెక్కలు, లేదా ${pgName} అద్దె వసూలు, పెండింగ్ టెనెంట్లు, ఖాళీ బెడ్లు, ఖర్చులు మొదలైన వాటి గురించి అడగవచ్చు.`
      : `I am PG Hub AI. I can answer any general questions, help with calculations or writing, and deeply manage your PG's rent, pending dues, rooms, expenses, and tenant records.`;
  }

  // Bed & vacancy queries using snapshot
  if (/occupan|vacan|bed|ఖాళీ/i.test(lower) && snapshot) {
    return isTelugu
      ? `${pgName} లో ${snapshot.vacant_beds || 0} ఖాళీ బెడ్లు మరియు ${snapshot.active_tenants || 0} యాక్టివ్ టెనెంట్లు ఉన్నారు.`
      : `You currently have ${snapshot.vacant_beds || 0} vacant beds and ${snapshot.active_tenants || 0} active tenants.`;
  }

  // Rent / collection queries using snapshot
  if (/collect|pending|rent|అద్దె/i.test(lower) && collection) {
    return isTelugu
      ? `ఈ నెలలో ${formatRupees(collection.collected)} వసూలైంది, ఇంకా ${formatRupees(collection.pending)} పెండింగ్‌లో ఉంది.`
      : `This month, ${formatRupees(collection.collected)} is collected and ${formatRupees(collection.pending)} is pending.`;
  }

  // Travel / booking / calling external services
  if (/\b(?:train|cab|taxi|flight|uber|ola|bus|ticket|hotel|call the)\b/i.test(lower)) {
    return isTelugu
      ? `నేను నేరుగా రైలు లేదా క్యాబ్‌ను బుక్ చేయలేను, కానీ ప్రయాణ ఖర్చులు లెక్కించడంలో లేదా మీ పీజీ సమాచారంలో సహాయపడగలను.`
      : `I cannot make external phone calls or book train tickets directly, but I can help plan travel budgets, calculate costs, or manage your PG anytime!`;
  }

  // General questions or greetings fallback
  if (/\b(?:how are you|how are things|how's it going|బాగున్నారా|ఎలా ఉన్నారు)\b/i.test(lower)) {
    return isTelugu
      ? `నేను చాలా బాగున్నాను! మీకు ఈరోజు ఎలా సహాయపడగలను?`
      : `I'm doing great! How can I help you today with ${pgName} or anything else?`;
  }

  return isTelugu
    ? `“${clean.slice(0, 90)}” గురించి విన్నాను. నేను సాధారణ ప్రశ్నలు, లెక్కలు మరియు మీ పీజీ వివరాలు రెండింటికీ సహాయం చేయగలను.`
    : `I heard "${clean.slice(0, 90)}". I'm here to answer general questions, help with calculations, or manage any details for ${pgName}.`;
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
    const auditAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages = [], pgId, lang = "en-IN", operation = "chat", actionId, source = "voice" } = body;
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

    // Writes never trust conversational memory. Confirmation and undo operate on
    // durable, owner-scoped database records created by this function.
    if (operation === "history") {
      const { data, error } = await supabase.from("voice_action_audit")
        .select("id, action_name, status, source, language, transcript, summary, result, created_at, confirmed_at, undone_at")
        .eq("pg_id", pgId).eq("actor_id", userData.user.id)
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return new Response(JSON.stringify({ audit: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation === "cancel") {
      if (!actionId) throw new Error("actionId required");
      const { data, error } = await auditAdmin.from("voice_action_audit")
        .update({ status: "cancelled" }).eq("id", actionId).eq("pg_id", pgId)
        .eq("actor_id", userData.user.id).eq("status", "pending")
        .select("id").maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ reply: data ? "Cancelled. Nothing was changed." : "That action is no longer pending." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation === "confirm") {
      if (!actionId) throw new Error("actionId required");
      const { data: audit, error } = await supabase.from("voice_action_audit").select("*")
        .eq("id", actionId).eq("pg_id", pgId).eq("actor_id", userData.user.id)
        .eq("status", "pending").maybeSingle();
      if (error) throw error;
      if (!audit) throw new Error("This action is no longer pending.");
      if (new Date(audit.expires_at).getTime() < Date.now()) {
        await auditAdmin.from("voice_action_audit").update({ status: "expired" }).eq("id", audit.id).eq("status", "pending");
        throw new Error("Confirmation expired. Please say the command again.");
      }
      const { data: claimed, error: claimError } = await auditAdmin.from("voice_action_audit")
        .update({ status: "executing" }).eq("id", audit.id).eq("status", "pending")
        .select("id").maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) throw new Error("This action is already being processed.");
      const result = await executeTool(audit.action_name, { ...audit.action_payload, confirmed: true }, supabase, pgId);
      if (!result?.ok) {
        await auditAdmin.from("voice_action_audit").update({ status: "failed", result }).eq("id", audit.id).eq("status", "executing");
        throw new Error(result?.error || result?.reason || "Action failed");
      }
      const publicResult = { ...result };
      delete publicResult.before_state;
      delete publicResult.after_state;
      const { error: updateError } = await auditAdmin.from("voice_action_audit").update({
        status: "completed",
        confirmed_at: new Date().toISOString(),
        before_state: result.before_state,
        after_state: result.after_state,
        result: publicResult,
      }).eq("id", audit.id).eq("status", "executing");
      if (updateError) throw updateError;
      const reply = audit.action_name === "mark_payment"
        ? `Done. Recorded ₹${audit.action_payload.resolvedPreview?.entry_amount ?? audit.action_payload.amount} for ${result.tenant} in room ${result.room}. You can undo this action.`
        : `Done. ${audit.summary}. You can undo this action.`;
      return new Response(JSON.stringify({ reply, completedAction: { id: audit.id, summary: audit.summary }, actionResult: publicResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation === "undo") {
      let query = supabase.from("voice_action_audit").select("*")
        .eq("pg_id", pgId).eq("actor_id", userData.user.id).eq("status", "completed")
        .order("created_at", { ascending: false }).limit(1);
      if (actionId) query = query.eq("id", actionId);
      const { data, error } = await query;
      if (error) throw error;
      const audit = data?.[0];
      if (!audit) throw new Error("There is no completed action available to undo.");
      const { data: claimed, error: claimError } = await auditAdmin.from("voice_action_audit")
        .update({ status: "undoing" }).eq("id", audit.id).eq("status", "completed")
        .select("id").maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) throw new Error("This action is already being reversed.");
      try {
        await undoAction(supabase, audit);
      } catch (undoError) {
        await auditAdmin.from("voice_action_audit").update({ status: "completed" }).eq("id", audit.id).eq("status", "undoing");
        throw undoError;
      }
      const { error: updateError } = await auditAdmin.from("voice_action_audit").update({
        status: "undone", undone_at: new Date().toISOString(),
      }).eq("id", audit.id).eq("status", "undoing");
      if (updateError) throw updateError;
      return new Response(JSON.stringify({ reply: `Undone. ${audit.summary} was reversed.`, undoneAction: { id: audit.id } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation !== "chat") throw new Error("Unsupported operation");

    const isTelugu = lang === "te-IN";
    const latestUserText = [...messages].reverse().find((message: any) => message?.role === "user")?.content || "";
    const deterministicIntent = classifyVoiceCommand(latestUserText);
    if (deterministicIntent) {
      const result = await executeTool(deterministicIntent.tool, deterministicIntent.args, supabase, pgId);
      let deterministicPendingAction: any = null;
      if (WRITE_ACTIONS.has(deterministicIntent.tool) && result?.reason === "needs_confirmation") {
        deterministicPendingAction = await createPendingAction(
          auditAdmin,
          userData.user.id,
          pgId,
          deterministicIntent.tool,
          deterministicIntent.args,
          result.preview,
          latestUserText,
          lang,
          source,
        );
      }
      return new Response(JSON.stringify({
        reply: deterministicReply(deterministicIntent.tool, result, isTelugu),
        pendingAction: deterministicPendingAction,
        processingMode: "fast",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pre-fetch a snapshot so the model or fallback can resolve queries accurately
    const [snapshot, collection] = await Promise.all([
      executeTool("get_pg_overview", {}, supabase, pgId).catch(() => null),
      executeTool("get_collection_summary", {}, supabase, pgId).catch(() => null),
    ]);

    let openAiKey = OPENAI_API_KEY;
    let geminiKey = GEMINI_API_KEY;
    let lovableKey = LOVABLE_API_KEY;

    if (!openAiKey && !geminiKey && !lovableKey) {
      try {
        const { data: dbKey } = await auditAdmin.rpc("get_voice_agent_secret", { secret_name: "OPENAI_API_KEY" });
        if (dbKey && typeof dbKey === "string" && !dbKey.includes("your-openai-api-key") && dbKey.startsWith("sk-")) {
          openAiKey = dbKey;
        }
      } catch {}
      try {
        const { data: geminiDbKey } = await auditAdmin.rpc("get_voice_agent_secret", { secret_name: "GEMINI_API_KEY" });
        if (geminiDbKey && typeof geminiDbKey === "string" && !geminiDbKey.includes("your-") && geminiDbKey.length > 10) {
          geminiKey = geminiDbKey;
        }
      } catch {}
    }

    const hasAiKey = Boolean(lovableKey || openAiKey || geminiKey);
    if (!hasAiKey) {
      const reply = conversationalFallback(latestUserText, isTelugu, pg.name, snapshot, collection);
      return new Response(JSON.stringify({ reply, processingMode: "fast" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let aiEndpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
    let aiHeaders: Record<string, string> = {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    };
    let aiModel = "google/gemini-2.5-flash";

    if (!lovableKey && openAiKey) {
      aiEndpoint = "https://api.openai.com/v1/chat/completions";
      aiHeaders = {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      };
      aiModel = "gpt-4o-mini";
    } else if (!lovableKey && geminiKey) {
      aiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      aiHeaders = {
        Authorization: `Bearer ${geminiKey}`,
        "Content-Type": "application/json",
      };
      aiModel = "gemini-2.5-flash";
    }

    // ── Context Compression (Headroom-style) ──────────────────────
    // 1. Compressed system prompt (~40% fewer tokens)
    const systemPrompt = compressSystemPrompt(pg.name, isTelugu, snapshot, collection);

    // 2. Trim conversation history (older turns → recap)
    const trimmedMessages = trimConversation(messages, 3);

    const convo: any[] = [{ role: "system", content: systemPrompt }, ...trimmedMessages];
    let pendingAction: any = null;

    // 3. Log token estimate before LLM call
    const tokensBefore = estimateConversationTokens(convo);
    console.log(`[compress] convo tokens (est): ${tokensBefore} | msgs: ${convo.length} | trimmed: ${messages.length - trimmedMessages.length} old msgs`);

    // Tool-calling loop
    for (let step = 0; step < 3; step++) {
      const aiResp = await fetch(aiEndpoint, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: aiModel,
          messages: convo,
          tools,
          temperature: 0.2,
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.warn("AI gateway error:", aiResp.status, errText);
        // If AI gateway/credits fail, gracefully fall back to conversational response rather than 500 error
        const reply = conversationalFallback(latestUserText, isTelugu, pg.name, snapshot, collection);
        return new Response(JSON.stringify({ reply, processingMode: "fast" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await aiResp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;
      convo.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return new Response(JSON.stringify({ reply: msg.content || "", pendingAction }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const tc of toolCalls) {
        let parsed: any = {};
        try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch {}
        // A model cannot authorize a write. Every chat-originated write is preview-only.
        if (WRITE_ACTIONS.has(tc.function.name)) parsed.confirmed = false;
        const result = await executeTool(tc.function.name, parsed, supabase, pgId);

        if (WRITE_ACTIONS.has(tc.function.name) && result?.reason === "needs_confirmation" && !pendingAction) {
          pendingAction = await createPendingAction(
            auditAdmin,
            userData.user.id,
            pgId,
            tc.function.name,
            parsed,
            result.preview,
            messages[messages.length - 1]?.content || "",
            lang,
            source,
          );
          result.confirmation_id = pendingAction.id;
          result.instruction = "Tell the user the exact summary and ask them to explicitly confirm.";
        }

        // ── Crush tool result JSON → terse text (60-80% fewer tokens) ──
        const crushed = crushJSON(tc.function.name, result);
        console.log(`[compress] tool ${tc.function.name}: ${JSON.stringify(result).length} chars → ${crushed.length} chars (${Math.round((1 - crushed.length / Math.max(1, JSON.stringify(result).length)) * 100)}% saved)`);

        convo.push({
          role: "tool",
          tool_call_id: tc.id,
          content: crushed,
        });
      }
    }

    return new Response(JSON.stringify({ reply: "I couldn't complete that request.", pendingAction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("voice-agent error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
