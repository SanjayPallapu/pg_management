import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import journeyHero from "@/assets/pg-hub/hub-building-platform.png";
import { PGHubBrand } from "@/features/pg-hub/PGHubBrand";
import { PGHubButton } from "@/features/pg-hub/PGHubButton";
import { PGHubShell } from "@/features/pg-hub/PGHubShell";
import { useAuth } from "@/hooks/useAuth";
import {
  isPhoneOtpTestModeEnabled,
  startPhoneOtpTestChallenge,
} from "@/lib/phoneOtpTestMode";

export default function PhoneLogin() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, requestPhoneOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const digits = useMemo(() => phone.replace(/\D/g, "").slice(0, 10), [phone]);
  const valid = digits.length === 10;

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const continueWithOtp = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    const fullPhone = `+91${digits}`;

    if (isPhoneOtpTestModeEnabled() && startPhoneOtpTestChallenge(fullPhone)) {
      sessionStorage.setItem("pghOtpPhone", fullPhone);
      setSubmitting(false);
      toast.info("OTP test mode is active. Use 123456.");
      navigate("/auth/otp");
      return;
    }

    const { error } = await requestPhoneOtp(fullPhone);
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not send OTP. Try email sign in instead.");
      return;
    }
    sessionStorage.setItem("pghOtpPhone", fullPhone);
    navigate("/auth/otp");
  };

  return (
    <PGHubShell variant="light" className="pgh-login">
      <div className="pgh-login__page">
        <section className="pgh-login__hero">
          <div className="pgh-login__visual" aria-hidden="true">
            <img src={journeyHero} alt="" />
          </div>
          <div className="pgh-login__veil" aria-hidden="true" />
          <PGHubBrand dark />
          <motion.div className="pgh-login__copy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="pgh-login__eyebrow"><ShieldCheck size={15} /> Secure owner access</span>
            <h1 className="pgh-title">Welcome to<br /><em>PG HUB</em></h1>
            <p className="pgh-subtitle">Sign in with your mobile number to manage your PG.</p>
          </motion.div>
        </section>

        <motion.section className="pgh-login__card" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 20, delay: .12 }}>
          <div className="pgh-sheet-heading"><span>Sign in</span><strong>Enter your mobile number</strong><small>We’ll send a 6-digit verification code.</small></div>
          <label className="pgh-login__label" htmlFor="phone">Mobile number</label>
          <div className={`pgh-phone-field ${valid ? "is-valid" : ""}`}>
            <span className="pgh-phone-field__country">+91 <ChevronDown size={18} /></span>
            <span className="pgh-phone-field__divider" />
            <input id="phone" value={digits} onChange={(event) => setPhone(event.target.value)} inputMode="numeric" autoComplete="tel-national" placeholder="Enter mobile number" aria-describedby="phone-help" />
          </div>
          <PGHubButton onClick={continueWithOtp} disabled={!valid} loading={submitting}>Continue with OTP</PGHubButton>
          <div className="pgh-trust"><span /><i><ShieldCheck size={22} /></i><span /></div>
          <p id="phone-help" className="pgh-login__alternative">Prefer another method? <button type="button" onClick={() => navigate("/auth/email")}>Use email or Google</button></p>
        </motion.section>
      </div>
    </PGHubShell>
  );
}
