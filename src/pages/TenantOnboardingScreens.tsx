import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  FileCheck2,
  FileText,
  Home,
  Link2,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Phone,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UserRoundCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import {
  useMarkNotificationRead,
  useOnboardingLink,
  useOnboardingNotifications,
  useOnboardingProfile,
  useOnboardingProfileMap,
} from "@/features/tenant-onboarding/hooks/useOnboarding";
import { CompleteTenantProfileDialog } from "@/features/tenant-onboarding/components/CompleteTenantProfileDialog";
import { OwnerSharePanel } from "@/features/tenant-onboarding/components/OwnerSharePanel";
import { VerificationPanel } from "@/features/tenant-onboarding/components/VerificationPanel";
import { ActivityTimeline } from "@/features/tenant-onboarding/components/ActivityTimeline";
import type { OnboardingFormStep, OnboardingStatus } from "@/features/tenant-onboarding/types";
import { ONBOARDING_FORM_STEPS } from "@/features/tenant-onboarding/types";

const ownerScreens = [
  { id: 2, label: "Tenant actions", icon: MoreHorizontal },
  { id: 3, label: "Share link", icon: Send },
  { id: 4, label: "QR code", icon: QrCode },
  { id: 5, label: "Timeline", icon: ClipboardCheck },
  { id: 6, label: "Verification", icon: ShieldCheck },
  { id: 15, label: "Notifications", icon: Bell },
  { id: 16, label: "Status badge", icon: UserRoundCheck },
];

const publicFlowSteps = [0, 1, 2, 4, 5, 7].map((index) => ONBOARDING_FORM_STEPS[index]);

const publicScreens = [
  { id: 7, label: "Welcome", icon: Sparkles },
  ...publicFlowSteps.map((step, index) => ({ id: 8 + index, label: step.title, icon: stepIcon(index) })),
  { id: 14, label: "Success", icon: CheckCircle2 },
];

function stepIcon(index: number) {
  return [User, ShieldCheck, Phone, BriefcaseIcon, Home, CreditCardIcon, FileText, ClipboardCheck][index] || FileText;
}

function BriefcaseIcon(props: { className?: string }) {
  return <FileText {...props} />;
}
function CreditCardIcon(props: { className?: string }) {
  return <FileText {...props} />;
}

type ScreenId = number;

export default function TenantOnboardingScreens() {
  const navigate = useNavigate();
  const { rooms, isLoading } = useRooms();
  const profileMap = useOnboardingProfileMap();
  const { data: notifications = [] } = useOnboardingNotifications();
  const markRead = useMarkNotificationRead();
  const tenants = useMemo(() => rooms.flatMap((room) => room.tenants.map((tenant) => ({ ...tenant, roomNo: room.roomNo }))), [rooms]);
  const tenant = tenants[0];
  const [screen, setScreen] = useState<ScreenId>(2);
  const [shareOpen, setShareOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [publicStep, setPublicStep] = useState(0);
  const profile = tenant ? profileMap.get(tenant.id) : undefined;
  const { data: link } = useOnboardingLink(tenant?.id || null);

  const selectedOwnerScreen = ownerScreens.find((item) => item.id === screen);
  const selectedPublicScreen = publicScreens.find((item) => item.id === screen);
  const displayName = tenant?.name || "Aman Verma";
  const roomLabel = tenant ? `Room ${tenant.roomNo} · Bed 1` : "Room 205 · Bed 1";
  const onboardingUrl = link ? `${window.location.origin}/tenant-onboarding/${link.token}` : "";

  const openLiveForm = () => {
    if (link) navigate(`/tenant-onboarding/${link.token}`);
  };

  return (
    <main className="min-h-screen bg-[#f7f7fb] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-700"><Sparkles className="h-4 w-4" /> PGHub onboarding flow</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Tenant onboarding screens</h1>
            <p className="mt-1 text-sm text-slate-500">Screens 2–16 are implemented here; screen 1 remains in the existing dashboard.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full md:w-auto">Back to dashboard</Button>
        </header>

        <div className="flex flex-col gap-6 xl:flex-row">
          <aside className="w-full shrink-0 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm xl:w-72">
            <div className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Owner screens</div>
            <ScreenNav items={ownerScreens} active={screen} onSelect={setScreen} />
            <div className="mt-5 px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Public flow</div>
            <ScreenNav items={publicScreens} active={screen} onSelect={(id) => { setScreen(id); setPublicStep(Math.max(0, id - 8)); }} />
          </aside>

          <section className="flex min-h-[780px] flex-1 items-start justify-center rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-sm md:p-10">
            <div className="w-full max-w-[410px]">
              <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <span>{selectedOwnerScreen?.label || selectedPublicScreen?.label}</span>
                <span>Screen {screen} / 16</span>
              </div>
              {screen <= 6 || screen >= 15 ? (
                <OwnerPhoneScreen screen={screen} tenant={tenant} displayName={displayName} roomLabel={roomLabel} profile={profile} profileMap={profileMap} link={link} onboardingUrl={onboardingUrl} isLoading={isLoading} notifications={notifications} onShare={() => setShareOpen(true)} onProfile={() => setProfileOpen(true)} onMarkRead={(id) => markRead.mutate(id)} />
              ) : (
                <PublicPhoneScreen screen={screen} publicStep={publicStep} setPublicStep={setPublicStep} onOpenLiveForm={openLiveForm} />
              )}
            </div>
          </section>
        </div>
      </div>

      {tenant && (
        <>
          <OwnerSharePanel tenantId={tenant.id} tenantName={tenant.name} tenantPhone={tenant.phone} open={shareOpen} onOpenChange={setShareOpen} />
          <CompleteTenantProfileDialog tenantId={tenant.id} tenantName={tenant.name} tenantPhone={tenant.phone} open={profileOpen} onOpenChange={setProfileOpen} />
        </>
      )}
    </main>
  );
}

function ScreenNav({ items, active, onSelect }: { items: { id: number; label: string; icon: React.ComponentType<{ className?: string }> }[]; active: number; onSelect: (id: number) => void }) {
  return <div className="space-y-1">{items.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => onSelect(item.id)} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition", active === item.id ? "bg-violet-100 font-semibold text-violet-800" : "text-slate-600 hover:bg-slate-50")}><span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white shadow-sm"><Icon className="h-4 w-4" /></span><span className="flex-1">{item.id}. {item.label}</span>{active === item.id && <ChevronRight className="h-4 w-4" />}</button>; })}</div>;
}

