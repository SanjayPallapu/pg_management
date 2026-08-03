import { useEffect, useMemo, useRef, useState } from "react";
import { App } from "@capacitor/app";
import { format } from "date-fns";
import {
  ArrowLeft, Banknote, Calculator, Calendar, Camera, Check, ChevronRight, CircleAlert,
  Clock3, ExternalLink, FileCheck2, Image, Loader2, QrCode, ReceiptText, RotateCcw,
  Smartphone, WifiOff, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMonthContext } from "@/contexts/MonthContext";
import { useBillPaymentTransactions } from "@/hooks/useBillPaymentTransactions";
import { buildUpiPaymentUri, getAmountConflict, isLikelyPersonalUpiQr, maskUpiId, parseUpiQr, UpiQrError } from "@/features/bill-payments/upi";
import { DuplicatePaymentGuard, resolveUpiOutcome, type UpiOutcome } from "@/features/bill-payments/paymentOutcome";
import { getCompatibleUpiApps, isNativePaymentPlatform, launchUpiAppForManualPayment, launchUpiPayment, NativePaymentError, openCameraSettings, scanUpiQr, scanUpiQrFromGallery, startWebUpiQrScan, type UpiApp } from "@/features/bill-payments/nativePayments";
import type { BillPaymentDraft, BillPaymentRequest, ParsedUpiQr } from "@/features/bill-payments/types";
import { cn } from "@/lib/utils";
import { evaluateAmountExpression, safeEvaluateExpression } from "@/features/bill-payments/calculator";
import { useBackGesture } from "@/hooks/useBackGesture";

interface Props { open: boolean; request: BillPaymentRequest | null; onOpenChange: (open: boolean) => void }
type Stage = "entry" | "scanner" | "apps" | "result" | "receipt";
const guard = new DuplicatePaymentGuard();
const preferredKey = "pg_hub_preferred_upi_app";

