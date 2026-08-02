import { useCallback, useEffect, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  AppUpdate,
  AppUpdateAvailability,
  AppUpdateResultCode,
  FlexibleUpdateInstallStatus,
  type AppUpdateInfo,
} from "@capawesome/capacitor-app-update";
import { Download, Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { chooseUpdateAction, shouldOfferFlexibleUpdate } from "@/lib/appUpdatePolicy";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

export const PlayStoreUpdateManager = () => {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [readyOpen, setReadyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [downloadVisible, setDownloadVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastCheckAt = useRef(0);
  const checkInFlight = useRef(false);

  const isAndroidPlayBuild = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

  const checkForUpdate = useCallback(async (force = false) => {
    if (!isAndroidPlayBuild || checkInFlight.current) return;
    const now = Date.now();
    if (!force && now - lastCheckAt.current < CHECK_INTERVAL_MS) return;
    checkInFlight.current = true;
    lastCheckAt.current = now;
    try {
      const info = await AppUpdate.getAppUpdateInfo();
      setUpdateInfo(info);
      setFailed(false);
      if ([FlexibleUpdateInstallStatus.PENDING, FlexibleUpdateInstallStatus.DOWNLOADING, FlexibleUpdateInstallStatus.INSTALLING].includes(info.installStatus ?? FlexibleUpdateInstallStatus.UNKNOWN)) {
        setDownloadVisible(true);
      }
      const action = chooseUpdateAction(info);
      if (action === "complete") {
        setReadyOpen(true);
      } else if (action === "immediate") {
        setBusy(true);
        const result = await AppUpdate.performImmediateUpdate();
        if (result.code === AppUpdateResultCode.FAILED) setFailed(true);
        setBusy(false);
      } else if (action === "flexible" && shouldOfferFlexibleUpdate(info.availableVersionCode)) {
        setOfferOpen(true);
      } else if (action === "store") {
        setOfferOpen(true);
      }
    } catch (error) {
      // Sideloaded/debug builds and devices without Play Store commonly cannot query Play.
      console.info("[AppUpdate] Play update check unavailable", error);
    } finally {
      checkInFlight.current = false;
    }
  }, [isAndroidPlayBuild]);

  useEffect(() => {
    if (!isAndroidPlayBuild) return;
    void checkForUpdate(true);
    const appListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void checkForUpdate();
    });
    const updateListener = AppUpdate.addListener("onFlexibleUpdateStateChange", (state) => {
      if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADING) {
        setDownloadVisible(true);
        const total = state.totalBytesToDownload ?? 0;
        setProgress(total > 0 ? Math.min(100, Math.round(((state.bytesDownloaded ?? 0) / total) * 100)) : null);
      } else if (state.installStatus === FlexibleUpdateInstallStatus.DOWNLOADED) {
        setDownloadVisible(false); setProgress(100); setReadyOpen(true); setBusy(false);
      } else if (state.installStatus === FlexibleUpdateInstallStatus.FAILED) {
        setDownloadVisible(false); setFailed(true); setBusy(false);
      } else if (state.installStatus === FlexibleUpdateInstallStatus.CANCELED) {
        setDownloadVisible(false); setBusy(false);
      }
    });
    return () => {
      void appListener.then((handle) => handle.remove());
      void updateListener.then((handle) => handle.remove());
    };
  }, [checkForUpdate, isAndroidPlayBuild]);

  if (!isAndroidPlayBuild) return null;

  const startUpdate = async () => {
    if (!updateInfo) return;
    setOfferOpen(false); setBusy(true); setFailed(false);
    try {
      if (updateInfo.flexibleUpdateAllowed) {
        const result = await AppUpdate.startFlexibleUpdate();
        if (result.code === AppUpdateResultCode.OK) setDownloadVisible(true);
        else if (result.code === AppUpdateResultCode.FAILED) setFailed(true);
      } else if (updateInfo.immediateUpdateAllowed) {
        await AppUpdate.performImmediateUpdate();
      } else {
        await AppUpdate.openAppStore({ androidPackageName: "com.sanjay.pgmanagement" });
      }
    } catch (error) {
      console.warn("[AppUpdate] Unable to start update", error);
      setFailed(true);
    } finally { setBusy(false); }
  };

  const deferUpdate = () => {
    if (updateInfo?.availableVersionCode) localStorage.setItem(`pg_hub_update_deferred_${updateInfo.availableVersionCode}`, String(Date.now()));
    setOfferOpen(false);
  };

  const completeUpdate = async () => {
    setBusy(true);
    try { await AppUpdate.completeFlexibleUpdate(); }
    catch (error) { console.warn("[AppUpdate] Unable to complete update", error); setFailed(true); setBusy(false); }
  };

  return <>
    {(downloadVisible || failed) && <div className="fixed inset-x-3 bottom-[calc(78px+env(safe-area-inset-bottom,0px))] z-[90] mx-auto max-w-md rounded-[20px] border border-[#dedff0] bg-white p-3 shadow-[0_16px_50px_-18px_rgba(38,32,100,.45)] dark:border-border dark:bg-card" role="status">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef]">{failed ? <RefreshCw className="h-5 w-5" /> : <Download className="h-5 w-5" />}</div>
        <div className="min-w-0 flex-1"><p className="text-sm font-black">{failed ? "Update paused" : "Downloading update"}</p><p className="text-xs text-muted-foreground">{failed ? "Check your connection and try again." : progress === null ? "Preparing secure Play Store download…" : `${progress}% complete · You can keep using PG HUB`}</p>{!failed && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ececf4]"><div className="h-full rounded-full bg-[#4936ef] transition-all" style={{ width: `${progress ?? 8}%` }} /></div>}</div>
        {failed && <button type="button" className="min-h-11 rounded-xl px-3 text-xs font-black text-[#4936ef]" onClick={() => void checkForUpdate(true)}>Retry</button>}
      </div>
    </div>}

    <AlertDialog open={offerOpen} onOpenChange={(open) => { if (!open) deferUpdate(); }}>
      <AlertDialogContent className="max-w-[calc(100%-28px)] rounded-[28px] border-0 p-0 sm:max-w-sm">
        <div className="rounded-t-[28px] bg-[linear-gradient(135deg,#2119b6,#5a3fff)] p-5 text-white"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15"><Sparkles className="h-7 w-7" /></div><AlertDialogHeader className="mt-4 text-left"><AlertDialogTitle className="text-xl font-black text-white">A better PG HUB is ready</AlertDialogTitle><AlertDialogDescription className="text-sm leading-5 text-white/75">Update securely through Google Play. The download continues in the background while you use the app.</AlertDialogDescription></AlertDialogHeader></div>
        <div className="space-y-3 p-5"><div className="flex items-center gap-3 rounded-2xl bg-[#f5f5fb] p-3 dark:bg-muted"><ShieldCheck className="h-5 w-5 text-[#4936ef]" /><div><p className="text-sm font-black">Google Play verified</p><p className="text-xs text-muted-foreground">Version {updateInfo?.availableVersionCode ?? "latest"}</p></div></div><AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2"><AlertDialogCancel className="m-0 min-h-12 rounded-2xl" onClick={deferUpdate}>Later</AlertDialogCancel><AlertDialogAction className="m-0 min-h-12 rounded-2xl bg-[#4936ef] font-black hover:bg-[#3827d7]" onClick={(event) => { event.preventDefault(); void startUpdate(); }}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Update now</AlertDialogAction></AlertDialogFooter></div>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={readyOpen} onOpenChange={setReadyOpen}>
      <AlertDialogContent className="max-w-[calc(100%-28px)] rounded-[28px] sm:max-w-sm"><AlertDialogHeader><div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700"><RefreshCw className="h-7 w-7" /></div><AlertDialogTitle className="text-center text-xl font-black">Update ready</AlertDialogTitle><AlertDialogDescription className="text-center">Restart PG HUB to finish installing the update. Your saved data is safe.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2"><AlertDialogCancel className="m-0 min-h-12 rounded-2xl">Later</AlertDialogCancel><Button className="min-h-12 rounded-2xl bg-[#4936ef] font-black" disabled={busy} onClick={() => void completeUpdate()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Restart now</Button></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
};
