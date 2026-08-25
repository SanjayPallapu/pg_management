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
    expect(isReferralCodeFormatValid("PGHUB-OWNER12345")).toBe(true);
    expect(isReferralCodeFormatValid("owner1234")).toBe(false);
    expect(isReferralCodeFormatValid("PGHUB-")).toBe(false);
  });

  it("builds a shareable onboarding link", () => {
    const invite = getReferralShareContent("pghub-owner12345");
    expect(invite.text).toContain("PGHUB-OWNER12345");
    expect(invite.url).toContain("/onboarding?ref=PGHUB-OWNER12345");
  });

  it("rejects self-referrals", async () => {
    const result = await validateAndApplyReferralCode("PGHUB-OWNER12345", "PGHUB-OWNER12345");
    expect(result.success).toBe(false);
  });

  it("rejects malformed referral codes", async () => {
    const result = await validateAndApplyReferralCode("NOT-A-CODE", "PGHUB-OWNER12345");
    expect(result.success).toBe(false);
  });
});
