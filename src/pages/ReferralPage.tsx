import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Share2,
  ShieldCheck,
  Users,
  UserPlus,
  Trophy,
  Tag,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  EMPTY_REFERRAL_STATS,
  getReferralStats,
  shareReferralInvite,
  validateAndApplyReferralCode,
} from "@/utils/referralHelper";

export default function ReferralPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(EMPTY_REFERRAL_STATS);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [appliedCode, setAppliedCode] = useState(stats.appliedReferralCode);
  const [sharing, setSharing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    let active = true;
    getReferralStats().then(data => {
      if (active) {
        setStats(data);
        setAppliedCode(data.appliedReferralCode);
      }
    }).catch(() => toast.error("Could not load referral rewards."));
    return () => { active = false; };
  }, []);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      toast.success("Referral code copied!");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  const shareInvite = async () => {
    setSharing(true);
    try {
      const result = await shareReferralInvite(stats.referralCode);
      if (result === "copied") toast.success("Invite copied. Share it anywhere.");
    } catch {
      toast.error("Could not open sharing. Please copy your code instead.");
    } finally {
      setSharing(false);
    }
  };

  const applyCode = async () => {
    if (!inputCode.trim()) return;
    setIsApplying(true);
    try {
      const result = await validateAndApplyReferralCode(inputCode, stats.referralCode);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const normalizedCode = inputCode.trim().toUpperCase();
      setAppliedCode(normalizedCode);
      setInputCode("");
      setStats(await getReferralStats());
      toast.success(result.message);
    } catch {
      toast.error("Could not apply this referral code. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background font-sans">
      {/* Full-bleed hero with illustration */}
      <div className="relative flex-shrink-0 overflow-hidden">
        {/* Background gradient layer */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(145deg, #020617 0%, #071b46 50%, #312e81 76%, #6d28d9 100%)",
          }}
          aria-hidden="true"
        />
        {/* Decorative circles */}
        <span className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/5" aria-hidden="true" />
        <span className="pointer-events-none absolute -right-16 top-8 h-48 w-48 rounded-full bg-white/5" aria-hidden="true" />
        <span className="pointer-events-none absolute left-1/3 -bottom-10 h-32 w-32 rounded-full bg-purple-400/20" aria-hidden="true" />

        {/* Header bar */}
        <header className="relative z-10 flex items-center gap-3 px-2 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black tracking-tight text-white">Refer &amp; Earn</h1>
            <p className="text-[11px] text-white/70">Grow the PG HUB community</p>
          </div>
        </header>

        {/* Illustration */}
        <div className="relative z-10 pb-4 pt-2">
          <div className="mx-auto w-full max-w-[520px] overflow-hidden border-y border-white/15 shadow-2xl">
            <img
              src="/refer-banner-v5.png"
              alt="Refer & Earn"
              className="w-full h-auto max-h-[220px] object-cover object-center"
            />
          </div>
          <div className="px-3 text-center mt-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Limited Campaign</span>
            </div>
            <h2 className="text-[28px] font-black leading-tight tracking-tight text-white text-balance">
              Invite an owner,<br />earn a free month.
            </h2>
            <p className="mx-auto mt-2 max-w-[300px] text-[12px] leading-relaxed text-white/75">
              After your friend's first successful payment, <strong className="text-amber-300 font-extrabold">both of you get 30 bonus days</strong> automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-auto w-full max-w-4xl px-4 -mt-4 relative z-20">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { icon: Users, value: stats.totalInvited, label: "Invited", color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-500/10" },
            { icon: UserPlus, value: stats.activePaidReferrals, label: "Joined", color: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-500/10" },
            { icon: Trophy, value: stats.freeMonthsEarned, label: "Months earned", color: "text-violet-600 dark:text-violet-300", bg: "bg-violet-500/10" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-3xl border border-border bg-card p-3 sm:p-4 text-center shadow-[0_8px_32px_-16px_rgba(15,23,42,.5)] backdrop-blur"
              >
                <span className={`mx-auto grid h-9 w-9 sm:h-11 sm:w-11 place-items-center rounded-2xl ${item.bg}`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color}`} />
                </span>
                <strong className="mt-2 block text-xl sm:text-2xl font-black leading-none">{item.value}</strong>
                <span className="mt-1 block text-[9px] sm:text-xs font-black uppercase tracking-wide text-muted-foreground">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-12">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invite code card */}
            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black">Your invite code</h3>
                    <p className="text-xs text-muted-foreground">Share with fellow PG owners.</p>
                  </div>
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/10">
                    <Share2 className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                  </span>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 mb-4">
                  <span className="min-w-0 flex-1 truncate text-center font-mono text-lg font-black tracking-[.16em] text-primary">
                    {stats.referralCode}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={copyCode}
                    className="h-9 w-9 rounded-xl shrink-0"
                    aria-label="Copy referral code"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                onClick={shareInvite}
                disabled={sharing}
                className="w-full h-12 rounded-2xl bg-[linear-gradient(100deg,#4f46e5,#7c3aed)] text-sm font-black text-white shadow-lg shadow-indigo-900/20 hover:opacity-95"
              >
                <Share2 className="mr-2 h-4 w-4" />
                {sharing ? "Opening share options..." : "Share invitation"}
              </Button>
            </section>

            {/* How it works */}
            <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm sm:text-base font-black mb-3">How it works</h3>
              <ol className="space-y-3.5">
                {[
                  { icon: Share2, title: "Share your code", copy: "Send the invite to any PG owner.", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                  { icon: UserPlus, title: "They subscribe", copy: "The first real paid charge confirms the referral.", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                  { icon: Trophy, title: "Both get rewarded", copy: "Thirty bonus days are added to both subscriptions.", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
                ].map((step, index, list) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.title} className="flex gap-3 text-left">
                      <div className="flex flex-col items-center">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${step.color}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        {index < list.length - 1 && <span className="w-0.5 flex-1 my-1 bg-border/60" />}
                      </div>
                      <div className="pt-0.5">
                        <h4 className="text-xs font-bold leading-tight">{step.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-normal">{step.copy}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>

          {/* Have an invite code? */}
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-black">Got an invite code?</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Enter the code shared by another PG owner to link your account for bonus days.
            </p>
            {appliedCode ? (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4 shrink-0" />
                <span>Referral linked: <strong className="font-mono tracking-wider">{appliedCode}</strong></span>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  className="h-11 rounded-2xl font-mono tracking-wider uppercase text-xs"
                />
                <Button
                  type="button"
                  onClick={applyCode}
                  disabled={isApplying || !inputCode.trim()}
                  className="h-11 rounded-2xl px-5 text-xs font-bold shrink-0"
                >
                  {isApplying ? "Applying..." : "Apply"}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