const PREDEFINED_PAYMENT_FOR = ["Vegetables", "Poori", "Chapati", "Dry Grocery"];

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
  if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string" && errObj.message) return errObj.message;
    if (typeof errObj.details === "string" && errObj.details) return errObj.details;
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
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [calcOpen, setCalcOpen] = useState(false);
  const [qr, setQr] = useState<ParsedUpiQr | null>(null);
  const [apps, setApps] = useState<UpiApp[]>([]);
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [conflict, setConflict] = useState<{ entered: number; qrAmount: number } | null>(null);
  const [receipt, setReceipt] = useState<BillPaymentDraft | null>(null);
  const [savingOutcome, setSavingOutcome] = useState<UpiOutcome | null>(null);
  const [scannerVersion, setScannerVersion] = useState(0);
  const draftId = useRef(crypto.randomUUID());
  const awaitingUpiReturn = useRef(false);
  const upiAppWasBackgrounded = useRef(false);

  useBackGesture(open, () => onOpenChange(false));

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
    setStage("entry"); setAmount(request.suggestedAmount ? String(request.suggestedAmount) : ""); setLabel(request.label ?? request.subcategory ?? ""); setNote("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setQr(null); setApps([]); setRemember(false); setError(null); setPermissionDenied(false); setConflict(null); setReceipt(null); setSavingOutcome(null);
    draftId.current = crypto.randomUUID();
  }, [open, request]);

  const preferredPackage = typeof window !== "undefined" ? localStorage.getItem(preferredKey) : null;
  const sortedApps = useMemo(() => [...apps].sort((a, b) => Number(b.packageName === preferredPackage) - Number(a.packageName === preferredPackage)), [apps, preferredPackage]);

  if (!request) return null;

  const parsedAmount = Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= 10_000_000;
  const resolvedLabel = label.trim() || request.label || request.subcategory || request.categoryName || "Bill Payment";
  const canPayCash = validAmount;
  const nativePlatform = isNativePaymentPlatform();

  const handleRawQr = async (raw: string) => {
    try {
      const parsed = parseUpiQr(raw);
      const activeAmount = parsedAmount > 0 ? parsedAmount : (parsed.amount ?? 0);
      if (parsed.amount && parsedAmount > 0) {
        const amountConflict = getAmountConflict(parsedAmount, parsed.amount);
        setQr(parsed);
        if (amountConflict) { setConflict(amountConflict); return; }
      } else if (parsed.amount && !parsedAmount) {
        setAmount(String(parsed.amount));
      }
      setQr(parsed);
      await prepareApps(parsed, activeAmount > 0 ? activeAmount : 0);
    } catch (scanError) {
      setError(messageForError(scanError));
      setScannerVersion((current) => current + 1);
    }
  };

  const prepareScan = async (fromGallery: boolean) => {
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
    const compatible = await getCompatibleUpiApps(uri, isLikelyPersonalUpiQr(parsed));
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

  const launchManualUpiId = async (packageName: string) => {
    if (!qr) return;
    setBusy(true); setError(null);
    try {
      if (remember) localStorage.setItem(preferredKey, packageName);
      awaitingUpiReturn.current = true;
      upiAppWasBackgrounded.current = false;
      await launchUpiAppForManualPayment(packageName, qr.payeeUpiId);
      awaitingUpiReturn.current = false;
      setStage("result");
    } catch (launchError) { awaitingUpiReturn.current = false; setError(messageForError(launchError)); }
    finally { setBusy(false); }
  };

  const save = async (method: BillPaymentDraft["paymentMethod"], status: BillPaymentDraft["status"], resolvedNote?: string, upiAttempted = false) => {
    const transactionId = draftId.current;
    if (!guard.begin(transactionId)) return false;
    setBusy(true); setError(null);

    const draft: BillPaymentDraft = {
      ...request,
      transactionId,
      amount: Number(amount),
      label: label.trim() || resolvedLabel,
      paymentMethod: method,
      status,
      note: resolvedNote || note.trim() || qr?.transactionNote || null,
      payeeName: qr?.payeeName ?? null,
      maskedUpiId: qr ? maskUpiId(qr.payeeUpiId) : null,
      upiAttempted,
      paymentDate: paymentDate || format(new Date(), "yyyy-MM-dd"),
    };
    try {
      await record.mutateAsync(draft);
      setReceipt(draft); setStage("receipt");
      return true;
    } catch (saveError) { setError(messageForError(saveError)); guard.end(transactionId); return false; }
    finally { setBusy(false); }
  };

  const chooseOutcome = async (outcome: UpiOutcome) => {
    if (busy || savingOutcome) return;
    setSavingOutcome(outcome);
    const resolved = resolveUpiOutcome(outcome);
    if (!resolved.shouldRecord) { onOpenChange(false); return; }
    const saved = await save(resolved.method!, resolved.status!, resolved.note, true);
    if (!saved) setSavingOutcome(null);
  };

  const retryUpiScan = () => {
    if (busy || savingOutcome) return;
    setQr(null);
    setApps([]);
    setConflict(null);
    setError(null);
    setPermissionDenied(false);
    if (nativePlatform) void prepareScan(false);
    else setStage("scanner");
  };

  const resetScan = () => { setQr(null); setApps([]); setError(null); setStage("entry"); draftId.current = crypto.randomUUID(); };
  const sheetTitle = stage === "entry" ? "Add payment" : stage === "scanner" ? "Scan UPI QR" : stage === "apps" ? "Choose UPI app" : stage === "result" ? "Confirm payment result" : "Payment recorded";
  const personalQr = qr ? isLikelyPersonalUpiQr(qr) : false;

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
        <SheetContent side="right" className="inset-0 h-[100dvh] min-h-[100dvh] w-screen max-w-none border-0 bg-[#f8f9fd] p-0 shadow-none dark:bg-background sm:max-w-none [&>button]:hidden">
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
                <div>
                  <Label htmlFor="bill-payment-amount" className="text-xs font-bold text-white/75">Payment amount</Label>
                </div>
                <div className="mt-1 flex items-center border-b border-white/25 pb-2 gap-2">
                  <span className="text-3xl font-black">₹</span>
                  <input
                    id="bill-payment-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent px-2 text-[42px] font-black leading-none tracking-tight text-white outline-none placeholder:text-white/35"
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between">
                  <p className="text-xs text-white/70">Enter amount or tap to calculate.</p>
                  <button
                    type="button"
                    className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-3 text-xs font-black text-white hover:bg-white/30 backdrop-blur-sm transition-all"
                    onClick={() => setCalcOpen(true)}
                  >
                    <Calculator className="h-3.5 w-3.5" /> Use Calculator
                  </button>
                </div>
              </div>

              {/* What is this payment for? with Predefined Text Chips */}
              {(!request.lockLabel || !request.label) && (
                <div>
                  <Label htmlFor="bill-payment-label" className="text-xs font-bold">What is this payment for?</Label>
                  <Input
                    id="bill-payment-label"
                    className="mt-1 h-12 rounded-xl font-bold"
                    value={label}
                    maxLength={120}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={`e.g. ${request.categoryName} payment`}
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PREDEFINED_PAYMENT_FOR.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className={cn(
                          "min-h-11 rounded-xl border px-3 text-xs font-bold transition-all",
                          label === chip
                            ? "bg-[#4936ef] text-white border-[#4936ef]"
                            : "bg-white text-[#4936ef] border-[#e0e2ea] hover:bg-[#f1efff] dark:bg-card dark:border-border dark:text-[#b6a2ff]"
                        )}
                        onClick={() => setLabel(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="min-h-11 rounded-xl border border-dashed border-[#4936ef]/50 bg-white px-3 text-xs font-bold text-[#4936ef] hover:bg-[#f1efff] dark:bg-card dark:text-[#b6a2ff]"
                      onClick={() => setLabel("")}
                    >
                      Custom
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Date Picker (Default Today) */}
              <div>
                <Label htmlFor="bill-payment-date" className="text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#4936ef]" /> Payment Date
                </Label>
                <Input
                  id="bill-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="mt-1 h-12 rounded-xl font-semibold"
                />
              </div>

              <div><Label htmlFor="bill-payment-note" className="text-xs font-bold">Note (optional)</Label><Input id="bill-payment-note" className="mt-1 h-12 rounded-xl" value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} placeholder="Shown in payment history" /></div>

              <div className="space-y-2 pt-1">
                <button type="button" disabled={busy} onClick={() => void prepareScan(false)} className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl bg-[#4936ef] px-4 text-left text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}</span><span className="flex-1"><span className="block text-sm font-black">Scan Any UPI QR</span><span className="block text-xs text-white/70">Scan a fresh physical QR code</span></span><ChevronRight className="h-5 w-5" /></button>

                <button type="button" disabled={busy} onClick={() => void prepareScan(true)} className="flex min-h-[54px] w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left disabled:opacity-45 dark:bg-card"><Image className="h-5 w-5 text-[#4936ef]" /><span className="flex-1"><span className="block text-sm font-black">Scan QR from Gallery</span><span className="block text-[11px] text-muted-foreground">Choose a QR screenshot from this phone</span></span><ChevronRight className="h-5 w-5 text-muted-foreground" /></button>

                {!nativePlatform && <button type="button" onClick={() => window.open("https://lens.google.com/", "_blank", "noopener,noreferrer")} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black text-[#4936ef] dark:text-[#b6a2ff]"><ExternalLink className="h-4 w-4" /> Open Google Lens</button>}

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={!canPayCash || busy} onClick={() => void save("Cash", "Paid")} className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border bg-white text-sm font-black disabled:opacity-45 dark:bg-card"><Banknote className="h-5 w-5 text-emerald-600" /> Pay by Cash</button>
                  <button type="button" disabled={!canPayCash || busy} onClick={() => void save("Record Only", "Paid")} className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl border bg-white text-sm font-black disabled:opacity-45 dark:bg-card"><FileCheck2 className="h-5 w-5 text-blue-600" /> Record Only</button>
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
              {nativePlatform && personalQr && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><p className="text-sm font-black">Personal UPI QR detected</p><p className="mt-1 text-xs leading-5">Some UPI apps block personal payments opened by another app. Choose an app below; PG HUB will copy the UPI ID and open that app. Select “Pay by UPI ID,” paste it, and enter ₹{Number(amount).toLocaleString("en-IN")}.</p></div>}
              {nativePlatform ? <>
                <div className="space-y-2"><p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Available apps</p>{sortedApps.map((app) => <button type="button" key={app.packageName} disabled={busy} onClick={() => void (personalQr ? launchManualUpiId(app.packageName) : launch(app.packageName))} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border bg-white px-4 text-left dark:bg-card"><Smartphone className="h-5 w-5 text-[#4936ef]" /><span className="flex-1"><span className="block text-sm font-black">{app.label}</span>{personalQr && <span className="block text-[11px] font-semibold text-muted-foreground">UPI ID copied · open Pay by UPI ID</span>}</span>{app.packageName === preferredPackage && <span className="rounded-full bg-[#f1efff] px-2 py-1 text-[10px] font-black text-[#4936ef]">Preferred</span>}<ChevronRight className="h-5 w-5" /></button>)}{!personalQr && <button type="button" disabled={busy} onClick={() => void launch()} className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-dashed px-4 text-left"><Smartphone className="h-5 w-5" /><span className="flex-1 text-sm font-black">Choose another UPI app</span></button>}</div>
                <label className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-semibold"><Checkbox checked={remember} onCheckedChange={(checked) => setRemember(Boolean(checked))} /> Remember the app I choose</label>
              </> : <button type="button" disabled={busy} onClick={() => void launch()} className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl bg-[#4936ef] px-4 text-left text-white shadow-md disabled:opacity-45"><Smartphone className="h-5 w-5" /><span className="flex-1"><span className="block text-sm font-black">Open UPI app</span><span className="block text-xs text-white/70">Available on a phone browser</span></span><ChevronRight className="h-5 w-5" /></button>}
              <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">PG HUB never sees or stores your UPI PIN. Returning to PG HUB does not prove payment success.</p>
            </>}

            {stage === "result" && <>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f1efff] text-[#4936ef]">
                  <CircleAlert className="h-8 w-8" />
                </div>
                <h2 className="mt-3 text-xl font-black">How was this payment completed?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose once. PG HUB records only what you confirm.</p>
              </div>
              <div className="space-y-2">
                <ResultButton icon={Check} tone="text-emerald-600 bg-emerald-50" label="UPI payment successful" helper="Add to bill totals and payment history" loading={savingOutcome === "success"} disabled={Boolean(savingOutcome)} onClick={() => void chooseOutcome("success")} />
                <ResultButton icon={Banknote} tone="text-amber-700 bg-amber-50" label="Paid by cash instead" helper="Add as cash and note the UPI attempt" loading={savingOutcome === "cash"} disabled={Boolean(savingOutcome)} onClick={() => void chooseOutcome("cash")} />
                <ResultButton icon={QrCode} tone="text-purple-600 bg-purple-50" label="Scan another UPI QR" helper="Retry with a different physical QR code" loading={false} disabled={Boolean(savingOutcome)} onClick={retryUpiScan} />
                <button type="button" disabled={Boolean(savingOutcome)} onClick={() => void chooseOutcome("cancel")} className="min-h-12 w-full rounded-xl text-sm font-bold text-muted-foreground disabled:opacity-50">Cancel without recording</button>
              </div>
            </>}

            {stage === "receipt" && receipt && <PaymentReceipt receipt={receipt} onDone={() => onOpenChange(false)} />}

            {error && <div role="alert" className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">{error.includes("offline") ? <WifiOff className="h-5 w-5 shrink-0" /> : permissionDenied ? <Camera className="h-5 w-5 shrink-0" /> : <CircleAlert className="h-5 w-5 shrink-0" />}<div className="flex-1"><p className="font-bold">{error}</p>{permissionDenied && nativePlatform && <button type="button" onClick={() => void openCameraSettings()} className="mt-2 min-h-11 rounded-xl bg-white px-3 text-xs font-black text-rose-700">Open app settings</button>}{permissionDenied && !nativePlatform && <p className="mt-2 text-xs font-semibold">Allow camera access in this site's browser settings, then rescan.</p>}{qr && stage !== "receipt" && <button type="button" onClick={resetScan} className="mt-2 flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-rose-700"><RotateCcw className="h-4 w-4" /> Rescan QR</button>}</div></div>}
            {busy && stage !== "entry" && <div className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Please wait…</div>}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mini Calculator Dialog */}
      <CalculatorDialog
        open={calcOpen}
        onOpenChange={setCalcOpen}
        initialExpr={amount}
        onApply={(calcAmount) => setAmount(calcAmount)}
      />

      <AlertDialog open={Boolean(conflict)} onOpenChange={(next) => !next && setConflict(null)}><AlertDialogContent className="max-w-[calc(100%-28px)] rounded-[24px]"><AlertDialogHeader><AlertDialogTitle>QR amount is different</AlertDialogTitle><AlertDialogDescription>This QR contains ₹{conflict?.qrAmount.toLocaleString("en-IN")}. Use QR amount or keep ₹{conflict?.entered.toLocaleString("en-IN")}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="gap-2 sm:gap-0"><AlertDialogCancel onClick={() => { const selected = qr; setConflict(null); if (selected) void prepareApps(selected, Number(amount)).catch((e) => setError(messageForError(e))); }}>Keep ₹{conflict?.entered.toLocaleString("en-IN")}</AlertDialogCancel><AlertDialogAction className="bg-[#4936ef]" onClick={() => { const selected = qr; const nextAmount = conflict?.qrAmount; if (nextAmount) setAmount(String(nextAmount)); setConflict(null); if (selected && nextAmount) void prepareApps(selected, nextAmount).catch((e) => setError(messageForError(e))); }}>Use ₹{conflict?.qrAmount.toLocaleString("en-IN")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};

const CalculatorDialog = ({
  open,
  onOpenChange,
  initialExpr,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialExpr: string;
  onApply: (val: string) => void;
}) => {
  const [expr, setExpr] = useState(initialExpr || "");

  useEffect(() => {
    if (open) setExpr(initialExpr || "");
  }, [open, initialExpr]);

  const evalResult = useMemo(() => {
    return safeEvaluateExpression(expr);
  }, [expr]);

  const handleKey = (key: string) => {
    if (key === "C") setExpr("");
    else if (key === "⌫") setExpr((prev) => prev.slice(0, -1));
    else if (key === "=") {
      if (evalResult !== "Error") setExpr(evalResult);
    } else setExpr((prev) => prev + key);
  };

  const keys = [
    ["7", "8", "9", "/"],
    ["4", "5", "6", "*"],
    ["1", "2", "3", "-"],
    ["0", ".", "=", "+"],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-32px)] rounded-[26px] p-4 sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Calculator className="h-5 w-5 text-[#4936ef]" /> Amount Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="my-2 rounded-2xl bg-slate-900 p-4 text-right text-white">
          <div className="h-5 text-xs text-slate-400 font-mono overflow-x-auto truncate">{expr || "0"}</div>
          <div className="mt-1 text-3xl font-black font-mono text-emerald-400">₹{evalResult}</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            className="col-span-2 min-h-11 rounded-xl bg-rose-100 text-rose-700 font-black text-xs hover:bg-rose-200"
            onClick={() => handleKey("C")}
          >
            Clear (C)
          </button>
          <button
            type="button"
            className="col-span-2 min-h-11 rounded-xl bg-slate-200 text-slate-800 font-black text-xs hover:bg-slate-300 dark:bg-slate-800 dark:text-white"
            onClick={() => handleKey("⌫")}
          >
            Delete ⌫
          </button>

          {keys.flat().map((k) => {
            const isOp = ["/", "*", "-", "+"].includes(k);
            return (
              <button
                key={k}
                type="button"
                className={cn(
                  "min-h-11 rounded-xl text-base font-black transition-all active:scale-95",
                  isOp
                    ? "bg-[#f1efff] text-[#4936ef] dark:bg-[#302858] dark:text-[#b6a2ff]"
                    : k === "="
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-card dark:text-white"
                )}
                onClick={() => handleKey(k)}
              >
                {k}
              </button>
            );
          })}
        </div>

        <DialogFooter className="mt-2 flex-row gap-2">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-xl bg-[#4936ef] text-white font-black hover:bg-[#3827d7]"
            onClick={() => {
              if (evalResult !== "Error") {
                onApply(evalResult);
                onOpenChange(false);
              }
            }}
          >
            Use ₹{evalResult}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ResultButton = ({ icon: Icon, tone, label, helper, loading, disabled, onClick }: { icon: typeof Check; tone: string; label: string; helper: string; loading: boolean; disabled: boolean; onClick: () => void }) => <button type="button" disabled={disabled} onClick={onClick} className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border bg-white px-3 text-left disabled:cursor-wait disabled:opacity-55 dark:bg-card"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}</span><span className="min-w-0 flex-1"><span className="block text-sm font-black">{label}</span><span className="mt-0.5 block text-[11px] font-semibold text-muted-foreground">{loading ? "Saving your selection…" : helper}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" /></button>;
const PaymentReceipt = ({ receipt, onDone }: { receipt: BillPaymentDraft; onDone: () => void }) => {
  const affectsTotals = receipt.status === "Paid" || receipt.status === "Partially Paid";
  const failed = receipt.status === "Failed";
  const pending = receipt.status === "Pending";
  const Icon = failed ? X : pending ? Clock3 : Check;
  const iconTone = failed ? "bg-rose-100 text-rose-700" : pending ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700";
  const title = failed ? "Failure recorded" : pending ? "Pending payment recorded" : "Payment recorded";
  const description = affectsTotals ? "Bill totals and payment history are updated." : "Payment history is updated; bill totals remain unchanged.";
  return <div className="text-center"><div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${iconTone}`}><Icon className="h-10 w-10" /></div><h2 className="mt-3 text-2xl font-black">{title}</h2><p className="text-sm text-muted-foreground">{description}</p><div className="mt-5 rounded-[22px] border bg-white p-4 text-left dark:bg-card"><div className="grid grid-cols-3 gap-2 border-b pb-3 text-center"><ReceiptAmount label="Amount" amount={receipt.amount} /><ReceiptAmount label="Added to bills" amount={affectsTotals ? receipt.amount : 0} /><ReceiptAmount label="Not added" amount={affectsTotals ? 0 : receipt.amount} /></div><ReceiptRow label="Transaction ID" value={receipt.transactionId} mono /><ReceiptRow label="Category" value={receipt.categoryName} /><ReceiptRow label="Method" value={receipt.paymentMethod} /><ReceiptRow label="Status" value={receipt.status} /><ReceiptRow label="Payee" value={receipt.payeeName || "Not provided"} /><ReceiptRow label="UPI ID" value={receipt.maskedUpiId || "Not stored"} /></div><Button className="mt-4 h-12 w-full rounded-2xl bg-[#4936ef] font-black" onClick={onDone}>Done</Button></div>;
};
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
