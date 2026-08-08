import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Bell, CalendarDays, Check, ChevronRight, CircleDollarSign,
  Clock3, Copy, FileCheck2, FileText, Home, Link2, Loader2, MessageCircle,
  MoreHorizontal, Phone, QrCode, ReceiptText, Send, ShieldCheck, UserRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import {
  ActivityTimeline, OwnerSharePanel, ProfileStatusBadge, VerificationPanel,
  useOnboardingLink, useOnboardingProfile,
} from "@/features/tenant-onboarding";
import type { OnboardingStatus } from "@/features/tenant-onboarding/types";

type View = "actions" | "share" | "timeline" | "verify";

const views: Array<{ id: View; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "actions", label: "Actions", icon: MoreHorizontal },
  { id: "share", label: "Share", icon: Link2 },
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "verify", label: "Verify", icon: ShieldCheck },
];

function statusLabel(status?: OnboardingStatus) {
  if (!status || status === "not_started") return "Profile incomplete";
  if (status === "verified") return "Profile verified";
  if (["profile_completed", "pending_verification", "form_submitted"].includes(status)) return "Pending verification";
  if (status === "rejected") return "Changes requested";
  return status.replaceAll("_", " ");
}

function ActionRow({ icon: Icon, title, hint, onClick, accent = false }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button onClick={onClick} className={cn(
      "group flex w-full items-center gap-3 border-b border-white/5 px-4 py-3.5 text-left last:border-0 transition-colors",
      accent ? "text-violet-300 hover:bg-violet-500/10" : "text-slate-100 hover:bg-white/5",
    )}>
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent ? "bg-violet-500/15" : "bg-white/5")}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export default function TenantProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { rooms, isLoading: roomsLoading } = useRooms();
  const { data: profile, isLoading: profileLoading } = useOnboardingProfile(tenantId || null);
  const { data: link } = useOnboardingLink(tenantId || null);
  const [view, setView] = useState<View>("actions");
  const [shareOpen, setShareOpen] = useState(false);

  const info = useMemo(() => {
    for (const room of rooms) {
      const tenant = room.tenants.find((item) => item.id === tenantId);
      if (tenant) return { tenant, room };
    }
    return null;
  }, [rooms, tenantId]);

  if (roomsLoading || profileLoading) {
    return <div className="min-h-screen bg-[#090d16] text-white flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-violet-400" /></div>;
  }

  if (!info || !tenantId) {
    return <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center gap-4 p-6 text-center"><UserRound className="h-10 w-10 text-slate-500" /><div><h1 className="font-bold">Tenant not found</h1><p className="text-sm text-slate-500">This tenant may have been removed or moved.</p></div><Button onClick={() => navigate(-1)}>Go back</Button></div>;
  }

  const { tenant, room } = info;
  const complete = ["profile_completed", "pending_verification", "verified"].includes(profile?.status || "");
  const phoneDigits = tenant.phone.replace(/\D/g, "");
  const currentView = views.find((item) => item.id === view)!;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-violet-500/30">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#090d16]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-bold">{tenant.name}</h1><p className="text-[11px] text-slate-500">Room {room.roomNo} · {room.capacity} sharing</p></div>
          <ProfileStatusBadge status={profile?.status} size="md" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">
        <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#161c29] to-[#10151f] p-5 shadow-2xl shadow-black/20">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-black shadow-lg shadow-violet-950/40">{tenant.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><h2 className="truncate text-xl font-bold">{tenant.name}</h2><p className="mt-1 text-sm text-slate-400">Room {room.roomNo} · Bed assigned</p><div className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", complete ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-700/70 text-slate-300")}><span className={cn("h-1.5 w-1.5 rounded-full", complete ? "bg-emerald-400" : "bg-amber-400")} />{statusLabel(profile?.status)}</div></div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <a href={`tel:${tenant.phone}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/5 py-3 text-xs font-semibold hover:bg-white/10"><Phone className="h-4 w-4" />Call</a>
            <button onClick={() => window.open(`https://wa.me/91${phoneDigits}`, "_blank", "noopener,noreferrer")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/5 py-3 text-xs font-semibold hover:bg-white/10"><MessageCircle className="h-4 w-4 text-emerald-400" />WhatsApp</button>
            <button onClick={() => setView("share")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-violet-500/15 py-3 text-xs font-semibold text-violet-300 hover:bg-violet-500/25"><Send className="h-4 w-4" />Invite</button>
          </div>
        </section>

        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {views.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all", view === id ? "bg-violet-600 text-white shadow-lg shadow-violet-950/40" : "bg-white/5 text-slate-400 hover:bg-white/10")}><Icon className="h-3.5 w-3.5" />{label}</button>)}
        </div>

        <AnimatePresence mode="wait">
          <motion.section key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-4">
            <div className="mb-2 flex items-center justify-between px-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-400">Tenant onboarding</p><h3 className="mt-0.5 text-lg font-bold">{currentView.label}</h3></div>{link && <span className="text-[10px] text-slate-500">Link active</span>}</div>

            {view === "actions" && <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121824]">
              <ActionRow icon={Bell} title="Send payment reminder" hint="Notify tenant about pending rent" onClick={() => window.open(`https://wa.me/91${phoneDigits}`, "_blank", "noopener,noreferrer")} />
              <ActionRow icon={ReceiptText} title="View payments" hint={`Monthly rent ₹${tenant.monthlyRent.toLocaleString("en-IN")}`} onClick={() => navigate(-1)} />
              <ActionRow icon={complete ? FileCheck2 : FileText} title={complete ? "Review completed profile" : "Complete tenant profile"} hint={complete ? "Documents ready for owner review" : "Generate and share a secure invite"} accent onClick={() => setView(complete ? "verify" : "share")} />
              <ActionRow icon={Clock3} title="View onboarding timeline" hint="See link and form activity" onClick={() => setView("timeline")} />
            </div>}

            {view === "share" && <div className="space-y-3">
              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20"><Link2 className="h-5 w-5 text-violet-300" /></div><div><h4 className="text-sm font-bold">Share onboarding link</h4><p className="mt-1 text-xs leading-relaxed text-slate-400">The tenant can securely complete their profile without signing in. Stay details remain locked.</p></div></div></div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121824]">
                <ActionRow icon={MessageCircle} title="Share via WhatsApp" onClick={() => setShareOpen(true)} />
                <ActionRow icon={Phone} title="Share via SMS" onClick={() => setShareOpen(true)} />
                <ActionRow icon={Copy} title="Copy secure link" onClick={() => setShareOpen(true)} />
                <ActionRow icon={QrCode} title="Show QR code" onClick={() => setShareOpen(true)} />
              </div>
              <div className="grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-[#121824] p-4">{[
                ["Sent", !!link], ["Viewed", !!link?.viewed_at], ["Started", !!link?.started_at], ["Submitted", !!link?.submitted_at], ["Complete", !!link?.completed_at],
              ].map(([label, done], index) => <div key={String(label)} className="relative text-center"><div className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-full border", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-700 text-slate-600")}>{done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px]">{index + 1}</span>}</div><p className="mt-1.5 text-[9px] text-slate-500">{String(label)}</p></div>)}</div>
            </div>}

            {view === "timeline" && <div className="rounded-2xl border border-white/10 bg-[#121824] p-4"><ActivityTimeline tenantId={tenantId} /></div>}
            {view === "verify" && <div className="rounded-2xl border border-white/10 bg-[#121824] p-4"><VerificationPanel tenantId={tenantId} verificationStatus={profile?.verification_status || "pending"} /></div>}
          </motion.section>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#0c111b]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"><div className="mx-auto grid max-w-lg grid-cols-4 gap-1">{views.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setView(id)} className={cn("flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold", view === id ? "bg-violet-500/15 text-violet-300" : "text-slate-600")}><Icon className="h-4 w-4" />{label}</button>)}</div></nav>

      <OwnerSharePanel tenantId={tenant.id} tenantName={tenant.name} tenantPhone={tenant.phone} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
