import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Share2,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UserPlus,
  WalletCards,
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
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white shadow-sm"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight">Refer & Earn</h1>
            <p className="text-xs font-medium text-slate-500">Share PG HUB and earn subscription rewards</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-4 pb-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-blue-600 p-5 text-white shadow-xl shadow-indigo-950/15">
          <Sparkles className="absolute -right-4 -top-5 h-28 w-28 text-white/10" />
          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em]">
              <Gift className="h-3.5 w-3.5" /> PG HUB Rewards
            </span>
            <h2 className="mt-4 text-2xl font-black leading-tight">Give 30% off.<br />Get one month free.</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-indigo-100">
              Your friend saves on their first paid month. Your free month unlocks after their first successful subscription payment.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-r border-slate-200 p-3 text-center">
            <strong className="block text-xl font-black">{stats.totalInvited}</strong>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Invited</span>
          </div>
          <div className="border-r border-slate-200 p-3 text-center">
            <strong className="block text-xl font-black text-emerald-600">{stats.activePaidReferrals}</strong>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Subscribed</span>
          </div>
          <div className="p-3 text-center">
            <strong className="block text-xl font-black text-violet-700">{stats.freeMonthsEarned}</strong>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Free months</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-black">Your referral code</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">Use the share button to open your device’s sharing options.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-center font-mono text-sm font-black tracking-wider text-violet-800">
              {stats.referralCode}
            </div>
            <Button type="button" variant="outline" size="icon" onClick={copyCode} className="h-11 w-11 shrink-0 rounded-xl" aria-label="Copy referral code">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <Button
            type="button"
            onClick={shareInvite}
            disabled={sharing}
            className="mt-3 h-12 w-full gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-blue-600 text-sm font-black text-white shadow-md"
          >
            <Share2 className="h-4 w-4" /> {sharing ? "Opening share options…" : "Share invite"}
          </Button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black">How rewards work</h2>
          <div className="mt-4 space-y-4">
            <RewardStep icon={<Share2 className="h-4 w-4" />} number="1" title="Share your invitation" description="Choose WhatsApp, Messages, email, or another app from the share sheet." />
            <RewardStep icon={<UserPlus className="h-4 w-4" />} number="2" title="Your friend joins" description="They create their PG HUB account using your referral link or code." />
            <RewardStep icon={<WalletCards className="h-4 w-4" />} number="3" title="Both receive rewards" description="Their discount and your free month activate after the first successful paid subscription." />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><TicketCheck className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-black">Have a referral code?</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">Apply it before your first paid subscription.</p>
            </div>
          </div>
          {appliedCode ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800">
              <Check className="h-4 w-4" /> Applied: <span className="font-mono">{appliedCode}</span>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Input
                value={inputCode}
                onChange={(event) => setInputCode(event.target.value.toUpperCase())}
                placeholder="PGHUB-OWNER1234"
                autoCapitalize="characters"
                className="h-11 rounded-xl font-mono text-xs"
              />
              <Button type="button" onClick={applyCode} disabled={!inputCode.trim()} className="h-11 rounded-xl px-5 font-bold">Apply</Button>
            </div>
          )}
        </section>

        <p className="flex items-start justify-center gap-1.5 px-4 text-center text-[11px] font-medium leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
          Maximum {stats.maxMonthsPerYear} free months per year. Self-referrals and duplicate accounts are not eligible.
        </p>
      </div>
    </main>
  );
}

function RewardStep({ icon, number, title, description }: {
  icon: ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
        {icon}
        <small className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-violet-700 text-[9px] font-black text-white">{number}</small>
      </span>
      <div>
        <strong className="block text-sm font-bold">{title}</strong>
        <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}
