import { describe, expect, it } from "vitest";
import { getSubscriptionAccess } from "./subscriptionAccess";
import type { Subscription } from "@/types/pg";

const base: Subscription = {
  id: "sub", userId: "user", plan: "pro", status: "active", billingCycle: "trial",
  maxPgs: -1, maxTenantsPerPg: -1,
  features: { autoReminders: true, dailyReports: true, aiLogo: true },
  createdAt: "2026-08-20T00:00:00.000Z", updatedAt: "2026-08-20T00:00:00.000Z",
};

describe("getSubscriptionAccess", () => {
  it("allows an active trial and rounds partial days up", () => {
    const result = getSubscriptionAccess({ ...base, expiresAt: "2026-08-27T00:00:00.000Z" }, new Date("2026-08-20T01:00:00.000Z"));
    expect(result.allowed).toBe(true);
    expect(result.daysRemaining).toBe(7);
  });

  it("blocks an expired trial even if the stored status is stale", () => {
    const result = getSubscriptionAccess({ ...base, expiresAt: "2026-08-19T00:00:00.000Z" }, new Date("2026-08-20T00:00:00.000Z"));
    expect(result.allowed).toBe(false);
    expect(result.expired).toBe(true);
  });

  it("allows free records without expiration", () => {
    expect(getSubscriptionAccess({ ...base, plan: "free", status: "free", billingCycle: undefined }).allowed).toBe(true);
  });

  it("allows an active lifetime subscription without expiration", () => {
    expect(getSubscriptionAccess({ ...base, billingCycle: "lifetime", expiresAt: undefined }).allowed).toBe(true);
  });
});
