/**
 * TenantOnboardingScreens
 *
 * Each screen is now a full-screen route rather than a side-nav picker.
 * Route:  /tenant-onboarding/screens            → screen list (overview)
 * Route:  /tenant-onboarding/screens/:screenId  → individual full-screen demo
 */
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  MessageCircle,
  MoreHorizontal,
  Phone,
  QrCode,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UserRoundCheck,
  Users,
  X,
  LockKeyhole,
  ScanLine,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import {
  useMarkNotificationRead,
  useOnboardingLink,
  useOnboardingNotifications,
  useOnboardingProfileMap,
} from "@/features/tenant-onboarding/hooks/useOnboarding";
import { CompleteTenantProfileDialog } from "@/features/tenant-onboarding/components/CompleteTenantProfileDialog";
import { OwnerSharePanel } from "@/features/tenant-onboarding/components/OwnerSharePanel";
import { VerificationPanel } from "@/features/tenant-onboarding/components/VerificationPanel";
import { ActivityTimeline } from "@/features/tenant-onboarding/components/ActivityTimeline";
import type { OnboardingStatus } from "@/features/tenant-onboarding/types";
import { ONBOARDING_FORM_STEPS } from "@/features/tenant-onboarding/types";

// ------------------------------------------------------------------
// Screen registry
// ------------------------------------------------------------------

const ALL_SCREENS = [
  { id: 2,  label: "Tenant Actions",    icon: MoreHorizontal, group: "Owner" },
  { id: 3,  label: "Share Link",        icon: Send,           group: "Owner" },
  { id: 4,  label: "QR Code",           icon: QrCode,         group: "Owner" },
  { id: 5,  label: "Timeline",          icon: ClipboardCheck, group: "Owner" },
  { id: 6,  label: "Verification",      icon: ShieldCheck,    group: "Owner" },
  { id: 15, label: "Notifications",     icon: Bell,           group: "Owner" },
  { id: 16, label: "Status Badge",      icon: UserRoundCheck, group: "Owner" },
  { id: 7,  label: "Welcome",           icon: Sparkles,       group: "Public" },
  { id: 8,  label: "Personal Info",     icon: User,           group: "Public" },
  { id: 9,  label: "Identity",          icon: ShieldCheck,    group: "Public" },
  { id: 10, label: "Contact",           icon: Phone,          group: "Public" },
  { id: 11, label: "Occupation",        icon: FileText,       group: "Public" },
  { id: 12, label: "Stay Details",      icon: Home,           group: "Public" },
  { id: 13, label: "Payment",           icon: CreditCard,     group: "Public" },
  { id: 14, label: "Success",           icon: CheckCircle2,   group: "Public" },
];

const publicFlowSteps = [0, 1, 2, 3, 4, 5].map((index) => ONBOARDING_FORM_STEPS[index]);

// ------------------------------------------------------------------
// Overview (list) page
// ------------------------------------------------------------------

