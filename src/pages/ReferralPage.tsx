import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Share2,
  ShieldCheck,
  ArrowRight,
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
    <main className="min-h-screen bg-muted/20 font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b border-blue-400/20 bg-gradient-to-r from-[#0e6ce7] via-[#155bc7] to-[#243b8f] text-white shadow-lg shadow-blue-950/10">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center gap-3 px-3 py-2 sm:px-4">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 hover:bg-white/20"><ArrowLeft className="h-5 w-5" /></button>
          <div><h1 className="text-lg font-black tracking-tight">Refer &amp; Earn</h1><p className="text-xs text-blue-100">Grow the PG HUB community</p></div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-screen-2xl space-y-4 px-3 py-4 pb-10 sm:px-4">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e6ce7] via-[#2857d4] to-[#6b3ee8] p-5 text-white shadow-xl shadow-blue-950/15">
          <div className="absolute -right-4 -top-4 grid h-28 w-28 place-items-center rounded-full bg-white/10 text-white/70"><Gift className="h-11 w-11" /></div>
          <div className="relative max-w-[270px]">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-100">Owner rewards</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight">Invite an owner.<br />Earn one free month.</h2>
            <p className="mt-3 text-xs leading-relaxed text-blue-100">They receive 30% off their first paid month. Your reward unlocks after activation.</p>
          </div>
        </section>

        <section className="grid grid-cols-3 overflow-hidden rounded-2xl border border-border/70 bg-card py-4 text-center shadow-sm">
          <div><Users className="mx-auto h-4 w-4 text-blue-500" /><strong className="mt-1 block text-lg font-black">{stats.totalInvited}</strong><span className="text-[9px] font-bold uppercase text-muted-foreground">Invited</span></div>
          <div className="border-x border-border/60"><UserPlus className="mx-auto h-4 w-4 text-emerald-500" /><strong className="mt-1 block text-lg font-black">{stats.activePaidReferrals}</strong><span className="text-[9px] font-bold uppercase text-muted-foreground">Joined</span></div>
          <div><Trophy className="mx-auto h-4 w-4 text-violet-500" /><strong className="mt-1 block text-lg font-black">{stats.freeMonthsEarned}</strong><span className="text-[9px] font-bold uppercase text-muted-foreground">Earned</span></div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-end justify-between"><div><h2 className="text-sm font-black">Your invite</h2><p className="text-[11px] text-muted-foreground">Share the link or copy the code.</p></div><Share2 className="h-4 w-4 text-violet-500" /></div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
            <span className="min-w-0 flex-1 truncate font-mono text-sm font-black tracking-wider text-primary">{stats.referralCode}</span>
            <Button type="button" variant="ghost" size="icon" onClick={copyCode} className="h-9 w-9" aria-label="Copy referral code">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</Button>
          </div>
          <Button type="button" onClick={shareInvite} disabled={sharing} className="mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-black text-white"><Share2 className="mr-2 h-4 w-4" />{sharing ? "Opening share options…" : "Share invitation"}</Button>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <h2 className="text-sm font-black">How it works</h2>
          <div className="mt-4 flex items-start justify-between gap-1 text-center">
            {[{ icon: Share2, label: 'Share' }, { icon: UserPlus, label: 'Friend joins' }, { icon: Trophy, label: 'Reward' }].map((step, index, list) => {
              const Icon = step.icon;
              return <div key={step.label} className="contents"><div className="w-20"><span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><p className="mt-2 text-[10px] font-bold">{step.label}</p></div>{index < list.length - 1 && <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground/50" />}</div>;
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <h2 className="text-sm font-black">Apply a code</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Available before your first paid subscription.</p>
          {appliedCode ? <div className="mt-3 flex items-center gap-2 border-y border-emerald-500/30 py-3 text-xs font-bold text-emerald-600"><Check className="h-4 w-4" />Applied: <span className="font-mono">{appliedCode}</span></div> : <div className="mt-3 flex gap-2"><Input value={inputCode} onChange={(event) => setInputCode(event.target.value.toUpperCase())} placeholder="PGHUB-OWNER1234" autoCapitalize="characters" className="h-11 rounded-xl font-mono text-xs" /><Button type="button" onClick={applyCode} disabled={!inputCode.trim()} className="h-11 rounded-xl px-5 font-bold">Apply</Button></div>}
          <p className="mt-5 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />Maximum {stats.maxMonthsPerYear} free months yearly. Self-referrals and duplicate accounts are excluded.</p>
        </section>
      </div>
    </main>
  );
}
