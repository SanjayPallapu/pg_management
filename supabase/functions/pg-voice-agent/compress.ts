/**
 * compress.ts — Headroom-style context compression for PG Voice Agent
 *
 * Reduces token usage ~60% by:
 *   1. Crushing verbose JSON tool results into terse natural-language summaries
 *   2. Building a compact system prompt (40% smaller)
 *   3. Trimming old conversation turns to a sliding window + summary
 */

// ─── Money Formatting ───────────────────────────────────────────────

/** 145000 → "₹1.45L", 8500 → "₹8.5K", 500 → "₹500" */
export function formatMoney(n: number | null | undefined): string {
  if (n == null || n === 0) return "₹0";
  if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, "")}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `₹${n}`;
}

// ─── JSON Crushing (tool results → terse text) ─────────────────────

/**
 * Converts a tool result JSON object into a compact string the LLM reads
 * just as well — but at 60-80% fewer tokens.
 */
export function crushJSON(toolName: string, data: any): string {
  if (!data) return "no data";

  try {
    switch (toolName) {
      case "get_pg_overview":
        return [
          `PG: ${data.total_rooms} rooms, ${data.total_beds} beds`,
          `${data.active_tenants} tenants, ${data.vacant_beds} vacant`,
          `expected rent: ${formatMoney(data.expected_monthly_rent)}/mo`,
        ].join(" | ");

      case "get_collection_summary":
        return [
          `${monthLabel(data.month, data.year)}`,
          `collected ${formatMoney(data.collected)}, pending ${formatMoney(data.pending)}`,
          `${data.paid_count} paid, ${data.partial_count} partial, ${data.unpaid_count} unpaid`,
          `/ ${data.total_active_tenants} tenants`,
        ].join(" | ");

      case "list_pending_tenants": {
        const list = (data.pending_tenants || [])
          .slice(0, 20)
          .map((t: any) => `${t.name}(R${t.room}) ${formatMoney(t.due)} ${t.status}`)
          .join("; ");
        return `${data.count} pending ${monthLabel(data.month, data.year)}: ${list}`;
      }

      case "find_tenant": {
        if (!data.found) return "tenant not found";
        const tenants = (data.tenants || []).map((t: any) => {
          const pay = t.current_month_status;
          return [
            `${t.name} R${t.room} ${formatMoney(t.monthly_rent)}/mo`,
            `ph:${t.phone || "–"}`,
            `joined:${t.start_date || "–"}`,
            t.end_date ? `left:${t.end_date}` : "",
            t.is_locked ? "LOCKED" : "",
            `status:${pay?.payment_status || "Pending"} paid:${formatMoney(pay?.amount_paid)}`,
          ].filter(Boolean).join(" ");
        });
        return tenants.join(" || ");
      }

      case "get_room_details": {
        if (!data.found) return "room not found";
        const r = data.room;
        const tenants = (data.active_tenants || [])
          .map((t: any) => `${t.name} ${formatMoney(t.monthly_rent)}`)
          .join(", ");
        return [
          `R${r.room_no} F${r.floor} cap:${r.capacity} rent:${formatMoney(r.rent_amount)} ${r.status || ""}`,
          r.notes ? `note:"${r.notes}"` : "",
          tenants ? `tenants: ${tenants}` : "empty",
        ].filter(Boolean).join(" | ");
      }

      case "get_vacant_beds": {
        const rooms = (data.vacant_rooms || [])
          .map((r: any) => `R${r.room_no}(F${r.floor}):${r.vacant_beds}bed ${formatMoney(r.rent)}`)
          .join("; ");
        return `${data.total_vacant_beds} vacant beds — ${rooms || "none"}`;
      }

      case "mark_payment": {
        if (data.ok) {
          return `✓ ${data.tenant} R${data.room} → ${data.status}, total paid ${formatMoney(data.total_paid)}`;
        }
        if (data.reason === "needs_confirmation") {
          const p = data.preview;
          return `CONFIRM? ${p.tenant} R${p.room} ${monthLabel(p.month, p.year)}: ${p.status} ${formatMoney(p.entry_amount)} ${p.mode} by ${p.collected_by} (rent ${formatMoney(p.monthly_rent)})`;
        }
        if (data.reason === "ambiguous") {
          const cands = (data.candidates || []).map((c: any) => `${c.name} R${c.room}`).join(", ");
          return `ambiguous — which one? ${cands}`;
        }
        return data.reason || data.error || JSON.stringify(data);
      }

      case "update_notes": {
        if (data.ok) return `✓ note saved on ${data.target} ${data.tenant || data.room || ""}`;
        if (data.reason === "needs_confirmation") {
          const p = data.preview;
          return `CONFIRM? add note on ${p.target} ${p.tenant || p.room || ""}: "${p.notes}"`;
        }
        return data.reason || data.error || JSON.stringify(data);
      }

      default:
        // Fallback: compact JSON (no pretty printing)
        return JSON.stringify(data);
    }
  } catch {
    return JSON.stringify(data);
  }
}

