import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, LogOut, Mail, RefreshCw } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import { completeOnboarding } from "@/lib/onboardingState";

const RESEND_SECONDS = 60;

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);

  const sentKey = useMemo(() => `pgh_google_code_sent_${user?.id || "unknown"}`, [user?.id]);
  const email = user?.email || "your Google email";

  const sendCode = useCallback(async (quiet = false) => {
    if (!user || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("google-email-verification", {
      body: { action: "send" },
    });
    sendingRef.current = false;
    setSending(false);
    if (error || data?.error) {
      if (!quiet) toast.error(data?.error || error?.message || "Could not send the confirmation code.");
      if (data?.retryAfter) setCountdown(data.retryAfter);
      return;
    }
    sessionStorage.setItem(sentKey, String(Date.now()));
    setCountdown(data?.retryAfter || RESEND_SECONDS);
    if (!quiet) toast.success(`Confirmation code sent to ${email}`);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [email, sentKey, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase.functions.invoke("google-email-verification", { body: { action: "status" } })
      .then(({ data }) => {
        if (!active) return;
        if (data?.verified) {
          setVerified(true);
          setChecking(false);
          return;
        }
        setChecking(false);
        const lastSent = Number(sessionStorage.getItem(sentKey) || 0);
        const secondsLeft = Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - lastSent) / 1000));
        if (secondsLeft > 0) setCountdown(secondsLeft);
        else void sendCode(true);
      });
    return () => { active = false; };
  }, [sentKey, sendCode, user]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    const { data, error } = await supabase.functions.invoke("google-email-verification", {
      body: { action: "verify", code },
    });
    setVerifying(false);
    if (error || data?.error || !data?.verified) {
      toast.error(data?.error || error?.message || "That code could not be verified.");
      setCode("");
      inputRef.current?.focus();
      return;
    }
    setVerified(true);
    completeOnboarding();
    toast.success("Email confirmed. Welcome to PG HUB!");
    window.setTimeout(() => navigate("/", { replace: true }), 450);
  };

  if (isLoading || checking) {
    return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }
  if (!isAuthenticated) return <Navigate to="/auth/email" replace />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-slate-50 px-4 py-8 grid place-items-center">
      <section className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-950/10 sm:p-8">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
          {verified ? <CheckCircle2 className="h-8 w-8" /> : <Mail className="h-8 w-8" />}
        </div>
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">One last security step</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">Confirm your email</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">We sent a six-digit code to <strong className="text-slate-900">{email}</strong>. Enter it below to finish signing in.</p>
        </div>

        <form onSubmit={verify} className="mt-7 space-y-5">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800"><LockKeyhole className="h-4 w-4 text-blue-600" /> Confirmation code</span>
            <input
              ref={inputRef}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              aria-label="Six-digit confirmation code"
              placeholder="000000"
              className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 text-center font-mono text-3xl font-black tracking-[0.35em] text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <Button type="submit" disabled={code.length !== 6 || verifying || verified} className="h-12 w-full rounded-xl text-base font-extrabold">
            {verifying ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying…</> : verified ? "Confirmed" : "Confirm & sign in"}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3 text-sm">
          <button type="button" disabled={sending || countdown > 0} onClick={() => void sendCode()} className="inline-flex items-center gap-2 font-bold text-blue-600 disabled:text-slate-400">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
          </button>
          <button type="button" onClick={async () => { await signOut(); navigate("/auth/email", { replace: true }); }} className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-slate-800">
            <LogOut className="h-4 w-4" /> Use another account
          </button>
        </div>
      </section>
    </main>
  );
}
