import { describe, expect, it } from "vitest";
import {
  getReferralShareContent,
  getPublicAppUrl,
  isReferralCodeFormatValid,
  validateAndApplyReferralCode,
} from "./referralHelper";

describe("referral helpers", () => {
  it("uses the live public host when no browser origin is available", () => {
    expect(getPublicAppUrl()).toBe("https://pgmanagee.vercel.app");
  });
  it("accepts only PG HUB referral-code format", () => {
    expect(isReferralCodeFormatValid("PGHUB-OWNER1234")).toBe(true);
    expect(isReferralCodeFormatValid("owner1234")).toBe(false);
    expect(isReferralCodeFormatValid("PGHUB-")).toBe(false);
  });

  it("builds a shareable onboarding link", () => {
    const invite = getReferralShareContent("pghub-owner1234");
    expect(invite.text).toContain("PGHUB-OWNER1234");
    expect(invite.url).toContain("/onboarding?ref=PGHUB-OWNER1234");
  });

  it("rejects self-referrals", () => {
    const result = validateAndApplyReferralCode("PGHUB-OWNER1234", "PGHUB-OWNER1234");
    expect(result.success).toBe(false);
  });

  it("rejects malformed referral codes", () => {
    const result = validateAndApplyReferralCode("NOT-A-CODE", "PGHUB-OWNER1234");
    expect(result.success).toBe(false);
  });
});
