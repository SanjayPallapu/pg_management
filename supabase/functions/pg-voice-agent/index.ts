import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crushJSON, compressSystemPrompt, trimConversation, estimateConversationTokens } from "./compress.ts";
import { classifyVoiceCommand } from "./intent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WRITE_ACTIONS = new Set(["mark_payment", "update_notes"]);

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
    if (!result.found) return isTelugu ? "ఆ టెనెంట్ కనబడలేదు." : "I couldn't find that tenant.";
    return (result.tenants || []).slice(0, 3).map((tenant: any) =>
      `${tenant.name}, room ${tenant.room}, rent ${formatRupees(tenant.monthly_rent)}, status ${tenant.current_month_status?.payment_status || "Pending"}`
    ).join(". ");
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
  return isTelugu ? "ఆ అభ్యర్థనను పూర్తి చేయలేకపోయాను." : "I couldn't complete that request.";
}

function conversationalFallback(text: string, isTelugu: boolean, pgName: string): string {
  const clean = normalizeVoiceText(text).replace(/\s*\|.*$/, "").trim();
  const lower = clean.toLowerCase();
  if (/^(hi|hello|hey|namaste|నమస్తే|హలో)\b/u.test(lower)) {
    return isTelugu
      ? `నమస్తే! ${pgName} కోసం నేను సిద్ధంగా ఉన్నాను. ఈ నెల కలెక్షన్, పెండింగ్ అద్దె, ఖాళీ బెడ్లు లేదా టెనెంట్ గురించి అడగండి.`
      : `Hi! I'm ready to help with ${pgName}. Ask naturally about this month's collection, pending rent, vacant beds, a room, or a tenant.`;
  }
  if (/thank|thanks|ధన్యవాద/u.test(lower)) {
    return isTelugu ? "సంతోషం. ఇంకేమైనా చూసి చెప్పాలా?" : "You're welcome. What would you like me to check next?";
  }
  if (/what can you do|help|commands?|ఏమి చేయగల/u.test(lower)) {
    return isTelugu
      ? "నేను కలెక్షన్ చెప్పగలను, పెండింగ్ టెనెంట్లను చూపగలను, ఖాళీ బెడ్లు లేదా రూమ్ వివరాలు చూడగలను. అద్దె చెల్లింపును సేవ్ చేసే ముందు మీ నిర్ధారణ తీసుకుంటాను."
      : "I can check collections, pending tenants, vacancies, rooms and tenant details. I can also prepare a rent payment, read it back, and save it only after you confirm.";
  }
  return isTelugu
    ? `“${clean.slice(0, 90)}” అని విన్నాను. దానికి సరైన రికార్డు దొరకలేదు. టెనెంట్ పేరు లేదా రూమ్ నంబర్‌తో మళ్లీ చెప్పండి.`
    : `I heard “${clean.slice(0, 90)}”. I couldn't match that to a safe PG action yet. Try again with the tenant name or room number, and what you want to check.`;
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

    if (!LOVABLE_API_KEY) {
      const reply = conversationalFallback(latestUserText, isTelugu, pg.name);
      return new Response(JSON.stringify({ reply, processingMode: "fast" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-fetch a tiny snapshot so the model can resolve pronouns/short refs without extra round-trips
    const [snapshot, collection] = await Promise.all([
      executeTool("get_pg_overview", {}, supabase, pgId).catch(() => null),
      executeTool("get_collection_summary", {}, supabase, pgId).catch(() => null),
    ]);

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
          temperature: 0.1,
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