function monthLabel(m?: number, y?: number): string {
  if (!m) return "";
  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[m] || m}-${y || ""}`;
}

// ─── System Prompt Compression ──────────────────────────────────────

/**
 * Builds a compact system prompt (~900 tokens vs ~1,500 original).
 * Same instructions, 40% fewer tokens.
 */
export function compressSystemPrompt(
  pgName: string,
  isTelugu: boolean,
  snapshot: any,
  collection: any,
): string {
  const langBlock = isTelugu
    ? `LANG: Telugu (తెలుగు). Reply in natural spoken Telugu. Numbers in Telugu (e.g. "పన్నెండు వేల రూపాయలు"). English only for proper nouns. Greet with "నమస్కారం". Fuzzy-match misheard names/rooms, read back to confirm.`
    : `LANG: English (Indian). Say "rupees" for money. Pick most plausible interpretation from voice alternates separated by " | ".`;

  const snapshotStr = snapshot ? crushJSON("get_pg_overview", snapshot) : "unavailable";
  const collectionStr = collection ? crushJSON("get_collection_summary", collection) : "unavailable";

  return `You are voice assistant for "${pgName}" PG hostel. Owner speaks by VOICE.

${langBlock}

STYLE: Real conversation, warm, human. 1-3 SHORT sentences. No markdown/bullets/asterisks. Track last tenant+room for pronouns (he/she/that room → last mentioned). If ambiguous, ask ONE question. Use acknowledgements (Sure/Got it/సరే/అలాగే).

DATA: ALWAYS use tools for real data. Never fabricate. Summarize tool results in 1-3 spoken sentences. Stay on PG topics.

WRITES (mark_payment/update_notes): NEVER confirmed=true on first turn. Step 1: call with confirmed=false or read back action. Step 2: only after user confirms (yes/haan/సరే/అవును/ఓకే) → confirmed=true. If ambiguous, ask user to pick.

LIVE DATA: ${snapshotStr} | ${collectionStr}

Today: ${new Date().toISOString().slice(0, 10)}.`;
}

// ─── Conversation Trimming ──────────────────────────────────────────

/**
 * Trims conversation to a sliding window of recent messages.
 * Older messages are summarized into a single "recap" message.
 *
 * @param messages - Full conversation array (user + assistant messages, no system)
 * @param maxRecentTurns - Number of recent user+assistant pairs to keep verbatim (default 3 = 6 msgs)
 * @returns Trimmed messages array
 */
export function trimConversation(
  messages: any[],
  maxRecentTurns: number = 3,
): any[] {
  // Filter out system messages (handled separately)
  const convoMsgs = messages.filter((m: any) => m.role !== "system");

  const maxRecent = maxRecentTurns * 2; // user + assistant pairs

  // If short enough, return as-is
  if (convoMsgs.length <= maxRecent) return convoMsgs;

  const oldMessages = convoMsgs.slice(0, convoMsgs.length - maxRecent);
  const recentMessages = convoMsgs.slice(convoMsgs.length - maxRecent);

  // Build a terse recap of old messages
  const recapParts: string[] = [];
  for (const msg of oldMessages) {
    if (msg.role === "user") {
      // Extract just the core text, truncate long ones
      const text = (msg.content || "").slice(0, 80);
      recapParts.push(`U: ${text}`);
    } else if (msg.role === "assistant" && msg.content) {
      const text = (msg.content || "").slice(0, 100);
      recapParts.push(`A: ${text}`);
    }
    // Skip tool messages and tool_calls in recap — they're the bulkiest
  }

  const recap = recapParts.join(" → ");

  return [
    { role: "user", content: `[Earlier conversation recap: ${recap}]` },
    { role: "assistant", content: "Got it, I remember our earlier conversation." },
    ...recentMessages,
  ];
}

// ─── Token Estimation (rough) ───────────────────────────────────────

/** Rough token count: ~4 chars per token for English, ~2 for Telugu/mixed */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Check if has significant non-ASCII (Telugu/Hindi)
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  const ratio = nonAscii > text.length * 0.2 ? 2 : 4;
  return Math.ceil(text.length / ratio);
}

/** Estimate tokens for a full messages array */
export function estimateConversationTokens(messages: any[]): number {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(typeof m.content === "string" ? m.content : JSON.stringify(m));
    if (m.tool_calls) {
      total += estimateTokens(JSON.stringify(m.tool_calls));
    }
  }
  return total;
}
