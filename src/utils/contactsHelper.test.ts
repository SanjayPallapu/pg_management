import { describe, expect, it } from "vitest";
import { isValidIndianPhoneNumber, sanitizePhoneNumber, toIndianPhoneNumber } from "./contactsHelper";

describe("Indian phone normalization", () => {
  it("normalizes common Indian formats", () => {
    expect(sanitizePhoneNumber("+91 98765-43210")).toBe("9876543210");
    expect(sanitizePhoneNumber("09876543210")).toBe("9876543210");
  });

  it("requires a valid Indian mobile prefix", () => {
    expect(isValidIndianPhoneNumber("9876543210")).toBe(true);
    expect(isValidIndianPhoneNumber("5123456789")).toBe(false);
    expect(toIndianPhoneNumber("9876543210")).toBe("+919876543210");
  });
});
