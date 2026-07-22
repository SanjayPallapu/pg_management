import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import journeySecurity from "@/assets/pg-hub/journey-security-transparent.png";
import pgHubLogo from "@/assets/pg-hub/pg-hub-logo.png";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";
import {
  PHONE_OTP_TEST_CODE,
  hasPhoneOtpTestChallenge,
} from "@/lib/phoneOtpTestMode";

export default function OTPVerification() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { verifyPhoneOtp, requestPhoneOtp } = useAuth();
  const phone = sessionStorage.getItem("pghOtpPhone") ?? "";
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const national = phone.replace(/^\+91/, "");
  const formatted = useMemo(() => `${national.slice(0, 5)} ${national.slice(5)}`.trim(), [national]);
  const isTestMode = hasPhoneOtpTestChallenge(phone);

  useEffect(() => {
    if (!phone) navigate("/auth", { replace: true });
  }, [navigate, phone]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const verify = async () => {
    if (otp.length !== 6 || !phone || submitting) return;
    setSubmitting(true);
    const { data, error } = await verifyPhoneOtp(phone, otp);
    if (error || !data.user) {
      setSubmitting(false);
      toast.error(error?.message || "Invalid or expired OTP.");
      return;
    }

    if (isTestMode) {
      setSubmitting(false);
      sessionStorage.removeItem("pghOtpPhone");
      sessionStorage.setItem("isNewSignup", "true");
      navigate("/setup/property", { replace: true });
      return;
    }

    const { data: existingPG, error: pgError } = await supabase
      .from("pgs")
      .select("id")
      .eq("owner_id", data.user.id)
      .limit(1)
      .maybeSingle();

    setSubmitting(false);
    if (pgError) {
      toast.error("Signed in, but we could not load your PG workspace.");
      navigate("/", { replace: true });
      return;
    }

    sessionStorage.removeItem("pghOtpPhone");
    if (existingPG) {
      sessionStorage.removeItem("isNewSignup");
      navigate("/", { replace: true });
    } else {
      sessionStorage.setItem("isNewSignup", "true");
      navigate("/setup/property", { replace: true });
    }
  };

  const resend = async () => {
    if (seconds > 0 || !phone) return;
    if (isTestMode) {
      setSeconds(24);
      toast.info(`OTP test code: ${PHONE_OTP_TEST_CODE}`);
      return;
    }
    const { error } = await requestPhoneOtp(phone);
    if (error) toast.error(error.message);
    else {
      setSeconds(24);
      toast.success("A new OTP has been sent.");
    }
  };

  const changeNumberOrResend = () => {
    if (seconds > 0) {
      sessionStorage.removeItem("pghOtpPhone");
      navigate("/auth");
      return;
    }
    void resend();
  };

  return (
    <PGHubShell variant="light" className="pgh-otp">
      <div className="pgh-page">
        <header className="pgh-otp__header flex items-center justify-between">
          <button type="button" onClick={() => navigate("/auth")} aria-label="Back"><ArrowLeft size={23} /></button>
        </header>
        <section className="pgh-otp__copy">
          <h1 className="pgh-title">Verify your <em>number</em></h1>
          <p className="pgh-subtitle">Enter the 6-digit code sent to <strong>+91 {formatted}</strong></p>
          {isTestMode && <p className="pgh-test-mode">Test mode · use OTP <strong>{PHONE_OTP_TEST_CODE}</strong></p>}
        </section>
        <div className="pgh-otp__art pgh-otp__security">
          <img src={journeySecurity} alt="Secure phone verification" />
        </div>
        <section className="pgh-otp__panel">
          <button type="button" className="pgh-otp__boxes" onClick={() => inputRef.current?.focus()} aria-label="Enter OTP">
            {Array.from({ length: 6 }, (_, index) => <span key={index} className={index === otp.length ? "is-active" : ""}>{otp[index] || ""}</span>)}
            <input ref={inputRef} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus aria-hidden="true" />
          </button>
          <div className="pgh-otp__actions">
            <div><Clock3 size={18} /><span>{seconds > 0 ? <>Resend code in <strong>00:{String(seconds).padStart(2, "0")}</strong></> : "Didn't receive the code?"}</span></div>
            <button type="button" className="pgh-link-button" onClick={changeNumberOrResend}>{seconds > 0 ? "Change number" : "Resend code"}</button>
            <PGHubButton onClick={verify} disabled={otp.length !== 6} loading={submitting}>Verify & continue</PGHubButton>
          </div>
        </section>
      </div>
    </PGHubShell>
  );
}
