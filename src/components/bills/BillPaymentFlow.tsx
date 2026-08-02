import { useEffect, useMemo, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { ArrowLeft, Banknote, Camera, Check, ChevronRight, CircleAlert, Clock3, FileCheck2, Image, Loader2, QrCode, ReceiptText, RotateCcw, Smartphone, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMonthContext } from "@/contexts/MonthContext";
import { useBillPaymentTransactions } from "@/hooks/useBillPaymentTransactions";
import { buildUpiPaymentUri, getAmountConflict, maskUpiId, parseUpiQr, UpiQrError } from "@/features/bill-payments/upi";
import { DuplicatePaymentGuard, resolveUpiOutcome, type UpiOutcome } from "@/features/bill-payments/paymentOutcome";
import { getCompatibleUpiApps, isNativePaymentPlatform, launchUpiPayment, NativePaymentError, openCameraSettings, scanUpiQr, scanUpiQrFromGallery, startWebUpiQrScan } from "@/features/bill-payments/nativePayments";
import type { BillPaymentDraft, BillPaymentRequest, ParsedUpiQr } from "@/features/bill-payments/types";

interface Props { open: boolean; request: BillPaymentRequest | null; onOpenChange: (open: boolean) => void }
type Stage = "entry" | "scanner" | "apps" | "result" | "receipt";
const guard = new DuplicatePaymentGuard();
const preferredKey = "pg_hub_preferred_upi_app";

const messageForError = (error: unknown) => {
  if (error instanceof UpiQrError) {
    if (error.code === "NOT_UPI") return "This is not a UPI payment QR. Scan a QR that starts with upi://pay.";
    if (error.code === "INVALID_CURRENCY") return "Only INR UPI payment QRs are supported.";
    if (error.code === "INVALID_AMOUNT") return "The QR contains an invalid amount. Please rescan another QR.";
    return "This UPI QR is missing a valid payee ID.";
  }
  if (error instanceof NativePaymentError) {
    if (error.code === "PERMISSION_DENIED") return "Camera permission is denied. Enable it in app settings to scan a QR.";
    if (error.code === "CANCELLED") return "Scanning was cancelled. You can try again or choose a QR screenshot.";
    if (error.code === "NO_UPI_APP") return error.message === "NO_UPI_APP" ? "No compatible UPI app is installed on this phone." : error.message;
    if (error.code === "OFFLINE") return "You appear to be offline. Connect to the internet before opening a UPI app.";
    return error.message || "This action is not supported on this device.";
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
};

export const BillPaymentFlow = ({ open, request, onOpenChange }: Props) => {
  const { selectedMonth, selectedYear } = useMonthContext();
  const { record } = useBillPaymentTransactions(selectedMonth, selectedYear);
  const [stage, setStage] = useState<Stage>("entry");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [qr, setQr] = useState<ParsedUpiQr | null>(null);
  const [apps, setApps] = useState<Array<{ packageName: string; label: string }>>([]);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [conflict, setConflict] = useState<{ entered: number; qrAmount: number } | null>(null);
  const [receipt, setReceipt] = useState<BillPaymentDraft | null>(null);
  const [scannerVersion, setScannerVersion] = useState(0);
  const draftId = useRef(crypto.randomUUID());
  const awaitingUpiReturn = useRef(false);
  const upiAppWasBackgrounded = useRef(false);

  useEffect(() => {
    let disposed = false;
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (!awaitingUpiReturn.current) return;
      if (!isActive) upiAppWasBackgrounded.current = true;
      if (isActive && upiAppWasBackgrounded.current) {
        awaitingUpiReturn.current = false;
        upiAppWasBackgrounded.current = false;
        if (!disposed) { setBusy(false); setStage("result"); }
      }
    });
    return () => { disposed = true; void listener.then((handle) => handle.remove()); };
  }, []);

  useEffect(() => {
    if (!open || !request) return;
    setStage("entry"); setAmount(""); setLabel(request.label ?? request.subcategory ?? ""); setNote("");
    setQr(null); setApps([]); setRemember(false); setError(null); setPermissionDenied(false); setConflict(null); setReceipt(null);
    draftId.current = crypto.randomUUID();
  }, [open, request]);

  const parsedAmount = Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= 10_000_000;
  const validLabel = Boolean(label.trim());
  const canProceed = validAmount && validLabel;
  const nativePlatform = isNativePaymentPlatform();
  const preferredPackage = localStorage.getItem(preferredKey);
  const sortedApps = useMemo(() => [...apps].sort((a, b) => Number(b.packageName === preferredPackage) - Number(a.packageName === preferredPackage)), [apps, preferredPackage]);

  if (!request) return null;

  const handleRawQr = async (raw: string) => {
    try {
      const parsed = parseUpiQr(raw);
      const amountConflict = getAmountConflict(parsedAmount, parsed.amount);
      setQr(parsed);
      if (amountConflict) { setConflict(amountConflict); return; }
      await prepareApps(parsed, parsedAmount);
    } catch (scanError) {
      setError(messageForError(scanError));
      setScannerVersion((current) => current + 1);
    }
  };

  const prepareScan = async (fromGallery: boolean) => {
    if (!canProceed) return;
    if (!fromGallery && !nativePlatform) {
      setError(null); setPermissionDenied(false); setStage("scanner");
      return;
    }
    setBusy(true); setError(null); setPermissionDenied(false);
    try {
      const raw = fromGallery ? await scanUpiQrFromGallery() : await scanUpiQr();
      await handleRawQr(raw);
    } catch (scanError) {
      setError(messageForError(scanError));
      setPermissionDenied(scanError instanceof NativePaymentError && scanError.code === "PERMISSION_DENIED");
    } finally { setBusy(false); }
  };

  const prepareApps = async (parsed: ParsedUpiQr, selectedAmount: number) => {
    const uri = buildUpiPaymentUri(parsed, selectedAmount, request.categoryName, note);
    const compatible = await getCompatibleUpiApps(uri);
    if (nativePlatform && compatible.length === 0) throw new NativePaymentError("NO_UPI_APP");
    setApps(compatible); setStage("apps");
  };

  const launch = async (packageName?: string) => {
    if (!qr) return;
    setBusy(true); setError(null);
    try {
      const uri = buildUpiPaymentUri(qr, Number(amount), request.categoryName, note);
      if (remember && packageName) localStorage.setItem(preferredKey, packageName);
      if (!packageName && remember) localStorage.removeItem(preferredKey);
      awaitingUpiReturn.current = true;
      upiAppWasBackgrounded.current = false;
      await launchUpiPayment(uri, packageName);
      awaitingUpiReturn.current = false;
      setStage("result");
    } catch (launchError) { awaitingUpiReturn.current = false; setError(messageForError(launchError)); }
    finally { setBusy(false); }
  };

  const save = async (method: BillPaymentDraft["paymentMethod"], status: BillPaymentDraft["status"], resolvedNote?: string, upiAttempted = false) => {
    const transactionId = draftId.current;
    if (!guard.begin(transactionId)) return;
    setBusy(true); setError(null);
    const draft: BillPaymentDraft = {
      ...request, transactionId, amount: Number(amount), label: label.trim(), paymentMethod: method, status,
      note: resolvedNote || note.trim() || qr?.transactionNote || null,
      payeeName: qr?.payeeName ?? null, maskedUpiId: qr ? maskUpiId(qr.payeeUpiId) : null, upiAttempted,
    };
    try {
      await record.mutateAsync(draft);
      setReceipt(draft); setStage("receipt");
    } catch (saveError) { setError(messageForError(saveError)); guard.end(transactionId); }
    finally { setBusy(false); }
  };

  const chooseOutcome = async (outcome: UpiOutcome) => {
    const resolved = resolveUpiOutcome(outcome);
    if (!resolved.shouldRecord) { onOpenChange(false); return; }
    await save(resolved.method!, resolved.status!, resolved.note, true);
  };

  const resetScan = () => { setQr(null); setApps([]); setError(null); setStage("entry"); draftId.current = crypto.randomUUID(); };
  const sheetTitle = stage === "entry" ? "Add payment" : stage === "scanner" ? "Scan UPI QR" : stage === "apps" ? "Choose UPI app" : stage === "result" ? "Confirm payment result" : "Payment recorded";

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
        <SheetContent side="right" className="h-[100dvh] w-full max-w-full border-0 bg-[#f8f9fd] p-0 shadow-none dark:bg-background sm:max-w-full [&>button]:hidden">
          <SheetHeader className="sticky top-0 z-10 border-b bg-white px-3 py-2 dark:bg-card sm:px-4">
            <div className="flex min-h-12 items-center gap-2">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted" onClick={() => stage === "entry" ? onOpenChange(false) : resetScan()} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
              <div className="min-w-0 flex-1 text-left"><SheetTitle className="text-lg font-black">{sheetTitle}</SheetTitle><p className="truncate text-xs font-semibold text-[#4936ef]">{request.categoryName}</p></div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1efff] text-[#4936ef]"><ReceiptText className="h-5 w-5" /></div>
            </div>
          </SheetHeader>

          <div className="mx-auto w-full max-w-lg space-y-4 px-3 py-4 sm:px-4">
            {stage === "entry" && <>
              <div className="rounded-[24px] bg-[linear-gradient(135deg,#2e23ca,#5a3fff)] p-5 text-white shadow-lg">
                <Label htmlFor="bill-payment-amount" className="text-xs font-bold text-white/75">Payment amount</Label>
                <div className="mt-1 flex items-center border-b border-white/25 pb-2"><span className="text-3xl font-black">₹</span><input id="bill-payment-amount" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" autoFocus className="min-w-0 flex-1 bg-transparent px-2 text-[42px] font-black leading-none tracking-tight text-white outline-none placeholder:text-white/35" /></div>
                <p className="mt-2 text-xs text-white/70">Enter the amount before choosing how to pay.</p>
              </div>
              {(!request.lockLabel || !request.label) && <div><Label htmlFor="bill-payment-label" className="text-xs font-bold">What is this payment for?</Label><Input id="bill-payment-label" className="mt-1 h-12 rounded-xl" value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} placeholder={`e.g. ${request.categoryName} payment`} /></div>}
              <div><Label htmlFor="bill-payment-note" className="text-xs font-bold">Note (optional)</Label><Input id="bill-payment-note" className="mt-1 h-12 rounded-xl" value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} placeholder="Shown in payment history" /></div>
              <div className="space-y-2">
                <button type="button" disabled={!canProceed || busy} onClick={() => void prepareScan(false)} className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl bg-[#4936ef] px-4 text-left text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}</span><span className="flex-1"><span className="block text-sm font-black">Scan Any UPI QR</span><span className="block text-xs text-white/70">Scan a fresh physical QR</span></span><ChevronRight className="h-5 w-5" /></button>
                <button type="button" disabled={!canProceed || busy} onClick={() => void prepareScan(true)} className="flex min-h-[54px] w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left disabled:opacity-45 dark:bg-card"><Image className="h-5 w-5 text-[#4936ef]" /><span className="flex-1 text-sm font-black">Scan QR from Gallery</span><ChevronRight className="h-5 w-5 text-muted-foreground" /></button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={!canProceed || busy} onClick={() => void save("Cash", "Paid")} className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border bg-white text-sm font-black disabled:opacity-45 dark:bg-card"><Banknote className="h-5 w-5 text-emerald-600" /> Pay by Cash</button>
                  <button type="button" disabled={!canProceed || busy} onClick={() => void save("Record Only", "Paid")} className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border bg-white text-sm font-black disabled:opacity-45 dark:bg-card"><FileCheck2 className="h-5 w-5 text-blue-600" /> Record Only</button>
                </div>
              </div>
            </>}

            {stage === "scanner" && <>
              <WebQrScanner
                key={scannerVersion}
                onScan={(raw) => void handleRawQr(raw)}
                onError={(scanError) => {
                  setError(messageForError(scanError));
                  setPermissionDenied(scanError instanceof NativePaymentError && scanError.code === "PERMISSION_DENIED");
                }}
              />
              <button type="button" onClick={() => { setStage("entry"); void prepareScan(true); }} className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border bg-white px-4 text-sm font-black dark:bg-card"><Image className="h-5 w-5 text-[#4936ef]" /> Scan QR from Gallery</button>
              <p className="px-2 text-center text-xs leading-5 text-muted-foreground">Point the camera at any physical UPI payment QR. Camera access requires HTTPS or localhost.</p>
            </>}

            {stage === "apps" && qr && <>
              <div className="rounded-2xl border bg-white p-4 dark:bg-card"><p className="text-xs font-bold text-muted-foreground">Paying</p><div className="mt-1 flex items-end justify-between gap-3"><div><p className="text-base font-black">{qr.payeeName || "UPI payee"}</p><p className="text-xs text-muted-foreground">{maskUpiId(qr.payeeUpiId)}</p></div><p className="text-2xl font-black">₹{Number(amount).toLocaleString("en-IN")}</p></div></div>
              {nativePlatform ? <>
                <div className="space-y-2"><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Available apps</p>{sortedApps.map((app) => <button type="button" key={app.packageName} disabled={busy} onClick={() => void launch(app.packageName)} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left dark:bg-card"><Smartphone className="h-5 w-5 text-[#4936ef]" /><span className="flex-1 text-sm font-black">{app.label}</span>{app.packageName === preferredPackage && <span className="rounded-full bg-[#f1efff] px-2 py-1 text-[10px] font-black text-[#4936ef]">Preferred</span>}<ChevronRight className="h-5 w-5" /></button>)}<button type="button" disabled={busy} onClick={() => void launch()} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-dashed px-4 text-left"><Smartphone className="h-5 w-5" /><span className="flex-1 text-sm font-black">Choose another UPI app</span></button></div>
                <label className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-semibold"><Checkbox checked={remember} onCheckedChange={(checked) => setRemember(Boolean(checked))} /> Remember the app I choose</label>
              </> : <button type="button" disabled={busy} onClick={() => void launch()} className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl bg-[#4936ef] px-4 text-left text-white shadow-md disabled:opacity-45"><Smartphone className="h-5 w-5" /><span className="flex-1"><span className="block text-sm font-black">Open UPI app</span><span className="block text-xs text-white/70">Available on a phone browser</span></span><ChevronRight className="h-5 w-5" /></button>}
              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">PG HUB never sees or stores your UPI PIN. Returning to PG HUB does not prove payment success.</p>
            </>}

            {stage === "result" && <><div className="text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f1efff] text-[#4936ef]"><CircleAlert className="h-8 w-8" /></div><h2 className="mt-3 text-xl font-black">How was this payment completed?</h2><p className="mt-1 text-sm text-muted-foreground">Choose what actually happened in your UPI app.</p></div><div className="space-y-2">
              <ResultButton icon={Check} tone="text-emerald-600 bg-emerald-50" label="UPI payment successful" onClick={() => void chooseOutcome("success")} />
              <ResultButton icon={X} tone="text-rose-600 bg-rose-50" label="UPI payment failed" onClick={() => void chooseOutcome("failed")} />
              <ResultButton icon={Banknote} tone="text-amber-700 bg-amber-50" label="Paid by cash instead" onClick={() => void chooseOutcome("cash")} />
              <ResultButton icon={Clock3} tone="text-blue-600 bg-blue-50" label="Payment pending" onClick={() => void chooseOutcome("pending")} />
              <button type="button" disabled={busy} onClick={() => void chooseOutcome("cancel")} className="min-h-12 w-full rounded-xl text-sm font-bold text-muted-foreground">Cancel without recording</button>
            </div></>}

            {stage === "receipt" && receipt && <div className="text-center"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-10 w-10" /></div><h2 className="mt-3 text-2xl font-black">Recorded</h2><p className="text-sm text-muted-foreground">The Bills totals were updated only after your confirmation.</p><div className="mt-5 rounded-[22px] border bg-white p-4 text-left dark:bg-card"><div className="grid grid-cols-3 gap-2 border-b pb-3 text-center"><ReceiptAmount label="Bill total" amount={receipt.amount} /><ReceiptAmount label="Paid" amount={["Paid", "Partially Paid"].includes(receipt.status) ? receipt.amount : 0} /><ReceiptAmount label="Remaining" amount={["Paid", "Partially Paid"].includes(receipt.status) ? 0 : receipt.amount} /></div><ReceiptRow label="Transaction ID" value={receipt.transactionId} mono /><ReceiptRow label="Category" value={receipt.categoryName} /><ReceiptRow label="Method" value={receipt.paymentMethod} /><ReceiptRow label="Status" value={receipt.status} /><ReceiptRow label="Payee" value={receipt.payeeName || "Not provided"} /><ReceiptRow label="UPI ID" value={receipt.maskedUpiId || "Not stored"} /></div><Button className="mt-4 h-12 w-full rounded-2xl bg-[#4936ef] font-black" onClick={() => onOpenChange(false)}>Done</Button></div>}

            {error && <div role="alert" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">{error.includes("offline") ? <WifiOff className="h-5 w-5 shrink-0" /> : permissionDenied ? <Camera className="h-5 w-5 shrink-0" /> : <CircleAlert className="h-5 w-5 shrink-0" />}<div className="flex-1"><p className="font-bold">{error}</p>{permissionDenied && nativePlatform && <button type="button" onClick={() => void openCameraSettings()} className="mt-2 min-h-11 rounded-xl bg-white px-3 text-xs font-black text-rose-700">Open app settings</button>}{permissionDenied && !nativePlatform && <p className="mt-2 text-xs font-semibold">Allow camera access in this site's browser settings, then rescan.</p>}{qr && stage !== "receipt" && <button type="button" onClick={resetScan} className="mt-2 flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-rose-700"><RotateCcw className="h-4 w-4" /> Rescan QR</button>}</div></div>}
            {busy && stage !== "entry" && <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</div>}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(conflict)} onOpenChange={(next) => !next && setConflict(null)}><AlertDialogContent className="max-w-[calc(100%-28px)] rounded-[24px]"><AlertDialogHeader><AlertDialogTitle>QR amount is different</AlertDialogTitle><AlertDialogDescription>This QR contains ₹{conflict?.qrAmount.toLocaleString("en-IN")}. Use QR amount or keep ₹{conflict?.entered.toLocaleString("en-IN")}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-0"><AlertDialogCancel onClick={() => { const selected = qr; setConflict(null); if (selected) void prepareApps(selected, Number(amount)).catch((e) => setError(messageForError(e))); }}>Keep ₹{conflict?.entered.toLocaleString("en-IN")}</AlertDialogCancel><AlertDialogAction className="bg-[#4936ef]" onClick={() => { const selected = qr; const nextAmount = conflict?.qrAmount; if (nextAmount) setAmount(String(nextAmount)); setConflict(null); if (selected && nextAmount) void prepareApps(selected, nextAmount).catch((e) => setError(messageForError(e))); }}>Use ₹{conflict?.qrAmount.toLocaleString("en-IN")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};

const ResultButton = ({ icon: Icon, tone, label, onClick }: { icon: typeof Check; tone: string; label: string; onClick: () => void }) => <button type="button" onClick={onClick} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border bg-white px-3 text-left dark:bg-card"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><span className="flex-1 text-sm font-black">{label}</span><ChevronRight className="h-5 w-5 text-muted-foreground" /></button>;
const WebQrScanner = ({ onScan, onError }: { onScan: (rawValue: string) => void; onError: (error: unknown) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);
  const [starting, setStarting] = useState(true);
  onScanRef.current = onScan;
  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cleanup: (() => Promise<void>) | undefined;
    let disposed = false;
    void startWebUpiQrScan(video, (rawValue) => onScanRef.current(rawValue))
      .then((stop) => {
        cleanup = stop;
        if (!disposed) setStarting(false);
        else void stop();
      })
      .catch((scanError) => {
        if (!disposed) { setStarting(false); onErrorRef.current(scanError); }
      });
    return () => { disposed = true; void cleanup?.(); };
  }, []);

  return <div className="relative aspect-[3/4] max-h-[62dvh] overflow-hidden rounded-[28px] bg-slate-950 shadow-lg">
    <video ref={videoRef} muted playsInline className="h-full w-full object-cover" aria-label="Live QR camera preview" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_31%,rgba(2,6,23,.58)_32%)]" />
    <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border-2 border-white/90 shadow-[0_0_0_1px_rgba(73,54,239,.9)]">
      <span className="absolute -left-0.5 -top-0.5 h-12 w-12 rounded-tl-[28px] border-l-4 border-t-4 border-[#7c6cff]" />
      <span className="absolute -right-0.5 -top-0.5 h-12 w-12 rounded-tr-[28px] border-r-4 border-t-4 border-[#7c6cff]" />
      <span className="absolute -bottom-0.5 -left-0.5 h-12 w-12 rounded-bl-[28px] border-b-4 border-l-4 border-[#7c6cff]" />
      <span className="absolute -bottom-0.5 -right-0.5 h-12 w-12 rounded-br-[28px] border-b-4 border-r-4 border-[#7c6cff]" />
    </div>
    <div className="absolute inset-x-4 bottom-5 rounded-2xl bg-black/55 px-4 py-3 text-center text-white backdrop-blur-sm">
      <p className="text-sm font-black">Align the UPI QR inside the frame</p>
      <p className="mt-1 text-xs text-white/70">It scans automatically when the code is clear.</p>
    </div>
    {starting && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 text-white"><Loader2 className="mr-2 h-5 w-5 animate-spin" /><span className="text-sm font-bold">Starting camera…</span></div>}
  </div>;
};
const ReceiptAmount = ({ label, amount }: { label: string; amount: number }) => <div><p className="text-[10px] font-bold text-muted-foreground">{label}</p><p className="mt-1 text-sm font-black">₹{amount.toLocaleString("en-IN")}</p></div>;
const ReceiptRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => <div className="flex items-start justify-between gap-4 pt-3 text-sm"><span className="text-muted-foreground">{label}</span><span className={`max-w-[65%] break-all text-right font-bold ${mono ? "font-mono text-[10px]" : ""}`}>{value}</span></div>;
