import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Gift,
  HandCoins,
  Link2,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { getReferralStats, shareReferralInvite, validateAndApplyReferralCode } from "@/utils/referralHelper";

const steps = [
  { icon: Link2, title: "Share your invite", copy: "Send your personal PG HUB link to an owner." },
  { icon: UserPlus, title: "They get started", copy: "Your invitee joins and activates a paid plan." },
  { icon: HandCoins, title: "You get rewarded", copy: "A free month is added after their activation." },
];

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
    setAppliedCode(inputCode.trim().toUpperCase());
    setInputCode("");
    toast.success(result.message);
  };

  return (
    <main className="min-h-screen bg-[#0b1226] font-sans text-[#f7f8ff]">
      <header className="border-b border-white/10 bg-[#0b1226]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9da8d2]">PG HUB</p><h1 className="text-base font-black">Refer &amp; Earn</h1></div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-[#9b7bff]/30 bg-[#9b7bff]/10 px-3 py-1.5 text-xs font-bold text-[#c9bcff] sm:flex"><Sparkles className="h-3.5 w-3.5" /> Owner rewards</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-7 lg:px-8 lg:py-10">
        <section className="grid overflow-hidden rounded-[2rem] border border-[#9b7bff]/30 bg-[#151d3a] shadow-2xl shadow-black/20 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <div className="mb-5 flex w-fit items-center gap-2 rounded-full bg-[#ffbd8b]/15 px-3 py-1.5 text-xs font-black text-[#ffc49a]"><Gift className="h-3.5 w-3.5" /> One reward. Every successful invite.</div>
            <h2 className="max-w-xl text-balance text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl">Help another owner run their PG better.</h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#b9c1dd] sm:text-base">Invite a property owner to PG HUB. They get 30% off their first paid month, and you unlock one free month after activation.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Button type="button" onClick={shareInvite} disabled={sharing} className="h-12 rounded-2xl bg-[#9b7bff] px-6 font-black text-[#0b1226] hover:bg-[#b09aff]"><Share2 className="mr-2 h-4 w-4" />{sharing ? "Opening share options..." : "Share invitation"}</Button><Button type="button" variant="outline" onClick={copyCode} className="h-12 rounded-2xl border-white/15 bg-white/5 px-6 font-black text-white hover:bg-white/10">{copied ? <Check className="mr-2 h-4 w-4 text-[#7ee4ae]" /> : <Copy className="mr-2 h-4 w-4" />}Copy code</Button></div>
          </div>
          <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden border-t border-white/10 bg-[#222d58] p-8 lg:border-l lg:border-t-0">
            <div className="relative flex h-56 w-56 items-center justify-center rounded-[2.5rem] border border-[#9b7bff]/40 bg-[#101832] shadow-xl shadow-black/20"><div className="absolute -top-4 right-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#ffbd8b] text-[#422138] shadow-lg"><Gift className="h-6 w-6" /></div><div className="grid h-28 w-28 place-items-center rounded-full border-[10px] border-[#9b7bff]/30 bg-[#9b7bff]/15"><Trophy className="h-14 w-14 text-[#c9bcff]" /></div><div className="absolute -bottom-5 left-6 rounded-2xl border border-[#7ee4ae]/30 bg-[#102b2e] px-4 py-3 text-center shadow-lg"><p className="text-[10px] font-black uppercase tracking-wider text-[#9ee9be]">Your reward</p><p className="text-xl font-black text-white">1 free month</p></div></div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-3xl border border-white/10 bg-[#151d3a] py-5 text-center"><div><Users className="mx-auto h-5 w-5 text-[#9da8d2]" /><strong className="mt-2 block text-2xl font-black">{stats.totalInvited}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-[#9da8d2]">Invited</span></div><div><UserPlus className="mx-auto h-5 w-5 text-[#7ee4ae]" /><strong className="mt-2 block text-2xl font-black">{stats.activePaidReferrals}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-[#9da8d2]">Activated</span></div><div><Trophy className="mx-auto h-5 w-5 text-[#ffbd8b]" /><strong className="mt-2 block text-2xl font-black">{stats.freeMonthsEarned}</strong><span className="text-[10px] font-bold uppercase tracking-wider text-[#9da8d2]">Free months</span></div></section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-[#151d3a] p-6 sm:p-7"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black">Your invite code</h3><p className="mt-1 text-sm text-[#9da8d2]">Share this code with your next owner referral.</p></div><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#9b7bff]/15 text-[#c9bcff]"><Link2 className="h-5 w-5" /></div></div><div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#9b7bff]/40 bg-[#0d1530] p-3"><span className="flex-1 truncate px-2 font-mono text-lg font-black tracking-wider text-[#c9bcff]">{stats.referralCode}</span><Button type="button" variant="ghost" size="icon" onClick={copyCode} aria-label="Copy referral code" className="h-10 w-10 rounded-xl text-white hover:bg-white/10">{copied ? <Check className="h-4 w-4 text-[#7ee4ae]" /> : <Copy className="h-4 w-4" />}</Button></div></div>
          <div className="rounded-3xl border border-white/10 bg-[#151d3a] p-6 sm:p-7"><h3 className="text-lg font-black">How it works</h3><div className="mt-5 space-y-4">{steps.map((step, index) => { const Icon = step.icon; return <div key={step.title} className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#9b7bff]/15 text-[#c9bcff]"><Icon className="h-5 w-5" /></div><div><p className="text-sm font-black">{index + 1}. {step.title}</p><p className="mt-0.5 text-xs leading-5 text-[#9da8d2]">{step.copy}</p></div>{index < steps.length - 1 && <ArrowRight className="ml-auto mt-3 hidden h-4 w-4 text-[#606b92] sm:block" />}</div>; })}</div></div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#151d3a] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-black">Have a referral code?</h3><p className="mt-1 text-sm text-[#9da8d2]">Apply it before your first paid subscription.</p></div><ShieldCheck className="h-5 w-5 text-[#7ee4ae]" /></div>{appliedCode ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-[#7ee4ae]/30 bg-[#7ee4ae]/10 px-4 py-3 text-sm font-bold text-[#9ee9be]"><Check className="h-4 w-4" /> Applied: <span className="font-mono">{appliedCode}</span></div> : <div className="mt-5 flex flex-col gap-3 sm:flex-row"><Input value={inputCode} onChange={(event) => setInputCode(event.target.value.toUpperCase())} placeholder="PGHUB-OWNER1234" className="h-12 rounded-2xl border-white/10 bg-[#0d1530] font-mono text-sm text-white placeholder:text-[#606b92]" /><Button type="button" onClick={applyCode} disabled={!inputCode.trim()} className="h-12 rounded-2xl bg-[#9b7bff] px-7 font-black text-[#0b1226] hover:bg-[#b09aff]">Apply code</Button></div>}<p className="mt-5 text-xs leading-5 text-[#7f89ae]">Maximum {stats.maxMonthsPerYear} free months yearly. Self-referrals and duplicate accounts are excluded.</p></section>
      </div>
    </main>
  );
}