function PhoneShell({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={cn("overflow-hidden rounded-[34px] border-[7px] border-slate-800 shadow-2xl", light ? "bg-white" : "bg-[#0b111b]")}><div className={cn("flex items-center justify-between px-5 pt-3 text-[10px] font-semibold", light ? "text-slate-700" : "text-white")}><span>9:41</span><span>● ● ▰</span></div>{children}</div>;
}

function OwnerHeader({ title, displayName, roomLabel }: { title: string; displayName: string; roomLabel: string }) {
  return <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 text-white"><ArrowLeft className="h-5 w-5" /><div className="min-w-0"><div className="text-sm font-semibold">{title}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400 text-[9px] text-white">AV</span><span>{displayName}<br /><span className="text-slate-400">{roomLabel}</span></span></div></div></div>;
}

function OwnerPhoneScreen({ screen, tenant, displayName, roomLabel, profile, profileMap, link, onboardingUrl, isLoading, notifications, onShare, onProfile, onMarkRead }: any) {
  if (screen === 15) return <NotificationsScreen notifications={notifications} onMarkRead={onMarkRead} />;
  if (screen === 16) return <StatusBadgeScreen profileMap={profileMap} />;
  if (screen === 2) return <PhoneShell><OwnerHeader title="Complete Tenant Profile" displayName={displayName} roomLabel={roomLabel} /><div className="space-y-4 p-4 text-white"><StatusBadge status={profile?.status || "not_started"} /><div className="text-xs text-slate-400">Invite sent on 06 Apr 2025</div><div className="grid grid-cols-4 gap-2">{[[MessageCircle, "Chat"], [Phone, "Call"], [MessageCircle, "WhatsApp"], [MoreHorizontal, "More"]].map(([Icon, label]: any) => <button key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 p-3 text-[10px] text-slate-300"><Icon className="h-5 w-5" />{label}</button>)}</div><div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-2">{[[Bell, "Send Reminder"], [FileText, "Send Receipt"], [ClipboardCheck, "View Payments"], [UserRoundCheck, "Complete Tenant Profile"], [ClipboardCheck, "View Timeline"]].map(([Icon, label]: any, i) => <button key={label} onClick={i === 3 ? onProfile : i === 4 ? onProfile : undefined} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs hover:bg-white/10"><Icon className="h-4 w-4 text-slate-300" />{label}<ChevronRight className="ml-auto h-4 w-4 text-slate-500" /></button>)}</div><button className="w-full rounded-xl border border-red-500/40 bg-red-500/10 py-3 text-xs font-semibold text-red-300">Remove Tenant</button></div></PhoneShell>;
  if (screen === 3) return <PhoneShell><OwnerHeader title="Share Onboarding Link" displayName={displayName} roomLabel={roomLabel} /><div className="space-y-4 p-4 text-white"><h2 className="text-base font-semibold">Share Onboarding Link</h2><p className="text-xs text-slate-400">Secure link to complete profile</p><div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-2">{[[MessageCircle, "Share via WhatsApp"], [Phone, "Share via SMS"], [Copy, "Copy Link"], [QrCode, "Show QR Code"]].map(([Icon, label]: any, i) => <button key={label} onClick={i === 0 || i === 2 || i === 3 ? onShare : undefined} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs hover:bg-white/10"><Icon className="h-4 w-4 text-violet-300" />{label}<ChevronRight className="ml-auto h-4 w-4 text-slate-500" /></button>)}</div><CommunicationStatus link={link} /></div></PhoneShell>;
  if (screen === 4) return <PhoneShell><OwnerHeader title="Scan to Complete" displayName={displayName} roomLabel={roomLabel} /><div className="space-y-5 p-5 text-center text-white"><p className="text-sm">Scan this QR code to complete<br />your PG profile</p><div className="mx-auto flex h-52 w-52 items-center justify-center rounded-2xl bg-white"><div className="grid grid-cols-7 gap-1 p-4">{Array.from({ length: 49 }).map((_, i) => <span key={i} className={cn("h-4 w-4", (i * 7 + i) % 3 === 0 || i % 5 === 0 ? "bg-slate-950" : "bg-white")} />)}</div></div><div className="rounded-xl bg-violet-500/20 px-3 py-2 text-[10px] text-violet-200">{onboardingUrl || "Generate a link to create QR"}</div><p className="text-xs text-slate-400">Link expires in 29 days</p><div className="flex gap-2"><Button onClick={onShare} className="flex-1 bg-violet-600 text-xs hover:bg-violet-500">Share QR</Button><Button onClick={onShare} variant="secondary" className="flex-1 text-xs">Copy Link</Button></div></div></PhoneShell>;
  if (screen === 5) return <PhoneShell><OwnerHeader title="Onboarding Timeline" displayName={displayName} roomLabel={roomLabel} /><div className="p-5 text-white"><ActivityTimeline tenantId={tenant?.id || ""} /></div></PhoneShell>;
  return <PhoneShell><OwnerHeader title="Verify Documents" displayName={displayName} roomLabel={roomLabel} /><div className="space-y-4 p-4 text-white"><div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-3 text-xs font-semibold">Documents</div>{["Aadhaar Card", "Passport Photo", "College ID"].map((item) => <div key={item} className="flex items-center gap-3 border-t border-white/10 py-3 text-xs"><FileText className="h-5 w-5 text-slate-300" /><span className="flex-1">{item}<br /><span className="text-[10px] text-slate-500">IMG_20250406_1201.jpg</span></span><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div>)}</div><VerificationPanel tenantId={tenant?.id || ""} verificationStatus={profile?.verification_status || "pending"} /></div></PhoneShell>;
}

function StatusBadge({ status }: { status: OnboardingStatus }) { return <Badge className={cn("w-fit border-0 text-[10px]", status === "verified" || status === "profile_completed" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-300")}>{status === "not_started" ? "Profile Incomplete" : status.replaceAll("_", " ")}</Badge>; }

function CommunicationStatus({ link }: { link: any }) { const items = ["Link Sent", "Link Viewed", "Form Started", "Form Submitted", "Profile Completed"]; const current = link ? Math.max(0, ["sent", "viewed", "started", "submitted", "completed"].indexOf(link.status)) : -1; return <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><div className="mb-3 text-xs font-semibold">Communication Status</div>{items.map((item, index) => <div key={item} className="flex items-center gap-3 border-t border-white/10 py-2 text-[10px]"><span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", index <= current ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-600 text-transparent")}><Check className="h-3 w-3" /></span><span className={index <= current ? "text-white" : "text-slate-400"}>{item}</span><span className="ml-auto text-slate-500">{index <= current ? "06 Apr 2025" : "Pending"}</span></div>)}</div>; }

function NotificationsScreen({ notifications, onMarkRead }: { notifications: any[]; onMarkRead: (id: string) => void }) { const rows = notifications.length ? notifications.slice(0, 5) : [{ id: "empty-1", title: "Aman Verma viewed the onboarding link", message: "Just now", is_read: false }, { id: "empty-2", title: "Aman Verma completed profile", message: "20 min ago", is_read: false }, { id: "empty-3", title: "Verification pending for Aman Verma", message: "25 min ago", is_read: false }]; return <PhoneShell><div className="flex items-center justify-between border-b border-white/10 px-5 py-5 text-white"><span className="text-sm font-semibold">Notifications</span><Bell className="h-4 w-4" /></div><div className="space-y-2 p-4 text-white">{rows.map((item, i) => <button key={item.id} onClick={() => item.id.startsWith("empty") ? undefined : onMarkRead(item.id)} className="flex w-full items-start gap-3 rounded-2xl bg-white/5 p-3 text-left"><span className={cn("mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg", i === 0 ? "bg-violet-500" : i === 1 ? "bg-emerald-500" : "bg-amber-500")}><Bell className="h-3 w-3" /></span><span className="flex-1 text-xs"><span className="font-semibold">{item.title}</span><br /><span className="text-[10px] text-slate-400">{item.message || "Recently"}</span></span>{!item.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />}</button>)}</div></PhoneShell>; }

function StatusBadgeScreen({ profileMap }: { profileMap: Map<string, any> }) { return <PhoneShell><div className="bg-gradient-to-br from-violet-700 to-indigo-700 px-5 py-7 text-white"><div className="text-sm font-semibold">Profile Complete Badge</div><p className="mt-1 text-xs text-violet-200">Visible everywhere</p></div><div className="space-y-3 p-4 text-white">{Array.from(profileMap.values()).slice(0, 2).map((profile) => <div key={profile.id} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-300 text-xs text-slate-700">AV</span><span className="flex-1 text-xs"><b>{profile.full_name || "Tenant"}</b><br /><span className="text-slate-400">Room 205 · Bed 2</span></span><StatusBadge status={profile.status} /></div>)}{profileMap.size === 0 && <div className="rounded-2xl bg-white/10 p-4 text-xs text-slate-300">Complete a tenant profile to show the live badge here.</div>}</div></PhoneShell>; }

function PublicPhoneScreen({ screen, publicStep, setPublicStep, onOpenLiveForm }: { screen: number; publicStep: number; setPublicStep: (step: number) => void; onOpenLiveForm: () => void }) { const welcome = screen === 7; const success = screen === 14; const step: OnboardingFormStep | undefined = publicFlowSteps[publicStep]; const total = publicFlowSteps.length; if (welcome) return <PhoneShell light><div className="flex min-h-[650px] flex-col items-center justify-center gap-5 p-6 text-center"><div className="text-sm font-bold text-slate-900"><span className="text-violet-600">●</span> PGHub</div><div className="flex h-48 w-48 items-center justify-center rounded-full bg-violet-100"><Home className="h-28 w-28 text-violet-500" /></div><h2 className="text-xl font-bold">Welcome to PGHub</h2><p className="text-xs leading-5 text-slate-500">Complete your profile to<br />make your stay better</p><Button onClick={() => setPublicStep(0)} className="mt-5 w-full bg-violet-600 hover:bg-violet-500">Get Started</Button></div></PhoneShell>; if (success) return <PhoneShell light><div className="flex min-h-[650px] flex-col items-center justify-center gap-5 p-6 text-center"><div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-20 w-20 text-emerald-500" /></div><h2 className="text-xl font-bold">Profile Submitted!</h2><p className="text-xs leading-5 text-slate-500">Thank you! Your profile has been<br />submitted successfully.</p><p className="text-xs text-slate-500">We will review your documents<br />and notify you soon.</p><Button onClick={onOpenLiveForm} className="mt-5 w-full bg-violet-600 hover:bg-violet-500">Done</Button></div></PhoneShell>; return <PhoneShell light><div className="flex min-h-[650px] flex-col"><div className="px-5 pt-5"><div className="mb-3 flex justify-between text-[9px] text-slate-400"><span>Step {publicStep + 1} of {total}</span><span>{Math.round(((publicStep + 1) / total) * 100)}%</span></div><div className="flex gap-1">{Array.from({ length: total }).map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= publicStep ? "bg-violet-600" : "bg-violet-100")} />)}</div></div><div className="flex-1 p-5"><div className="mb-1 text-[10px] text-slate-400">{step?.description}</div><h2 className="text-lg font-bold text-slate-900">{step?.title}</h2><p className="mt-1 text-xs text-slate-500">{step?.description}</p><div className="mt-7 space-y-4">{(step?.fields || ["full_name"]).slice(0, 4).map((field) => <label key={field} className="block text-[10px] font-semibold capitalize text-slate-700">{field.replaceAll("_", " ")}<div className="mt-1 rounded-xl border border-slate-200 px-3 py-3 text-xs text-slate-400">Enter {field.replaceAll("_", " ")}</div></label>)}</div></div><div className="p-5"><Button onClick={() => publicStep < total - 1 ? setPublicStep(publicStep + 1) : undefined} className="w-full bg-violet-600 hover:bg-violet-500">{publicStep === total - 1 ? "Continue" : "Continue"}<ArrowRight className="h-4 w-4" /></Button></div></div></PhoneShell>; }
