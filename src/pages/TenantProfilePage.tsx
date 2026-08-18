import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, BadgeCheck, Bell, CalendarDays, Check, ChevronRight, CircleDollarSign,
  Clock3, Copy, FileCheck2, FileText, Home, Link2, Loader2, MessageCircle,
  MoreHorizontal, Phone, QrCode, ReceiptText, Send, ShieldCheck, UserRound, ContactRound,
  User, Calendar, Users, Droplet, Contact, PhoneCall, IdCard, IndianRupee, CreditCard,
  UserCheck, CheckSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import { useTenantPayments } from "@/hooks/useTenantPayments";
import { useMonthContext } from "@/contexts/MonthContext";
import { PaymentReminderDialog } from "@/components/PaymentReminderDialog";
import {
  ActivityTimeline, OwnerSharePanel, ProfileStatusBadge, VerificationPanel,
  useOnboardingLink, useOnboardingProfile,
} from "@/features/tenant-onboarding";
import type { OnboardingProfile, OnboardingStatus } from "@/features/tenant-onboarding/types";

export type TenantProfileView = "details" | "actions" | "share" | "timeline" | "verify";

const views: Array<{ id: TenantProfileView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "details", label: "Details", icon: ContactRound },
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

function DetailRow({ label, value, sensitive = false, icon: Icon }: { label: string; value?: string | number | null; sensitive?: boolean; icon?: React.ComponentType<{ className?: string }> }) {
  const display = value === null || value === undefined || value === "" ? "Not provided" : String(value);
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border/70 py-3 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-violet-500" />}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={cn("max-w-[65%] break-words text-right text-sm font-semibold text-foreground", sensitive && "font-mono tracking-wide")}>{display}</span>
    </div>
  );
}

function DetailSection({
  title,
  icon: Icon,
  children,
  badgeColor = "violet",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  badgeColor?: "violet" | "indigo" | "emerald" | "amber" | "blue";
}) {
  const colorStyles = {
    violet: "bg-violet-500/10 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-500/20",
    indigo: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/20",
  }[badgeColor];

  const iconStyles = {
    violet: "bg-violet-600 text-white shadow-violet-500/30",
    indigo: "bg-indigo-600 text-white shadow-indigo-500/30",
    emerald: "bg-emerald-600 text-white shadow-emerald-500/30",
    amber: "bg-amber-600 text-white shadow-amber-500/30",
    blue: "bg-blue-600 text-white shadow-blue-500/30",
  }[badgeColor];

  return (
    <section className="border-b border-border py-4 last:border-0">
      <div className={cn("mb-3.5 flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-black shadow-sm", colorStyles)}>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg shadow-sm shrink-0", iconStyles)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="tracking-tight">{title}</span>
      </div>
      <div className="px-1">{children}</div>
    </section>
  );
}

