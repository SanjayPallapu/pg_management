import { AppUpdateAvailability, FlexibleUpdateInstallStatus, type AppUpdateInfo } from "@capawesome/capacitor-app-update";

export type UpdateAction = "none" | "flexible" | "immediate" | "complete" | "store";

export const chooseUpdateAction = (info: AppUpdateInfo): UpdateAction => {
  if (info.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) return "complete";
  if (info.updateAvailability === AppUpdateAvailability.UPDATE_IN_PROGRESS) {
    if ([FlexibleUpdateInstallStatus.PENDING, FlexibleUpdateInstallStatus.DOWNLOADING, FlexibleUpdateInstallStatus.INSTALLING].includes(info.installStatus ?? FlexibleUpdateInstallStatus.UNKNOWN)) return "none";
    return info.immediateUpdateAllowed ? "immediate" : "none";
  }
  if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return "none";

  const priority = info.updatePriority ?? 0;
  const staleDays = info.clientVersionStalenessDays ?? 0;
  if ((priority >= 4 || staleDays >= 14) && info.immediateUpdateAllowed) return "immediate";
  if (info.flexibleUpdateAllowed) return "flexible";
  if (info.immediateUpdateAllowed) return "immediate";
  return "store";
};

export const shouldOfferFlexibleUpdate = (
  availableVersionCode: string | undefined,
  now = Date.now(),
  storage: Pick<Storage, "getItem"> = localStorage,
) => {
  if (!availableVersionCode) return true;
  const raw = storage.getItem(`pg_hub_update_deferred_${availableVersionCode}`);
  if (!raw) return true;
  const deferredAt = Number(raw);
  return !Number.isFinite(deferredAt) || now - deferredAt >= 6 * 60 * 60 * 1000;
};
