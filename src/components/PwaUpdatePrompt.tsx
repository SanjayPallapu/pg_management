import { useEffect } from "react";

/**
 * PwaUpdatePrompt: Handles silent background Service Worker activation
 * without displaying any intrusive notification popups or banners.
 */
export const PwaUpdatePrompt = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Periodically trigger background SW update checks
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Auto activate waiting worker silently
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      // Check for updates on resume/visibility change
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => undefined);
        }
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => document.removeEventListener("visibilitychange", handleVisibility);
    });
  }, []);

  return null;
};