export default function TenantProfilePage({ view = "details" }: { view?: TenantProfileView }) {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const isPreview = import.meta.env.DEV && tenantId === "preview";
  const { rooms, isLoading: roomsLoading } = useRooms();
  const { data: profile, isLoading: profileLoading } = useOnboardingProfile(isPreview ? null : tenantId || null);
  const { data: link } = useOnboardingLink(isPreview ? null : tenantId || null);
  const { payments } = useTenantPayments();
  const { selectedMonth, selectedYear } = useMonthContext();
  const [shareOpen, setShareOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const goToView = (nextView: TenantProfileView) => navigate(`/tenant-profile/${tenantId}/${nextView}`);
  const displayedProfile: Partial<OnboardingProfile> | null = isPreview ? {
    status: "verified",
    verification_status: "verified",
    full_name: "Aman Verma",
    alternate_phone: "9876543210",
    date_of_birth: "2001-08-12",
    gender: "male",
    blood_group: "B+",
    emergency_contact_name: "Ramesh Verma",
    emergency_contact_phone: "9876543211",
    id_proof_type: "aadhaar",
    id_proof_number: "123456789012",
    id_proof_url: "preview/aadhaar.png",
    rules_acknowledged: true,
    agreement_accepted: true,
    completed_at: "2026-08-08T12:00:00Z",
  } : profile;

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
    return <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6 text-center"><UserRound className="h-10 w-10 text-muted-foreground" /><div><h1 className="font-bold">Tenant not found</h1><p className="text-sm text-muted-foreground">This tenant may have been removed or moved.</p></div><Button onClick={() => navigate("/?tab=settings")}>Go back</Button></div>;
  }

  const { tenant, room } = info;
  const complete = ["profile_completed", "pending_verification", "verified"].includes(displayedProfile?.status || "");
  const verified = displayedProfile?.status === "verified" || displayedProfile?.verification_status === "verified";
  const phoneDigits = tenant.phone.replace(/\D/g, "");
  const currentView = views.find((item) => item.id === view)!;
  const tenantPayments = payments
    .filter((payment) => payment.tenantId === tenant.id)
    .sort((a, b) => b.year - a.year || b.month - a.month);
  const currentPayment = tenantPayments.find((payment) => payment.month === selectedMonth && payment.year === selectedYear);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (verified) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background/95 px-2 py-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <button onClick={() => navigate("/?tab=settings")} className="grid h-9 w-9 place-items-center rounded-xl bg-muted" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
            <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-black">Tenant Profile</h1><p className="text-[11px] text-muted-foreground">Verified tenant details and payments</p></div>
            <ProfileStatusBadge status="verified" showLabel={false} size="md" />
          </div>
        </header>
        <main className="mx-auto max-w-2xl space-y-3 px-2 py-3 pb-10">
          <section className="overflow-hidden rounded-[26px] bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-4 text-white shadow-lg">
            <div className="flex items-center gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-lg font-black ring-1 ring-white/20">{tenant.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-black">{tenant.name}</h2><p className="text-xs text-white/75">Room {room.roomNo} · {room.capacity} sharing</p><span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200"><BadgeCheck className="h-3.5 w-3.5" />Profile verified</span></div></div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-black/10 p-2 ring-1 ring-white/10">
              <div className="text-center"><span className="block text-[9px] font-bold uppercase text-white/60">Room</span><strong className="text-sm">R{room.roomNo}</strong></div>
              <div className="text-center"><span className="block text-[9px] font-bold uppercase text-white/60">Monthly rent</span><strong className="text-sm">₹{tenant.monthlyRent.toLocaleString("en-IN")}</strong></div>
              <div className="text-center"><span className="block text-[9px] font-bold uppercase text-white/60">This month</span><strong className="text-sm">{currentPayment?.paymentStatus || tenant.paymentStatus}</strong></div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <a href={`tel:${tenant.phone}`} className="rounded-xl bg-white/10 py-2.5 text-center text-[11px] font-bold"><Phone className="mx-auto mb-1 h-4 w-4" />Call</a>
              <button onClick={() => window.open(`https://wa.me/91${phoneDigits}`, "_blank", "noopener,noreferrer")} className="rounded-xl bg-white/10 py-2.5 text-[11px] font-bold"><MessageCircle className="mx-auto mb-1 h-4 w-4" />WhatsApp</button>
              <button onClick={() => setReminderOpen(true)} className="rounded-xl bg-white text-violet-700 py-2.5 text-[11px] font-black"><Bell className="mx-auto mb-1 h-4 w-4" />Reminder</button>
            </div>
          </section>

          <section className="rounded-2xl border bg-card px-3">
            <DetailSection title="Personal information" icon={UserRound} badgeColor="violet">
              <DetailRow icon={User} label="Full name" value={displayedProfile?.full_name || tenant.name} />
              <DetailRow icon={Phone} label="Phone number" value={displayedProfile?.alternate_phone || tenant.phone} />
              <DetailRow icon={Calendar} label="Date of birth" value={displayedProfile?.date_of_birth} />
              <DetailRow icon={Users} label="Gender" value={displayedProfile?.gender} />
              <DetailRow icon={Droplet} label="Blood group" value={displayedProfile?.blood_group} />
              <DetailRow icon={Contact} label="Emergency contact" value={displayedProfile?.emergency_contact_name} />
              <DetailRow icon={PhoneCall} label="Emergency phone" value={displayedProfile?.emergency_contact_phone} />
            </DetailSection>
            <DetailSection title="Identity and stay" icon={ShieldCheck} badgeColor="indigo">
              <DetailRow icon={IdCard} label="Aadhaar number" value={displayedProfile?.id_proof_number ? displayedProfile.id_proof_number.replace(/(\d{4})(?=\d)/g, "$1 ") : null} sensitive />
              <DetailRow icon={Home} label="Room" value={room.roomNo} />
              <DetailRow icon={CalendarDays} label="Move-in date" value={tenant.startDate} />
              <DetailRow icon={IndianRupee} label="Monthly rent" value={`₹${tenant.monthlyRent.toLocaleString("en-IN")}`} />
              <DetailRow icon={ShieldCheck} label="Security deposit" value={`₹${Number(tenant.securityDepositAmount ?? 0).toLocaleString("en-IN")}`} />
              <DetailRow icon={CreditCard} label="Deposit mode" value={tenant.securityDepositMode} />
            </DetailSection>
          </section>

          <section className="rounded-2xl border bg-card px-3">
            <div className="flex items-center justify-between border-b py-3"><div><h3 className="text-sm font-black">Monthly payment history</h3><p className="text-[10px] text-muted-foreground">All recorded tenant payments</p></div><ReceiptText className="h-5 w-5 text-violet-500" /></div>
            {tenantPayments.length ? <div className="divide-y divide-border/70">{tenantPayments.map((payment) => {
              const balance = Math.max(0, payment.amount - payment.amountPaid);
              return <div key={payment.id} className="flex items-center gap-3 py-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-muted"><CalendarDays className="h-4 w-4 text-violet-500" /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold">{monthNames[payment.month - 1]} {payment.year}</p><p className="text-[10px] text-muted-foreground">Paid ₹{payment.amountPaid.toLocaleString("en-IN")} of ₹{payment.amount.toLocaleString("en-IN")}</p></div><div className="text-right"><span className={cn("text-[10px] font-black", balance === 0 ? "text-emerald-500" : "text-amber-500")}>{balance === 0 ? "Paid" : `₹${balance.toLocaleString("en-IN")} due`}</span>{payment.paymentDate && <p className="text-[9px] text-muted-foreground">{payment.paymentDate}</p>}</div></div>;
            })}</div> : <div className="py-8 text-center"><CircleDollarSign className="mx-auto h-7 w-7 text-muted-foreground/50" /><p className="mt-2 text-xs text-muted-foreground">No payment history recorded yet</p></div>}
          </section>
        </main>
        <PaymentReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} reminderData={{ tenantName: tenant.name, tenantPhone: tenant.phone, joiningDate: tenant.startDate, forMonth: `${monthNames[selectedMonth - 1]} ${selectedYear}`, roomNo: room.roomNo, sharingType: `${room.capacity} Sharing`, amount: currentPayment?.amount || tenant.monthlyRent, amountPaid: currentPayment?.amountPaid || 0, balance: Math.max(0, (currentPayment?.amount || tenant.monthlyRent) - (currentPayment?.amountPaid || 0)) }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-violet-500/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-2 py-3">
          <button onClick={() => navigate("/?tab=settings")} className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted hover:bg-muted/70" aria-label="Go back"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-bold">{tenant.name}</h1><p className="text-[11px] text-muted-foreground">Room {room.roomNo} · {room.capacity} sharing</p></div>
          <ProfileStatusBadge status={displayedProfile?.status} size="md" />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-2 pb-28 pt-4">
        <section className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-card to-muted/50 p-5 shadow-xl">
          <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-xl font-black shadow-lg shadow-violet-950/40">{tenant.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><h2 className="truncate text-xl font-bold">{tenant.name}</h2><p className="mt-1 text-sm text-muted-foreground">Room {room.roomNo} · Bed assigned</p><div className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", complete ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400")}><span className={cn("h-1.5 w-1.5 rounded-full", complete ? "bg-emerald-400" : "bg-amber-400")} />{statusLabel(displayedProfile?.status)}</div></div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-background/65 p-2.5 backdrop-blur">
            <div className="text-center"><span className="block text-[9px] font-bold uppercase text-muted-foreground">Room</span><strong className="text-sm">R{room.roomNo}</strong></div>
            <div className="text-center"><span className="block text-[9px] font-bold uppercase text-muted-foreground">Rent</span><strong className="text-sm">₹{tenant.monthlyRent.toLocaleString("en-IN")}</strong></div>
            <div className="text-center"><span className="block text-[9px] font-bold uppercase text-muted-foreground">Payment</span><strong className={cn("text-sm", currentPayment?.paymentStatus === "Paid" ? "text-emerald-600" : "text-amber-600")}>{currentPayment?.paymentStatus || tenant.paymentStatus}</strong></div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            <a href={`tel:${tenant.phone}`} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted py-3 text-xs font-semibold hover:bg-muted/70"><Phone className="h-4 w-4" />Call</a>
            <button onClick={() => window.open(`https://wa.me/91${phoneDigits}`, "_blank", "noopener,noreferrer")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-muted py-3 text-xs font-semibold hover:bg-muted/70"><MessageCircle className="h-4 w-4 text-emerald-500" />WhatsApp</button>
            <button onClick={() => goToView("share")} className="flex flex-col items-center gap-1.5 rounded-2xl bg-violet-500/15 py-3 text-xs font-semibold text-violet-600 hover:bg-violet-500/25 dark:text-violet-300"><Send className="h-4 w-4" />Invite</button>
          </div>
        </section>

        <AnimatePresence mode="wait">
          <motion.section key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="mt-4">


            {view === "details" && (
              <div className="rounded-2xl border border-border bg-card px-2">
                <DetailSection title="Personal information" icon={UserRound} badgeColor="violet">
                  <DetailRow icon={User} label="Full name" value={displayedProfile?.full_name || tenant.name} />
                  <DetailRow icon={Phone} label="Phone number" value={displayedProfile?.alternate_phone || tenant.phone} />
                  <DetailRow icon={Calendar} label="Date of birth" value={displayedProfile?.date_of_birth} />
                  <DetailRow icon={Users} label="Gender" value={displayedProfile?.gender} />
                  <DetailRow icon={Droplet} label="Blood group" value={displayedProfile?.blood_group} />
                  <DetailRow icon={Contact} label="Emergency contact" value={displayedProfile?.emergency_contact_name} />
                  <DetailRow icon={PhoneCall} label="Emergency phone" value={displayedProfile?.emergency_contact_phone} />
                </DetailSection>
                <DetailSection title="Identity verification" icon={ShieldCheck} badgeColor="indigo">
                  <DetailRow icon={FileText} label="Document" value={displayedProfile?.id_proof_type === "aadhaar" ? "Aadhaar card" : displayedProfile?.id_proof_type} />
                  <DetailRow icon={IdCard} label="Aadhaar number" value={displayedProfile?.id_proof_number ? displayedProfile.id_proof_number.replace(/(\d{4})(?=\d)/g, "$1 ") : null} sensitive />
                  <DetailRow icon={BadgeCheck} label="Submission status" value={statusLabel(displayedProfile?.status)} />
                </DetailSection>
                <DetailSection title="Stay and rent" icon={Home} badgeColor="emerald">
                  <DetailRow icon={Home} label="Room" value={room.roomNo} />
                  <DetailRow icon={CalendarDays} label="Move-in date" value={tenant.startDate} />
                  <DetailRow icon={IndianRupee} label="Monthly rent" value={`₹${tenant.monthlyRent.toLocaleString("en-IN")}`} />
                  <DetailRow icon={ShieldCheck} label="Security deposit" value={`₹${Number(tenant.securityDepositAmount ?? 0).toLocaleString("en-IN")}`} />
                  <DetailRow icon={CreditCard} label="Deposit mode" value={tenant.securityDepositMode} />
                  <DetailRow icon={UserCheck} label="Collected by" value={tenant.securityDepositCollectedBy} />
                </DetailSection>
                <DetailSection title="Agreement" icon={FileCheck2} badgeColor="blue">
                  <DetailRow icon={CheckSquare} label="PG rules acknowledged" value={displayedProfile?.rules_acknowledged ? "Yes" : "No"} />
                  <DetailRow icon={FileCheck2} label="Rental agreement accepted" value={displayedProfile?.agreement_accepted ? "Yes" : "No"} />
                  <DetailRow icon={Clock3} label="Submitted at" value={displayedProfile?.completed_at ? new Date(displayedProfile.completed_at).toLocaleString("en-IN") : null} />
                </DetailSection>
                {complete && <Button onClick={() => goToView("verify")} className="mb-4 w-full bg-violet-600 text-white hover:bg-violet-700"><ShieldCheck className="mr-2 h-4 w-4" />Review Aadhaar and verify</Button>}
              </div>
            )}

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
                <VerificationPanel tenantId={tenantId} verificationStatus={displayedProfile?.verification_status || "pending"} idProofUrl={displayedProfile?.id_proof_url} />
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"><div className="mx-auto grid max-w-lg grid-cols-5 gap-1">{views.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => goToView(id)} className={cn("flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold", view === id ? "bg-violet-500/15 text-violet-600 dark:text-violet-300" : "text-muted-foreground")}><Icon className="h-4 w-4" />{label}</button>)}</div></nav>

      <OwnerSharePanel tenantId={tenant.id} tenantName={tenant.name} tenantPhone={tenant.phone} open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
