import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hasTenantLeftNow, isTenantActiveNow } from "./dateOnly";

describe("current tenant state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 1 August 2026 in Asia/Kolkata.
    vi.setSystemTime(new Date("2026-08-01T06:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes a tenant from active occupancy on their leave date", () => {
    expect(isTenantActiveNow("2026-07-01", "2026-08-01")).toBe(false);
    expect(hasTenantLeftNow("2026-08-01")).toBe(true);
  });

  it("keeps a tenant active before a future leave date", () => {
    expect(isTenantActiveNow("2026-07-01", "2026-08-02")).toBe(true);
    expect(hasTenantLeftNow("2026-08-02")).toBe(false);
  });

  it("treats a past leave date as left", () => {
    expect(isTenantActiveNow("2026-07-01", "2026-07-31")).toBe(false);
    expect(hasTenantLeftNow("2026-07-31")).toBe(true);
  });

  it("keeps tenants without a leave date active after they join", () => {
    expect(isTenantActiveNow("2026-07-01", undefined)).toBe(true);
    expect(hasTenantLeftNow(undefined)).toBe(false);
  });
});
