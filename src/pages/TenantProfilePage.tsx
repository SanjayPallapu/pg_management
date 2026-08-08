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

export type TenantProfileView = "actions" | "share" | "timeline" | "verify";

const views: Array<{ id: TenantProfileView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
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
      "group flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left last:border-0 transition-colors",
      accent ? "text-violet-600 hover:bg-violet-500/10 dark:text-violet-300" : "text-foreground hover:bg-muted/50",
    )}>
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", accent ? "bg-violet-500/15" : "bg-muted")}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export default function TenantProfilePage({ view = "actions" }: { view?: TenantProfileView }) {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const isPreview = import.meta.env.DEV && tenantId === "preview";
  const { rooms, isLoading: roomsLoading } = useRooms();
  const { data: profile, isLoading: profileLoading } = useOnboardingProfile(isPreview ? null : tenantId || null);
  const { data: link } = useOnboardingLink(isPreview ? null : tenantId || null);
  const [shareOpen, setShareOpen] = useState(false);
  const goToView = (nextView: TenantProfileView) => navigate(`/tenant-profile/${tenantId}/${nextView}`);

  const info = useMemo(() => {
    if (isPreview) {
      const tenant = { id: "preview", name: "Aman Verma", phone: "9876543210", startDate: "2026-08-05", monthlyRent: 6000, paymentStatus: "Pending" as const, securityDepositAmount: 6000 };
      return { tenant, room: { id: "preview-room", roomNo: "205", status: "Occupied" as const, capacity: 2, tenants: [tenant], rentAmount: 12000, floor: 2 } };
    }
    for (const room of rooms) {
      const tenant = room.tenants.find((item) => item.id === tenantId);
      if (tenant) return { tenant, room };
    }
    return null;
  }, [isPreview, rooms, tenantId]);

  if ((!isPreview && roomsLoading) || profileLoading) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-violet-500" /></div>;
  }

  if (!info || !tenantId) {
    return <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6 text-center"><UserRound className="h-10 w-10 text-muted-foreground" /><div><h1 className="font-bold">Tenant not found</h1><p className="text-sm text-muted-foreground">This tenant may have been removed or moved.</p></div><Button onClick={() => navigate(-1)}>Go back</Button></div>;
  }

  const { tenant, room } = info;
  const complete = ["profile_completed", "pending_verification", "verified"].includes(profile?.status || "");
  const phoneDigits = tenant.phone.replace(/\D/g, "");
  const currentView = views.find((item) => item.id === view)!;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-violet-500/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted hover:bg-muted/70" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-bold">{tenant.name}</h1><p className="text-[11px] text-muted-foreground">Room {room.roomNo} · {room.capacity} sharing</p></div>
          <ProfileStatusBadge status={profile?.status} size="md" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">
        <section className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-card to-muted/50 p-5 shadow-xl">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-black shadow-lg shadow-violet-950/40">{tenant.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><h2 className="truncate text-xl font-bold">{tenant.name}</h2><p className="mt-1 text-sm text-muted-foreground">Room {room.roomNo} · Bed assigned</p><div className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", complete ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}><span className={cn("h-1.5 w-1.5 rounded-full", complete ? "bg-emerald-400" : "bg-amber-400")} />{statusLabel(profile?.status)}</div></div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <a href={`tel:${tenant.phone}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted py-3 text-xs font-semibold hover:bg-muted/70"><Phone className="h-4 w-4" />Call</a>
            <button onClick={() => window.open(`https://wa.me/91${phoneDigits}`, "_blank", "noopener,noreferrer")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted py-3 text-xs font-semibold hover:bg-muted/70"><MessageCircle className="h-4 w-4 text-emerald-500" />WhatsApp</button>
            <button onClick={() => goToView("share")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-violet-500/15 py-3 text-xs font-semibold text-violet-600 hover:bg-violet-500/25 dark:text-violet-300"><Send className="h-4 w-4" />Invite</button>
          </div>
        </section>

        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {views.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => goToView(id)} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all", view === id ? "bg-violet-600 text-white shadow-lg shadow-violet-950/20" : "bg-muted text-muted-foreground hover:bg-muted/70")}><Icon className="h-3.5 w-3.5" />{label}</button>)}
        </div>

        <AnimatePresence mode="wait">
          <motion.section key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-4">
            <div className="mb-2 flex items-center justify-between px-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Tenant onboarding</p><h3 className="mt-0.5 text-lg font-bold">{currentView.label}</h3></div>{link && <span className="text-[10px] text-muted-foreground">Link active</span>}</div>

            {view === "actions" && <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <ActionRow icon={Bell} title="Send payment reminder" hint="Notify tenant about pending rent" onClick={() => window.open(`https://wa.me/91${phoneDigits}`, "_blank", "noopener,noreferrer")} />
              <ActionRow icon={ReceiptText} title="View payments" hint={`Monthly rent ₹${tenant.monthlyRent.toLocaleString("en-IN")}`} onClick={() => navigate(-1)} />
              <ActionRow icon={complete ? FileCheck2 : FileText} title={complete ? "Review completed profile" : "Complete tenant profile"} hint={complete ? "Documents ready for owner review" : "Generate and share a secure invite"} accent onClick={() => goToView(complete ? "verify" : "share")} />
              <ActionRow icon={Clock3} title="View onboarding timeline" hint="See link and form activity" onClick={() => goToView("timeline")} />
            </div>}

            {view === "share" && <div className="space-y-3">
              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-transparent p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20"><Link2 className="h-5 w-5 text-violet-500" /></div><div><h4 className="text-sm font-bold">Share onboarding link</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">The tenant can securely complete their profile without signing in. Stay details remain locked.</p></div></div></div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <ActionRow icon={MessageCircle} title="Share via WhatsApp" onClick={() => setShareOpen(true)} />
                <ActionRow icon={Phone} title="Share via SMS" onClick={() => setShareOpen(true)} />
                <ActionRow icon={Copy} title="Copy secure link" onClick={() => setShareOpen(true)} />
                <ActionRow icon={QrCode} title="Show QR code" onClick={() => setShareOpen(true)} />
              </div>
              <div className="grid grid-cols-5 gap-1 rounded-2xl border border-border bg-card p-4">{[
                ["Sent", !!link], ["Viewed", !!link?.viewed_at], ["Started", !!link?.started_at], ["Submitted", !!link?.submitted_at], ["Complete", !!link?.completed_at],
              ].map(([label, done], index) => <div key={String(label)} className="relative text-center"><div className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-full border", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-muted-foreground")}>{done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px]">{index + 1}</span>}</div><p className="mt-1.5 text-[9px] text-muted-foreground">{String(label)}</p></div>)}</div>
            </div>}

            {view === "timeline" && <div className="rounded-2xl border border-border bg-card p-4"><ActivityTimeline tenantId={tenantId} /></div>}
            {view === "verify" && <div className="rounded-2xl border border-border bg-card p-4">
              {complete ? (
                <VerificationPanel tenantId={tenantId} verificationStatus={profile?.verification_status || "pending"} />
              ) : (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500"><ShieldCheck className="h-7 w-7" /></span>
                  <h4 className="mt-4 font-bold">Verification not ready</h4>
                  <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">The tenant has not submitted their profile and Aadhaar yet. Share the onboarding link first.</p>
                  <Button onClick={() => goToView("share")} className="mt-5 bg-violet-600 text-white hover:bg-violet-700"><Send className="mr-2 h-4 w-4" />Open share page</Button>
                </div>
              )}
            </div>}
          </motion.section>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"><div className="mx-auto grid max-w-lg grid-cols-4 gap-1">{views.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => goToView(id)} className={cn("flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold", view === id ? "bg-violet-500/15 text-violet-600 dark:text-violet-300" : "text-muted-foreground")}><Icon className="h-4 w-4" />{label}</button>)}</div></nav>

      <OwnerSharePanel tenantId={tenant.id} tenantName={tenant.name} tenantPhone={tenant.phone} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
