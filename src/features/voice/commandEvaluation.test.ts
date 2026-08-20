import { describe, expect, it } from "vitest";
import { voiceEvaluationDataset } from "./commandEvaluation";

describe("voice command evaluation corpus", () => {
  it("contains hundreds of stable multilingual cases", () => {
    expect(voiceEvaluationDataset.length).toBeGreaterThanOrEqual(200);
    expect(new Set(voiceEvaluationDataset.map((item) => item.id)).size).toBe(voiceEvaluationDataset.length);
    expect(voiceEvaluationDataset.some((item) => item.locale === "te-IN")).toBe(true);
    expect(voiceEvaluationDataset.some((item) => item.condition === "noise")).toBe(true);
    expect(voiceEvaluationDataset.some((item) => item.condition === "accent")).toBe(true);
  });

  it("keeps every payment expectation complete", () => {
    const payments = voiceEvaluationDataset.filter((item) => item.intent === "mark_payment");
    expect(payments.length).toBeGreaterThanOrEqual(200);
    for (const item of payments) {
      expect(item.expected.tenantName).toBeTruthy();
      expect(item.expected.roomNo).toMatch(/^\d{3}$/);
      expect(item.expected.amount).toBeGreaterThan(0);
      expect(["cash", "upi"]).toContain(item.expected.mode);
    }
  });
});
