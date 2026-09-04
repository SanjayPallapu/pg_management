import { describe, expect, it } from "vitest";
import { classifyVoiceCommand } from "../../../supabase/functions/pg-voice-agent/intent";
import { voiceEvaluationDataset } from "./commandEvaluation";

const expectedTool = {
  mark_payment: "mark_payment",
  collection_summary: "get_collection_summary",
  pending_tenants: "list_pending_tenants",
  vacant_beds: "get_vacant_beds",
} as const;

describe("fast voice intent routing", () => {
  it("routes the complete multilingual evaluation corpus", () => {
    const failures: string[] = [];
    for (const item of voiceEvaluationDataset) {
      const intent = classifyVoiceCommand(item.input, new Date("2026-08-20T12:00:00Z"));
      const paymentMismatch = item.intent === "mark_payment" && (
        intent?.args.tenantName !== item.expected.tenantName
        || intent?.args.roomNo !== item.expected.roomNo
        || intent?.args.amount !== item.expected.amount
        || (item.input.includes(String(item.expected.mode)) && intent?.args.mode !== item.expected.mode)
        || intent?.args.confirmed !== false
      );
      if (intent?.tool !== expectedTool[item.intent] || paymentMismatch) failures.push(item.id);
    }
    expect(failures).toEqual([]);
  });

  it("extracts safe payment confirmation fields", () => {
    const intent = classifyVoiceCommand("Record ₹5,000 cash rent for Ravi in room 203");
    expect(intent).toEqual(expect.objectContaining({
      tool: "mark_payment",
      args: expect.objectContaining({
        tenantName: "Ravi",
        roomNo: "203",
        amount: 5000,
        mode: "cash",
        confirmed: false,
      }),
    }));
  });

  it("passes general AI and non-operational queries to the conversational agent", () => {
    const generalQueries = [
      "Explain quantum computing",
      "What does EBITDA mean?",
      "Help me write an email to my landlord",
      "Calculate 17% of 85,000",
      "Tell me a joke",
      "Plan a trip to Bangalore",
      "Why is the sky blue?",
      "How to write python code for binary search?",
    ];

    for (const query of generalQueries) {
      const intent = classifyVoiceCommand(query);
      expect(intent).toBeNull();
    }
  });
});
