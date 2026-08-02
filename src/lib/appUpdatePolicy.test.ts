import { describe, expect, it } from "vitest";
import { AppUpdateAvailability, FlexibleUpdateInstallStatus, type AppUpdateInfo } from "@capawesome/capacitor-app-update";
import { chooseUpdateAction, shouldOfferFlexibleUpdate } from "./appUpdatePolicy";

const info = (patch: Partial<AppUpdateInfo> = {}): AppUpdateInfo => ({
  currentVersionName: "1.5.1",
  currentVersionCode: "200",
  availableVersionCode: "201",
  updateAvailability: AppUpdateAvailability.UPDATE_AVAILABLE,
  flexibleUpdateAllowed: true,
  immediateUpdateAllowed: true,
  ...patch,
});

describe("Play update policy", () => {
  it("uses flexible updates for normal releases", () => {
    expect(chooseUpdateAction(info())).toBe("flexible");
  });

  it("uses immediate updates for critical or stale releases", () => {
    expect(chooseUpdateAction(info({ updatePriority: 5 }))).toBe("immediate");
    expect(chooseUpdateAction(info({ clientVersionStalenessDays: 14 }))).toBe("immediate");
  });

  it("completes an already downloaded update", () => {
    expect(chooseUpdateAction(info({ installStatus: FlexibleUpdateInstallStatus.DOWNLOADED }))).toBe("complete");
  });

  it("does nothing when no update exists", () => {
    expect(chooseUpdateAction(info({ updateAvailability: AppUpdateAvailability.UPDATE_NOT_AVAILABLE }))).toBe("none");
  });

  it("does not restart a flexible flow already downloading", () => {
    expect(chooseUpdateAction(info({ updateAvailability: AppUpdateAvailability.UPDATE_IN_PROGRESS, installStatus: FlexibleUpdateInstallStatus.DOWNLOADING }))).toBe("none");
  });

  it("respects a six-hour normal-update deferral", () => {
    const now = 2_000_000_000_000;
    const storage = { getItem: (key: string) => key === "pg_hub_update_deferred_201" ? String(now) : null };
    expect(shouldOfferFlexibleUpdate("201", now + 60_000, storage)).toBe(false);
    expect(shouldOfferFlexibleUpdate("201", now + 6 * 60 * 60 * 1000, storage)).toBe(true);
  });
});
