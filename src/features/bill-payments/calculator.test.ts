import { describe, expect, it } from "vitest";
import { evaluateAmountExpression } from "./calculator";

describe("amount calculator", () => {
  it("uses normal operator precedence", () => {
    expect(evaluateAmountExpression("100+20*3")).toBe(160);
  });

  it("supports decimals and rounds paise", () => {
    expect(evaluateAmountExpression("10.25/2")).toBe(5.13);
  });

  it("rejects malformed expressions and division by zero", () => {
    expect(evaluateAmountExpression("10++2")).toBeNull();
    expect(evaluateAmountExpression("10/0")).toBeNull();
    expect(evaluateAmountExpression("alert(1)")).toBeNull();
  });
});
