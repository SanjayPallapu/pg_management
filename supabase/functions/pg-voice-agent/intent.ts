export type DeterministicVoiceIntent = {
  tool: "get_pg_overview" | "get_collection_summary" | "list_pending_tenants" |
    "find_tenant" | "get_room_details" | "get_vacant_beds" | "mark_payment";
  args: Record<string, string | number | boolean>;
};

const DIGITS: Record<string, string> = {
  "౦": "0", "౧": "1", "౨": "2", "౩": "3", "౪": "4",
  "౫": "5", "౬": "6", "౭": "7", "౮": "8", "౯": "9",
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

export function normalizeVoiceText(value: string): string {
  return value
    .replace(/[౦-౯०-९]/g, (character) => DIGITS[character] || character)
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateArgs(text: string, now: Date): Record<string, number> {
  const lower = text.toLowerCase();
  let month = now.getMonth() + 1;
  for (const [label, value] of Object.entries(MONTHS)) {
    if (new RegExp(`\\b${label}\\b`, "i").test(lower)) {
      month = value;
      break;
    }
  }
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  return { month, year: yearMatch ? Number(yearMatch[1]) : now.getFullYear() };
}

function extractRoom(text: string): string | undefined {
  return text.match(/(?:room|rm|రూమ్|గది)\s*(?:number|no\.?|నంబర్)?\s*[-:#]?\s*([a-z0-9-]+)/iu)?.[1];
}

function extractTenant(text: string): string | undefined {
  const patterns = [
    /(?:rent|payment)\s+for\s+([\p{L}][\p{L}\s.'-]*?)(?=\s+(?:in\s+)?(?:room|rm)\b|\s+(?:cash|upi)\b|$)/iu,
    /(?:received|collect(?:ed)?|record)\s+(?:rent\s+)?from\s+([\p{L}][\p{L}\s.'-]*?)(?=\s+(?:in\s+)?(?:room|rm)\b|\s+(?:cash|upi)\b|$)/iu,
    /mark\s+([\p{L}][\p{L}\s.'-]*?)\s+(?:as\s+)?(?:paid|partial)/iu,
    /(?:find|show|search|details?\s+(?:for|of))\s+(?:tenant\s+)?([\p{L}][\p{L}\s.'-]*)$/iu,
    /^([\p{L}][\p{L}.'-]*)\s+(?:room|rm)\b/iu,
    /(?:room|rm|రూమ్|గది)\s*[a-z0-9-]+\s*(?:లో|lo|లోని)\s*([\p{L}][\p{L}.'-]*)\s*(?:కి|ki)/iu,
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim();
    if (value) return value;
  }
  return undefined;
}

function extractAmount(text: string, roomNo?: string): number | undefined {
  const explicit = text.match(/(?:₹|rs\.?|rupees?)\s*([\d,]+(?:\.\d{1,2})?)/iu)?.[1];
  if (explicit) return Number(explicit.replace(/,/g, ""));
  const candidates = [...text.matchAll(/\b(\d[\d,]*(?:\.\d{1,2})?)\b/g)]
    .map((match) => Number(match[1].replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value !== Number(roomNo) && !(value >= 2020 && value <= 2100));
  const likelyMoney = candidates.filter((value) => value >= 100);
  return likelyMoney.length ? Math.max(...likelyMoney) : undefined;
}

export function classifyVoiceCommand(
  rawText: string,
  now: Date = new Date(),
): DeterministicVoiceIntent | null {
  const text = normalizeVoiceText(rawText);
  const lower = text.toLowerCase();

  // Route general knowledge, calculations, creative writing, jokes, code, and explanations to the conversational agent
  const isGeneralQuery = /^(?:explain|write|draft|compose|tell me a joke|joke|solve|code|help me write|how do (?:i|you)|how to|what does \b\w+\b mean|why is|why are|meaning of|calculate\b|plan a\b|what is the capital|weather|news)\b/iu.test(lower);
  if (isGeneralQuery) return null;

  const dates = dateArgs(text, now);

  const pendingQuery = /(who|which|list|show).*(not paid|unpaid|pending|due)|pending.*(tenant|rent)|చెల్లించలేదు|కట్టలేదు|బాకీ|పెండింగ్/u.test(lower);
  if (pendingQuery) return { tool: "list_pending_tenants", args: dates };

  const paymentAction = /(record|mark|save|received|collect(?:ed)?|నమోదు|రికార్డ్|వచ్చింది|చెల్లించాడు).*(rent|payment|paid|అద్దె|చెల్లింపు)|(rent|payment|అద్దె).*(record|mark|received|నమోదు|రికార్డ్|వచ్చింది)/u.test(lower);
  if (paymentAction) {
    const roomNo = extractRoom(text);
    const tenantName = extractTenant(text);
    if (roomNo || tenantName) {
      const amount = extractAmount(text, roomNo);
      return {
        tool: "mark_payment",
        args: {
          ...dates,
          ...(roomNo ? { roomNo } : {}),
          ...(tenantName ? { tenantName } : {}),
          ...(amount !== undefined ? { amount } : {}),
          status: /partial|part payment|కొంత/u.test(lower) ? "Partial" : "Paid",
          mode: /cash|నగదు/u.test(lower) ? "cash" : "upi",
          confirmed: false,
        },
      };
    }
  }

  if (/vacan|empty bed|beds?.*empty|available bed|ఖాళీ/u.test(lower)) {
    return { tool: "get_vacant_beds", args: {} };
  }

  if (/how much.*(collect|received)|collection|collected.*rent|rent.*collected|వసూల|ఎంత.*అద్దె/u.test(lower)) {
    return { tool: "get_collection_summary", args: dates };
  }

  const roomNo = extractRoom(text);
  if (roomNo && /(detail|status|who|tenant|show|గది|రూమ్)/u.test(lower)) {
    return { tool: "get_room_details", args: { roomNo } };
  }

  const tenantName = extractTenant(text);
  if (tenantName) return { tool: "find_tenant", args: { ...dates, name: tenantName } };

  if (/overview|summary|pg status|how.*(?:pg|business)|how many (?:rooms|beds|tenants)|సారాంశం|స్థితి/u.test(lower)) {
    return { tool: "get_pg_overview", args: {} };
  }

  return null;
}
