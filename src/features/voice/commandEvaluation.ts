export type VoiceEvaluationCase = {
  id: string;
  locale: "en-IN" | "te-IN";
  input: string;
  intent: "mark_payment" | "collection_summary" | "pending_tenants" | "vacant_beds";
  expected: Record<string, string | number>;
  condition: "clean" | "accent" | "noise" | "code-switch";
};

const people = ["Ravi", "Ramesh", "Suresh", "Arjun", "Kiran", "Naveen", "Mahesh", "Sai", "Rahul", "Vijay"];
const rooms = ["101", "102", "103", "201", "202", "203"];
const amounts = [4500, 5000, 5500, 6000];

/**
 * Deterministic production-evaluation corpus. Templates deliberately include
 * Indian-English phrasing, Telugu, code-switching and plausible noisy-ASR text.
 */
export function buildVoiceEvaluationDataset(): VoiceEvaluationCase[] {
  const cases: VoiceEvaluationCase[] = [];
  people.forEach((person, personIndex) => {
    rooms.forEach((room, roomIndex) => {
      const amount = amounts[(personIndex + roomIndex) % amounts.length];
      const mode = (personIndex + roomIndex) % 2 ? "cash" : "upi";
      const variants: Array<Omit<VoiceEvaluationCase, "id" | "expected">> = [
        { locale: "en-IN", input: `Record ${amount} rupees ${mode} rent for ${person} in room ${room}`, intent: "mark_payment", condition: "clean" },
        { locale: "en-IN", input: `${person} room ${room} rent ${amount} received by ${mode} only`, intent: "mark_payment", condition: "accent" },
        { locale: "te-IN", input: `రూమ్ ${room} లో ${person} కి ${amount} రూపాయల అద్దె ${mode} లో వచ్చింది`, intent: "mark_payment", condition: "code-switch" },
        { locale: "en-IN", input: `record uh ${amount} rent for ${person} room ${room} background noise`, intent: "mark_payment", condition: "noise" },
      ];
      variants.forEach((variant, variantIndex) => cases.push({
        ...variant,
        id: `payment-${personIndex}-${roomIndex}-${variantIndex}`,
        expected: { tenantName: person, roomNo: room, amount, mode },
      }));
    });
  });

  const readTemplates: Array<Omit<VoiceEvaluationCase, "id" | "expected"> & { expected: Record<string, string> }> = [
    { locale: "en-IN", input: "How much rent did we collect this month?", intent: "collection_summary", condition: "clean", expected: {} },
    { locale: "en-IN", input: "Who all have not paid rent yet?", intent: "pending_tenants", condition: "accent", expected: {} },
    { locale: "te-IN", input: "ఈ నెల అద్దె ఎంత వసూలైంది?", intent: "collection_summary", condition: "clean", expected: {} },
    { locale: "te-IN", input: "ఇంకా ఎవరు రెంట్ కట్టలేదు?", intent: "pending_tenants", condition: "code-switch", expected: {} },
    { locale: "en-IN", input: "How many beds are empty now?", intent: "vacant_beds", condition: "noise", expected: {} },
  ];
  for (let repeat = 0; repeat < 4; repeat++) {
    readTemplates.forEach((item, index) => cases.push({ ...item, id: `read-${repeat}-${index}` }));
  }
  return cases;
}

export const voiceEvaluationDataset = buildVoiceEvaluationDataset();
