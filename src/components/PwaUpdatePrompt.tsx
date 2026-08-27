import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Sparkles, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PwaUpdatePrompt = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Handle service worker update
  const applyUpdate = useCallback(() => {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }
    setIsUpdating(true);
    // Tell the waiting worker to activate immediately
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    // When the new worker takes control, reload the page to load fresh assets
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Check existing registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // If a worker is already waiting, prompt immediately
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setShowUpdate(true);
      }

      // Listen for new updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version installed and waiting
            setWaitingWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });

      // Periodically check for updates every 15 minutes
      const updateInterval = setInterval(() => {
        reg.update().catch(() => undefined);
      }, 15 * 60 * 1000);

      // Check on window focus / visibility change
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => undefined);
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(updateInterval);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    });

    // PWA Install prompt listener for browsers
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredInstallPrompt(installEvent);

      // Only show install prompt on web if not standalone and not dismissed recently
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      const dismissedAt = localStorage.getItem("pg_hub_pwa_install_dismissed");
      const isRecentlyDismissed = dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000;

      if (!isStandalone && !isRecentlyDismissed) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredInstallPrompt) return;
    setShowInstallPrompt(false);
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredInstallPrompt(null);
    }
  };

  const dismissInstallPrompt = () => {
    localStorage.setItem("pg_hub_pwa_install_dismissed", String(Date.now()));
    setShowInstallPrompt(false);
  };

  return (
    <>
      {/* PWA Update Banner */}
      {showUpdate && (
        <div
          className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md z-[9999] animate-in fade-in slide-in-from-top-4 duration-300"
          role="alert"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md dark:border-primary/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              {isUpdating ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">PG HUB Update Ready</p>
              <p className="text-xs text-muted-foreground">
                {isUpdating ? "Refreshing to latest version…" : "Tap update to load the latest features."}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                className="h-8 rounded-xl font-bold px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isUpdating}
                onClick={applyUpdate}
              >
                {isUpdating ? "Updating…" : "Update"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground"
                onClick={() => setShowUpdate(false)}
                aria-label="Dismiss update banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Web PWA Install Prompt Banner */}
      {showInstallPrompt && !showUpdate && (
        <div
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-sm z-[9990] animate-in fade-in slide-in-from-bottom-4 duration-300"
          role="region"
          aria-label="Install PG HUB App"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">Install PG HUB</p>
              <p className="text-[11px] text-muted-foreground">Get fast full-screen app access</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs font-bold rounded-lg px-2.5"
                onClick={handleInstallClick}
              >
                Install
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-lg text-muted-foreground"
                onClick={dismissInstallPrompt}
                aria-label="Close install prompt"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
