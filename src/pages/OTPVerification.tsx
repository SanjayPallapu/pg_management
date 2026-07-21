import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock3, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import otpSecurity from "@/assets/pg-hub/otp-security.png";
import { PGHubBrand } from "@/features/pg-hub/PGHubBrand";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/proxyClient";

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
    const { error } = await requestPhoneOtp(phone);
    if (error) toast.error(error.message);
    else {
      setSeconds(24);
      toast.success("A new OTP has been sent.");
    }
  };

  return (
    <PGHubShell variant="light" className="pgh-otp">
      <div className="pgh-page">
        <header className="pgh-otp__header">
          <button type="button" onClick={() => navigate("/auth")} aria-label="Back"><ArrowLeft size={23} /></button>
          <PGHubBrand compact />
          <span />
        </header>
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <p className="pgh-otp__kicker">Verify Phone</p>
          <h1 className="pgh-title">Enter <em>OTP</em></h1>
          <p className="pgh-subtitle">We sent a 6-digit code to<br /><strong>+91 {formatted}</strong></p>
        </motion.section>
        <motion.div className="pgh-otp__art" initial={{ opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .12 }}>
          <img src={otpSecurity} alt="Secure phone verification" />
        </motion.div>
        <button type="button" className="pgh-otp__boxes" onClick={() => inputRef.current?.focus()} aria-label="Enter OTP">
          {Array.from({ length: 6 }, (_, index) => <motion.span key={index} animate={{ scale: otp[index] ? [1, 1.1, 1] : 1 }} className={index === otp.length ? "is-active" : ""}>{otp[index] || ""}</motion.span>)}
          <input ref={inputRef} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus aria-hidden="true" />
        </button>
        <div className="pgh-otp__actions">
          <div><Clock3 size={18} /><span>{seconds > 0 ? <>Resend code in <strong>00:{String(seconds).padStart(2, "0")}</strong></> : "Didn't receive the code?"}</span></div>
          <button type="button" className="pgh-link-button" onClick={resend} disabled={seconds > 0}>{seconds > 0 ? "Change number" : "Resend code"}</button>
          <PGHubButton onClick={verify} disabled={otp.length !== 6} loading={submitting}>Verify & Continue</PGHubButton>
          <p className="pgh-otp__note"><i><ShieldCheck size={18} /></i>Your number is used only for login and account security.</p>
        </div>
      </div>
    </PGHubShell>
  );
}
