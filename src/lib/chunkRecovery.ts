const CHUNK_RECOVERY_KEY = "pgHubChunkRecoveryAt";
const RECOVERY_QUERY_KEY = "pgHubReload";
const RECOVERY_COOLDOWN_MS = 30_000;

let recoveryStarted = false;

const readErrorText = (reason: unknown) => {
  if (reason instanceof Error) return `${reason.name} ${reason.message}`;
  if (typeof reason === "string") return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
};

export const isChunkLoadError = (reason: unknown) => {
  const message = readErrorText(reason).toLowerCase();
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("failed to load module script") ||
    message.includes("chunkloaderror") ||
    message.includes("loading chunk")
  );
};

const clearAppCaches = async () => {
  if ("caches" in window) {
    const names = await window.caches.keys();
    await Promise.all(names.map((name) => window.caches.delete(name)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
};

export const reloadLatestApp = async (target = window.location.href) => {
  try {
    await clearAppCaches();
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
  } catch (error) {
    console.warn("[ChunkRecovery] Could not refresh cached assets:", error);
  }

  const url = new URL(target, window.location.origin);
  url.searchParams.set(RECOVERY_QUERY_KEY, Date.now().toString());
  window.location.replace(url.toString());
};

export const recoverFromStaleChunk = (reason: unknown) => {
  if (!isChunkLoadError(reason)) return false;
  if (recoveryStarted) return true;

  const now = Date.now();
  const lastAttempt = Number(window.sessionStorage.getItem(CHUNK_RECOVERY_KEY) || 0);
  if (now - lastAttempt < RECOVERY_COOLDOWN_MS) return false;

  recoveryStarted = true;
  window.sessionStorage.setItem(CHUNK_RECOVERY_KEY, now.toString());
  void reloadLatestApp();
  return true;
};

export const finishChunkRecoveryBoot = () => {
  window.setTimeout(() => {
    window.sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    const url = new URL(window.location.href);
    if (!url.searchParams.has(RECOVERY_QUERY_KEY)) return;
    url.searchParams.delete(RECOVERY_QUERY_KEY);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, RECOVERY_COOLDOWN_MS);
};
