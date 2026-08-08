import { useMemo, useState } from "react";
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
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  getReferralStats,
  shareReferralInvite,
  validateAndApplyReferralCode,
} from "@/utils/referralHelper";

export default function ReferralPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const stats = useMemo(() => getReferralStats(user?.id, user?.email), [user?.email, user?.id]);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [appliedCode, setAppliedCode] = useState(stats.appliedReferralCode);
  const [sharing, setSharing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

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

  const applyCode = () => {
    if (!inputCode.trim()) return;
    setIsApplying(true);
    const result = validateAndApplyReferralCode(inputCode, stats.referralCode);
    setIsApplying(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    const normalizedCode = inputCode.trim().toUpperCase();
    setAppliedCode(normalizedCode);
    setInputCode("");
    toast.success(result.message);
  };

  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background font-sans">
      {/* Full-bleed hero with illustration */}
      <div className="relative flex-shrink-0 overflow-hidden">
        {/* Background gradient layer */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(160deg, #3730a3 0%, #4f46e5 40%, #7c3aed 100%)",
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
        <div className="relative z-10 px-2 pb-4 pt-2">
          <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
            <img
              src="/refer-hero.png"
              alt="Refer & Earn"
              className="w-full h-auto max-h-[220px] object-cover object-center"
            />
          </div>
          <div className="text-center mt-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Limited Campaign</span>
            </div>
            <h2 className="text-[28px] font-black leading-tight tracking-tight text-white text-balance">
              Invite an owner,<br />earn a free month.
            </h2>
            <p className="mx-auto mt-2 max-w-[300px] text-[12px] leading-relaxed text-white/75">
              Your friend gets <strong className="text-amber-300 font-extrabold">30% off</strong> their first month.
              You get <strong className="text-amber-300 font-extrabold">1 month free</strong> once they subscribe.
            </p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-2 -mt-4 relative z-20 grid grid-cols-3 gap-2">
        {[
          { icon: Users, value: stats.totalInvited, label: "Invited", color: "text-blue-600 dark:text-blue-300", bg: "bg-blue-500/10" },
          { icon: UserPlus, value: stats.activePaidReferrals, label: "Joined", color: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-500/10" },
          { icon: Trophy, value: `${stats.freeMonthsEarned}/${stats.maxMonthsPerYear}`, label: "Earned", color: "text-violet-600 dark:text-violet-300", bg: "bg-violet-500/10" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-3xl border border-border bg-card p-3 text-center shadow-[0_8px_32px_-16px_rgba(15,23,42,.5)] backdrop-blur"
            >
              <span className={`mx-auto grid h-9 w-9 place-items-center rounded-2xl ${item.bg}`}>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </span>
              <strong className="mt-2 block text-xl font-black leading-none">{item.value}</strong>
              <span className="mt-1 block text-[9px] font-black uppercase tracking-wide text-muted-foreground">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 pt-4 pb-10 space-y-3">
        {/* Invite code card */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-black">Your invite code</h3>
              <p className="text-[11px] text-muted-foreground">Share with fellow PG owners.</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/10">
              <Share2 className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 mb-3">
            <span className="min-w-0 flex-1 truncate text-center font-mono text-base font-black tracking-[.16em] text-primary">
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
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-black mb-3">How it works</h3>
          <ol className="space-y-3">
            {[
              { icon: Share2, title: "Share your code", copy: "Send the invite to any PG owner.", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
              { icon: UserPlus, title: "They subscribe", copy: "Your friend gets 30% off month one.", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
              { icon: Trophy, title: "You get rewarded", copy: "One free month lands on your plan.", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
            ].map((step, index, list) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative flex gap-3 pl-1">
                  {index < list.length - 1 && (
                    <span className="absolute left-[21px] top-11 h-[calc(100%-18px)] w-px bg-border" aria-hidden="true" />
                  )}
                  <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${step.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-xs font-black">{step.title}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{step.copy}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Apply a code */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-black">Have a referral code?</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Apply it before your first paid subscription to get 30% off.</p>

          {appliedCode ? (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />
              Applied: <span className="font-mono">{appliedCode}</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={inputCode}
                onChange={(event) => setInputCode(event.target.value.toUpperCase())}
                placeholder="PGHUB-OWNER1234"
                autoCapitalize="characters"
                className="h-12 rounded-2xl font-mono text-xs"
              />
              <Button
                type="button"
                onClick={applyCode}
                disabled={isApplying || !inputCode.trim()}
                className="h-12 rounded-2xl px-5 font-black shrink-0"
              >
                Apply
              </Button>
            </div>
          )}

          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Maximum {stats.maxMonthsPerYear} free months yearly. Self-referrals and duplicate accounts are excluded.
          </p>
        </section>
      </div>
    </main>
  );
}
