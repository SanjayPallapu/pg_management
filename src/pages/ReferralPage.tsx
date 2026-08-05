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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      toast.success("Referral code copied");
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
    const result = validateAndApplyReferralCode(inputCode, stats.referralCode);
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
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#f5f6fc] font-sans text-foreground dark:bg-[#0b1020]">
      {/* Illustrated hero backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(120%_100%_at_20%_0%,#5b8cff_0%,#3b52e8_45%,#7a3ff0_100%)]" aria-hidden="true">
        <span className="absolute -left-16 top-24 h-56 w-56 rounded-full bg-white/10 blur-[2px]" />
        <span className="absolute -right-12 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <span className="absolute right-16 top-40 h-3 w-3 rounded-full bg-white/60" />
        <span className="absolute left-24 top-16 h-2 w-2 rounded-full bg-white/50" />
        <span className="absolute left-1/2 top-52 h-1.5 w-1.5 rounded-full bg-white/40" />
      </div>

      <header className="relative z-10 flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] text-white">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur transition hover:bg-white/25"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-black tracking-tight">Refer &amp; Earn</h1>
          <p className="text-[11px] text-white/70">Grow the PG HUB community</p>
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-10">
        {/* Illustration */}
        <section className="mt-3 text-center text-white">
          <svg viewBox="0 0 320 190" className="mx-auto h-[180px] w-full max-w-[380px]" role="img" aria-label="Two PG owners exchanging a reward gift">
            <ellipse cx="160" cy="170" rx="120" ry="12" fill="rgba(0,0,0,.16)" />
            {/* left person */}
            <circle cx="86" cy="60" r="22" fill="#ffd9b3" />
            <path d="M64 60a22 22 0 0 1 44 0v-6a22 22 0 0 0-44 0z" fill="#2b2140" />
            <path d="M56 168c0-24 13-44 30-44s30 20 30 44z" fill="#ff8f5e" />
            <rect x="74" y="120" width="24" height="14" rx="6" fill="#ffd9b3" />
            {/* right person */}
            <circle cx="234" cy="60" r="22" fill="#f8c9a4" />
            <path d="M212 58a22 22 0 0 1 44 0c0-16-9-24-22-24s-22 8-22 24z" fill="#3b2a5a" />
            <path d="M204 168c0-24 13-44 30-44s30 20 30 44z" fill="#24d3a5" />
            <rect x="222" y="120" width="24" height="14" rx="6" fill="#f8c9a4" />
            {/* gift in the middle */}
            <rect x="134" y="92" width="52" height="46" rx="10" fill="#ffcf4d" />
            <rect x="134" y="104" width="52" height="10" fill="#ff9f1c" />
            <rect x="154" y="92" width="12" height="46" fill="#ff9f1c" />
            <path d="M148 92c-10-10 4-20 12-8 8-12 22-2 12 8z" fill="#ff6b6b" />
            {/* sparkles */}
            <path d="M118 74l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="rgba(255,255,255,.9)" />
            <path d="M204 66l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="rgba(255,255,255,.75)" />
            <circle cx="160" cy="60" r="4" fill="rgba(255,255,255,.7)" />
          </svg>

          <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/70">Owner rewards</p>
          <h2 className="mt-1.5 text-[26px] font-black leading-tight tracking-tight">
            Invite an owner.
            <br />
            Earn a free month.
          </h2>
          <p className="mx-auto mt-2 max-w-[290px] text-xs leading-relaxed text-white/80">
            They get 30% off their first paid month. Your reward unlocks the moment they activate.
          </p>
        </section>

        {/* Floating stats */}
        <section className="mt-6 grid grid-cols-3 gap-2">
          {[
            { icon: Users, value: stats.totalInvited, label: "Invited", tone: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
            { icon: UserPlus, value: stats.activePaidReferrals, label: "Joined", tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
            { icon: Trophy, value: stats.freeMonthsEarned, label: "Earned", tone: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-3xl border border-white/60 bg-card/95 p-3 text-center shadow-[0_18px_40px_-28px_rgba(15,23,42,.9)] backdrop-blur dark:border-white/10">
                <span className={`mx-auto grid h-9 w-9 place-items-center rounded-2xl ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <strong className="mt-2 block text-xl font-black leading-none">{item.value}</strong>
                <span className="mt-1 block text-[9px] font-black uppercase tracking-wide text-muted-foreground">{item.label}</span>
              </div>
            );
          })}
        </section>

        {/* Invite card */}
        <section className="mt-3 rounded-3xl border border-border/60 bg-card p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,.9)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black">Your invite code</h3>
              <p className="text-[11px] text-muted-foreground">Share it with fellow PG owners.</p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <Share2 className="h-4 w-4" />
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-center font-mono text-base font-black tracking-[.18em] text-primary">{stats.referralCode}</span>
            <Button type="button" variant="ghost" size="icon" onClick={copyCode} className="h-9 w-9 rounded-xl" aria-label="Copy referral code">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <Button
            type="button"
            onClick={shareInvite}
            disabled={sharing}
            className="mt-3 h-13 w-full rounded-2xl bg-[linear-gradient(100deg,#3b52e8,#7a3ff0)] py-6 text-sm font-black text-primary-foreground shadow-lg shadow-indigo-900/20 hover:opacity-95"
          >
            <Share2 className="mr-2 h-4 w-4" />
            {sharing ? "Opening share options…" : "Share invitation"}
          </Button>
        </section>

        {/* How it works — illustrated timeline */}
        <section className="mt-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-black">How it works</h3>
          <ol className="mt-3 space-y-3">
            {[
              { icon: Share2, title: "Share your code", copy: "Send the invite to any PG owner." },
              { icon: UserPlus, title: "They subscribe", copy: "Your friend gets 30% off month one." },
              { icon: Trophy, title: "You get rewarded", copy: "One free month lands on your plan." },
            ].map((step, index, list) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative flex gap-3 pl-1">
                  {index < list.length - 1 && <span className="absolute left-[21px] top-11 h-[calc(100%-18px)] w-px bg-border" aria-hidden="true" />}
                  <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs font-black">{step.title}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{step.copy}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Apply a code */}
        <section className="mt-3 rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-black">Have a code?</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Apply it before your first paid subscription.</p>
          {appliedCode ? (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" />
              Applied: <span className="font-mono">{appliedCode}</span>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Input
                value={inputCode}
                onChange={(event) => setInputCode(event.target.value.toUpperCase())}
                placeholder="PGHUB-OWNER1234"
                autoCapitalize="characters"
                className="h-12 rounded-2xl font-mono text-xs"
              />
              <Button type="button" onClick={applyCode} disabled={!inputCode.trim()} className="h-12 rounded-2xl px-5 font-black">
                Apply
              </Button>
            </div>
          )}
          <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Maximum {stats.maxMonthsPerYear} free months yearly. Self-referrals and duplicate accounts are excluded.
          </p>
        </section>
      </div>
    </main>
  );
}