export default function TenantOnboardingScreens() {
  const navigate = useNavigate();

  const ownerScreens = ALL_SCREENS.filter((s) => s.group === "Owner");
  const publicScreens = ALL_SCREENS.filter((s) => s.group === "Public");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="font-bold text-base">Tenant Onboarding Screens</div>
            <div className="text-xs text-muted-foreground">Full-screen demos for each flow step</div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Owner screens */}
        <section>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Owner Screens
          </div>
          <div className="space-y-1.5">
            {ownerScreens.map((screen) => {
              const Icon = screen.icon;
              return (
                <button
                  key={screen.id}
                  onClick={() => navigate(`/tenant-onboarding/screens/${screen.id}`)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left hover:bg-muted/50 active:scale-[0.99] transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                    <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] text-primary" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Screen {screen.id}: {screen.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Public flow screens */}
        <section>
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Public Onboarding Flow
          </div>
          <div className="space-y-1.5">
            {publicScreens.map((screen) => {
              const Icon = screen.icon;
              return (
                <button
                  key={screen.id}
                  onClick={() => navigate(`/tenant-onboarding/screens/${screen.id}`)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left hover:bg-muted/50 active:scale-[0.99] transition-all"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 flex-shrink-0">
                    <Icon className="h-[18px] w-[18px] text-violet-600" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Screen {screen.id}: {screen.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Individual screen page
// ------------------------------------------------------------------

export function TenantOnboardingScreenDetail() {
  const { screenId } = useParams<{ screenId: string }>();
  const navigate = useNavigate();
  const id = Number(screenId);
  const screen = ALL_SCREENS.find((s) => s.id === id);

  const { rooms, isLoading } = useRooms();
  const profileMap = useOnboardingProfileMap();
  const { data: notifications = [] } = useOnboardingNotifications();
  const markRead = useMarkNotificationRead();
  const tenants = useMemo(
    () => rooms.flatMap((room) => room.tenants.map((t) => ({ ...t, roomNo: room.roomNo }))),
    [rooms],
  );
  const tenant = tenants[0];
  const profile = tenant ? profileMap.get(tenant.id) : undefined;
  const { data: link } = useOnboardingLink(tenant?.id || null);

  const [shareOpen, setShareOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [publicStep, setPublicStep] = useState(Math.max(0, id - 8));

  const displayName = tenant?.name || "Aman Verma";
  const roomLabel = tenant ? `Room ${tenant.roomNo} · Bed 1` : "Room 205 · Bed 1";
  const onboardingUrl = link ? `${window.location.origin}/tenant-onboarding/${link.token}` : "";

  // Previous / next navigation
  const currentIndex = ALL_SCREENS.findIndex((s) => s.id === id);
  const prevScreen = currentIndex > 0 ? ALL_SCREENS[currentIndex - 1] : null;
  const nextScreen = currentIndex < ALL_SCREENS.length - 1 ? ALL_SCREENS[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950/30 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tenant-onboarding/screens")} className="h-9 w-9 rounded-xl flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">
              Screen {id}: {screen?.label || "Unknown"}
            </div>
            <div className="text-xs text-muted-foreground">{screen?.group} flow</div>
          </div>
          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              disabled={!prevScreen}
              onClick={() => prevScreen && navigate(`/tenant-onboarding/screens/${prevScreen.id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              disabled={!nextScreen}
              onClick={() => nextScreen && navigate(`/tenant-onboarding/screens/${nextScreen.id}`)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Phone mockup centred */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          {id <= 6 || id >= 15 ? (
            <OwnerPhoneScreen
              screen={id}
              tenant={tenant}
              displayName={displayName}
              roomLabel={roomLabel}
              profile={profile}
              profileMap={profileMap}
              link={link}
              onboardingUrl={onboardingUrl}
              isLoading={isLoading}
              notifications={notifications}
              onShare={() => setShareOpen(true)}
              onProfile={() => setProfileOpen(true)}
              onMarkRead={(nid: string) => markRead.mutate(nid)}
            />
          ) : (
            <PublicPhoneScreen
              screen={id}
              publicStep={publicStep}
              setPublicStep={setPublicStep}
              onOpenLiveForm={() => { if (link) navigate(`/tenant-onboarding/${link.token}`); }}
            />
          )}

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mt-5">
            {ALL_SCREENS.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/tenant-onboarding/screens/${s.id}`)}
                className={cn(
                  "rounded-full transition-all",
                  s.id === id
                    ? "w-6 h-2 bg-primary"
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {tenant && (
        <>
          <OwnerSharePanel
            tenantId={tenant.id}
            tenantName={tenant.name}
            tenantPhone={tenant.phone}
            open={shareOpen}
            onOpenChange={setShareOpen}
          />
          <CompleteTenantProfileDialog
            tenantId={tenant.id}
            tenantName={tenant.name}
            tenantPhone={tenant.phone}
            open={profileOpen}
            onOpenChange={setProfileOpen}
          />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Phone shell helpers (unchanged from original)
// ------------------------------------------------------------------

function PhoneShell({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-[34px] border-[7px] border-slate-800 shadow-2xl", light ? "bg-white" : "bg-[#0b111b]")}>
      <div className={cn("flex items-center justify-between px-5 pt-3 text-[10px] font-semibold", light ? "text-slate-700" : "text-white")}>
        <span>9:41</span>
        <span>● ● ▰</span>
      </div>
      {children}
    </div>
  );
}

function OwnerHeader({ title, displayName, roomLabel }: { title: string; displayName: string; roomLabel: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 text-white">
      <ArrowLeft className="h-5 w-5" />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400 text-[9px] text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </span>
          <span>
            {displayName}
            <br />
            <span className="text-slate-400">{roomLabel}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OnboardingStatus }) {
  return (
    <Badge className={cn("w-fit border-0 text-[10px]",
      status === "verified" || status === "profile_completed"
        ? "bg-emerald-500/20 text-emerald-300"
        : "bg-white/10 text-slate-300")}>
      {status === "not_started" ? "Profile Incomplete" : status.replaceAll("_", " ")}
    </Badge>
  );
}

function CommunicationStatus({ link }: { link: any }) {
  const items = ["Link Sent", "Link Viewed", "Form Started", "Form Submitted", "Profile Completed"];
  const current = link ? Math.max(0, ["sent", "viewed", "started", "submitted", "completed"].indexOf(link.status)) : -1;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-3 text-xs font-semibold">Communication Status</div>
      {items.map((item, index) => (
        <div key={item} className="flex items-center gap-3 border-t border-white/10 py-2 text-[10px]">
          <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border",
            index <= current ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-600 text-transparent")}>
            <Check className="h-3 w-3" />
          </span>
          <span className={index <= current ? "text-white" : "text-slate-400"}>{item}</span>
          <span className="ml-auto text-slate-500">{index <= current ? "06 Apr" : "Pending"}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Owner phone screens
// ------------------------------------------------------------------

function OwnerPhoneScreen({ screen, tenant, displayName, roomLabel, profile, profileMap, link, onboardingUrl, isLoading, notifications, onShare, onProfile, onMarkRead }: any) {
  if (screen === 15) {
    const rows = notifications.length
      ? notifications.slice(0, 5)
      : [
          { id: "e1", title: "Aman Verma viewed the link", message: "Just now", is_read: false },
          { id: "e2", title: "Aman Verma completed profile", message: "20 min ago", is_read: false },
          { id: "e3", title: "Verification pending", message: "25 min ago", is_read: false },
        ];
    return (
      <PhoneShell>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 text-white">
          <span className="text-sm font-semibold">Notifications</span>
          <Bell className="h-4 w-4" />
        </div>
        <div className="space-y-2 p-4 text-white">
          {rows.map((item: any, i: number) => (
            <button
              key={item.id}
              onClick={() => !item.id.startsWith("e") && onMarkRead(item.id)}
              className="flex w-full items-start gap-3 rounded-2xl bg-white/5 p-3 text-left"
            >
              <span className={cn("mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg",
                i === 0 ? "bg-violet-500" : i === 1 ? "bg-emerald-500" : "bg-amber-500")}>
                <Bell className="h-3 w-3" />
              </span>
              <span className="flex-1 text-xs">
                <span className="font-semibold">{item.title}</span>
                <br />
                <span className="text-[10px] text-slate-400">{item.message || "Recently"}</span>
              </span>
              {!item.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-violet-400" />}
            </button>
          ))}
        </div>
      </PhoneShell>
    );
  }

  if (screen === 16) {
    return (
      <PhoneShell>
        <div className="bg-gradient-to-br from-violet-700 to-indigo-700 px-5 py-7 text-white">
          <div className="text-sm font-semibold">Profile Complete Badge</div>
          <p className="mt-1 text-xs text-violet-200">Visible everywhere</p>
        </div>
        <div className="space-y-3 p-4 text-white">
          {Array.from(profileMap.values()).slice(0, 2).map((p: any) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-300 text-xs text-slate-700">
                {(p.full_name || "T").slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 text-xs">
                <b>{p.full_name || "Tenant"}</b>
                <br />
                <span className="text-slate-400">Room 205 · Bed 2</span>
              </span>
              <StatusBadge status={p.status} />
            </div>
          ))}
          {profileMap.size === 0 && (
            <div className="rounded-2xl bg-white/10 p-4 text-xs text-slate-300">
              Complete a tenant profile to show the live badge here.
            </div>
          )}
        </div>
      </PhoneShell>
    );
  }

  if (screen === 2) {
    return (
      <PhoneShell>
        <OwnerHeader title="Complete Tenant Profile" displayName={displayName} roomLabel={roomLabel} />
        <div className="space-y-4 p-4 text-white">
          <StatusBadge status={profile?.status || "not_started"} />
          <div className="text-xs text-slate-400">Invite sent on 06 Apr 2025</div>
          <div className="grid grid-cols-4 gap-2">
            {([[MessageCircle, "Chat"], [Phone, "Call"], [MessageCircle, "WhatsApp"], [MoreHorizontal, "More"]] as any[]).map(([Icon, label]: any) => (
              <button key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-white/5 p-3 text-[10px] text-slate-300">
                <Icon className="h-5 w-5" />{label}
              </button>
            ))}
          </div>
          <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-2">
            {([[Bell, "Send Reminder"], [FileText, "Send Receipt"], [ClipboardCheck, "View Payments"], [UserRoundCheck, "Complete Tenant Profile"], [ClipboardCheck, "View Timeline"]] as any[]).map(([Icon, label]: any, i: number) => (
              <button
                key={label}
                onClick={i === 3 ? onProfile : undefined}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs hover:bg-white/10"
              >
                <Icon className="h-4 w-4 text-slate-300" />{label}<ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
          <button className="w-full rounded-xl border border-red-500/40 bg-red-500/10 py-3 text-xs font-semibold text-red-300">Remove Tenant</button>
        </div>
      </PhoneShell>
    );
  }

  if (screen === 3) {
    return (
      <PhoneShell>
        <OwnerHeader title="Share Onboarding Link" displayName={displayName} roomLabel={roomLabel} />
        <div className="space-y-4 p-4 text-white">
          <h2 className="text-base font-semibold">Share Onboarding Link</h2>
          <p className="text-xs text-slate-400">Secure link to complete profile</p>
          <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-2">
            {([[MessageCircle, "Share via WhatsApp"], [Phone, "Share via SMS"], [Copy, "Copy Link"], [QrCode, "Show QR Code"]] as any[]).map(([Icon, label]: any, i: number) => (
              <button
                key={label}
                onClick={[0, 2, 3].includes(i) ? onShare : undefined}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs hover:bg-white/10"
              >
                <Icon className="h-4 w-4 text-violet-300" />{label}<ChevronRight className="ml-auto h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
          <CommunicationStatus link={link} />
        </div>
      </PhoneShell>
    );
  }

  if (screen === 4) {
    return (
      <PhoneShell>
        <OwnerHeader title="Scan to Complete" displayName={displayName} roomLabel={roomLabel} />
        <div className="space-y-5 p-5 text-center text-white">
          <p className="text-sm">Scan this QR code to complete<br />your PG profile</p>
          <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-white">
            {onboardingUrl ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(onboardingUrl)}`}
                alt="QR Code"
                className="w-40 h-40"
              />
            ) : (
              <div className="grid grid-cols-7 gap-1 p-4">
                {Array.from({ length: 49 }).map((_, i) => (
                  <span key={i} className={cn("h-4 w-4", (i * 7 + i) % 3 === 0 || i % 5 === 0 ? "bg-slate-950" : "bg-white")} />
                ))}
              </div>
            )}
          </div>
          <div className="rounded-xl bg-violet-500/20 px-3 py-2 text-[10px] text-violet-200 break-all">
            {onboardingUrl || "Generate a link to create QR"}
          </div>
          <p className="text-xs text-slate-400">Link expires in 29 days</p>
          <div className="flex gap-2">
            <Button onClick={onShare} className="flex-1 bg-violet-600 text-xs hover:bg-violet-500">Share QR</Button>
            <Button onClick={onShare} variant="secondary" className="flex-1 text-xs">Copy Link</Button>
          </div>
        </div>
      </PhoneShell>
    );
  }

  if (screen === 5) {
    return (
      <PhoneShell>
        <OwnerHeader title="Onboarding Timeline" displayName={displayName} roomLabel={roomLabel} />
        <div className="p-5 text-white min-h-[400px]">
          {tenant ? (
            <ActivityTimeline tenantId={tenant.id} />
          ) : (
            <div className="text-xs text-slate-400">No tenant selected</div>
          )}
        </div>
      </PhoneShell>
    );
  }

  // screen === 6 — Verification
  return (
    <PhoneShell>
      <OwnerHeader title="Verify Documents" displayName={displayName} roomLabel={roomLabel} />
      <div className="space-y-4 p-4 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="mb-3 text-xs font-semibold">Documents</div>
          {["Aadhaar Card", "Passport Photo", "College ID"].map((item) => (
            <div key={item} className="flex items-center gap-3 border-t border-white/10 py-3 text-xs">
              <FileText className="h-5 w-5 text-slate-300" />
              <span className="flex-1">
                {item}<br />
                <span className="text-[10px] text-slate-500">IMG_20250406_1201.jpg</span>
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
          ))}
        </div>
        {tenant && (
          <VerificationPanel
            tenantId={tenant.id}
            verificationStatus={profile?.verification_status || "pending"}
          />
        )}
      </div>
    </PhoneShell>
  );
}

// ------------------------------------------------------------------
// Public phone screens
// ------------------------------------------------------------------

function PublicPhoneScreen({
  screen,
  publicStep,
  setPublicStep,
  onOpenLiveForm,
}: {
  screen: number;
  publicStep: number;
  setPublicStep: (s: number) => void;
  onOpenLiveForm: () => void;
}) {
  const isWelcome = screen === 7;
  const isSuccess = screen === 14;
  const total = publicFlowSteps.length;
  const step = publicFlowSteps[publicStep];

  if (isWelcome) {
    return (
      <PhoneShell light>
        <div className="flex min-h-[650px] flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="text-sm font-bold text-slate-900"><span className="text-violet-600">●</span> PGHub</div>
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-violet-100">
            <Home className="h-28 w-28 text-violet-500" />
          </div>
          <h2 className="text-xl font-bold">Welcome to PGHub</h2>
          <p className="text-xs leading-5 text-slate-500">Complete your profile to<br />make your stay better</p>
          <Button onClick={() => setPublicStep(0)} className="mt-5 w-full bg-violet-600 hover:bg-violet-500">Get Started</Button>
        </div>
      </PhoneShell>
    );
  }

  if (isSuccess) {
    return (
      <PhoneShell light>
        <div className="flex min-h-[650px] flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-20 w-20 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold">Profile Submitted!</h2>
          <p className="text-xs leading-5 text-slate-500">Thank you! Your profile has been<br />submitted successfully.</p>
          <p className="text-xs text-slate-500">We will review your documents<br />and notify you soon.</p>
          <Button onClick={onOpenLiveForm} className="mt-5 w-full bg-violet-600 hover:bg-violet-500">Done</Button>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell light>
      <div className="flex min-h-[650px] flex-col">
        {/* Progress */}
        <div className="px-5 pt-5">
          <div className="mb-3 flex justify-between text-[9px] text-slate-400">
            <span>Step {publicStep + 1} of {total}</span>
            <span>{Math.round(((publicStep + 1) / total) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${((publicStep + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">
            <div className="text-base font-bold text-slate-900">{step?.title || "Step"}</div>
            <div className="text-xs text-slate-500">{step?.description}</div>
          </div>
          <div className="space-y-3">
            {step?.fields.slice(0, 3).map((field) => (
              <div key={field}>
                <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1">
                  {field.replaceAll("_", " ")}
                </div>
                <div className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center text-[10px] text-slate-400">
                  Enter {field.replaceAll("_", " ")}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 pb-5 pt-3 border-t border-slate-100">
          <button
            onClick={() => setPublicStep(Math.max(0, publicStep - 1))}
            disabled={publicStep === 0}
            className="text-xs text-slate-400 disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            onClick={() => setPublicStep(Math.min(total - 1, publicStep + 1))}
            className="rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white"
          >
            Next →
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
