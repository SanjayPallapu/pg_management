import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import {
  ArrowLeft,
  User,
  Phone,
  Briefcase,
  Home,
  CreditCard,
  Utensils,
  ScrollText,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Send,
  MessageCircle,
  Bell,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import {
  useOnboardingProfile,
  useOnboardingLink,
  useOnboardingTimeline,
  useOnboardingDocuments,
} from "@/features/tenant-onboarding/hooks/useOnboarding";
import { OwnerSharePanel } from "@/features/tenant-onboarding/components/OwnerSharePanel";
import { VerificationPanel } from "@/features/tenant-onboarding/components/VerificationPanel";
import { ActivityTimeline } from "@/features/tenant-onboarding/components/ActivityTimeline";
import { useState } from "react";
import { motion } from "framer-motion";
import type { OnboardingStatus, VerificationStatus } from "@/features/tenant-onboarding/types";
import { format, parseISO } from "date-fns";

// ------------------------------------------------------------------
// Status helpers
// ------------------------------------------------------------------

function statusConfig(status: OnboardingStatus | undefined) {
  switch (status) {
    case "verified":
      return { label: "Verified", icon: BadgeCheck, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "profile_completed":
    case "pending_verification":
      return { label: "Pending Verification", icon: Clock, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "form_submitted":
      return { label: "Form Submitted", icon: CheckCircle2, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "form_started":
      return { label: "Form Started", icon: FileText, color: "bg-sky-500/10 text-sky-600 border-sky-500/20" };
    case "link_viewed":
      return { label: "Link Viewed", icon: Send, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
    case "link_sent":
      return { label: "Link Sent", icon: Send, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" };
    case "rejected":
      return { label: "Rejected", icon: XCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" };
    default:
      return { label: "Not Started", icon: RefreshCw, color: "bg-slate-500/10 text-slate-500 border-slate-500/20" };
  }
}

function verifyConfig(status: VerificationStatus | undefined) {
  switch (status) {
    case "verified":
      return { label: "Verified", color: "bg-emerald-500/10 text-emerald-600" };
    case "rejected":
      return { label: "Rejected", color: "bg-red-500/10 text-red-600" };
    case "re_upload_requested":
      return { label: "Re-upload Requested", color: "bg-orange-500/10 text-orange-600" };
    default:
      return { label: "Pending", color: "bg-amber-500/10 text-amber-600" };
  }
}

// ------------------------------------------------------------------
// Section card
// ------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value?: string | boolean | null }) {
  if (!value && value !== false) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-b-0">
      <span className="text-xs text-muted-foreground font-medium min-w-0 flex-shrink-0">{label}</span>
      <span className="text-xs text-right font-medium text-foreground break-words max-w-[60%]">
        {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
      </span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      {children}
    </motion.div>
  );
}

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------

export default function TenantProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const { rooms } = useRooms();
  const [shareOpen, setShareOpen] = useState(false);

  // Find tenant from rooms
  const tenantInfo = useMemo(() => {
    for (const room of rooms) {
      const tenant = room.tenants.find((t) => t.id === tenantId);
      if (tenant) return { tenant, room };
    }
    return null;
  }, [rooms, tenantId]);

  const { data: profile, isLoading } = useOnboardingProfile(tenantId || null);
  const { data: link } = useOnboardingLink(tenantId || null);

  const tenant = tenantInfo?.tenant;
  const room = tenantInfo?.room;

  const st = statusConfig(profile?.status);
  const StatusIcon = st.icon;

  const formatDate = (d?: string) => {
    if (!d) return undefined;
    try {
      return format(parseISO(d), "dd MMM yyyy");
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base leading-tight truncate">
              {tenant?.name || "Tenant Profile"}
            </div>
            {room && (
              <div className="text-xs text-muted-foreground">
                Room {room.roomNo} &middot; {room.capacity} Sharing
              </div>
            )}
          </div>
          {tenant && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setShareOpen(true)}
            >
              <Send className="h-3.5 w-3.5" />
              Share Link
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 pb-8">

        {/* Hero card */}
        <div className="mt-5 rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-5 flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-2xl font-bold text-primary">
            {(tenant?.name || "T")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">{tenant?.name || "Unknown Tenant"}</div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Phone className="h-3.5 w-3.5" />
              {tenant?.phone || "—"}
            </div>
            {room && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Home className="h-3.5 w-3.5" />
                Room {room.roomNo}
              </div>
            )}
          </div>
          <Badge
            className={cn("flex items-center gap-1.5 text-xs border px-2.5 py-1 h-auto flex-shrink-0", st.color)}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {st.label}
          </Badge>
        </div>

        {/* Quick actions */}
        {tenant && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: MessageCircle, label: "WhatsApp", href: `https://wa.me/91${tenant.phone.replace(/\D/g, "")}`, external: true },
              { icon: Phone, label: "Call", href: `tel:${tenant.phone}`, external: true },
              { icon: Send, label: "Send Link", action: () => setShareOpen(true) },
            ].map(({ icon: Icon, label, href, external, action }) => (
              <button
                key={label}
                onClick={action || (() => { if (href) { if (external) window.open(href, "_blank"); else window.location.href = href; } })}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                {label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="mt-6 flex items-center justify-center py-12 text-muted-foreground text-sm">
            Loading profile...
          </div>
        ) : !profile ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div className="font-semibold mb-1">No profile data yet</div>
            <p className="text-xs text-muted-foreground mb-4">
              Share the onboarding link so this tenant can fill in their details.
            </p>
            {tenant && (
              <Button size="sm" onClick={() => setShareOpen(true)} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Share Onboarding Link
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">

            {/* Personal Information */}
            <SectionCard icon={User} title="Personal Information">
              <InfoRow label="Full Name" value={profile.full_name} />
              <InfoRow label="Date of Birth" value={formatDate(profile.date_of_birth)} />
              <InfoRow label="Gender" value={profile.gender} />
              <InfoRow label="Blood Group" value={profile.blood_group} />
              <InfoRow label="Emergency Contact" value={profile.emergency_contact_name} />
              <InfoRow label="Emergency Phone" value={profile.emergency_contact_phone} />
            </SectionCard>

            {/* Identity */}
            <SectionCard icon={Shield} title="Identity Verification">
              <InfoRow label="ID Proof Type" value={profile.id_proof_type} />
              <InfoRow label="ID Number" value={profile.id_proof_number} />
              <div className="mt-2">
                <Badge className={cn("text-[10px]", verifyConfig(profile.verification_status).color)}>
                  {verifyConfig(profile.verification_status).label}
                </Badge>
              </div>
            </SectionCard>

            {/* Contact Details */}
            <SectionCard icon={Phone} title="Contact Details">
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Alternate Phone" value={profile.alternate_phone} />
              <InfoRow label="Permanent Address" value={profile.permanent_address} />
            </SectionCard>

            {/* Occupation */}
            <SectionCard icon={Briefcase} title="Occupation">
              <InfoRow label="Occupation" value={profile.occupation} />
              <InfoRow label="Company / College" value={profile.company_name} />
              <InfoRow label="Office Address" value={profile.office_address} />
            </SectionCard>

            {/* Stay Details */}
            <SectionCard icon={Home} title="Stay Details">
              <InfoRow label="Purpose of Stay" value={profile.stay_purpose} />
              <InfoRow label="Expected Duration" value={profile.expected_stay_duration} />
              <InfoRow label="Move-in Date" value={formatDate(profile.move_in_date)} />
            </SectionCard>

            {/* Payment Details */}
            <SectionCard icon={CreditCard} title="Payment Details">
              <InfoRow label="Payment Mode" value={profile.payment_mode} />
              <InfoRow label="UPI ID" value={profile.upi_id} />
              <InfoRow label="Bank Name" value={profile.bank_name} />
              <InfoRow label="Account Number" value={profile.bank_account_number} />
              <InfoRow label="IFSC Code" value={profile.ifsc_code} />
            </SectionCard>

            {/* Food */}
            <SectionCard icon={Utensils} title="Food Preferences">
              <InfoRow label="Food Preference" value={profile.food_preference} />
              <InfoRow label="Dietary Restrictions" value={profile.dietary_restrictions} />
            </SectionCard>

            {/* Agreement */}
            <SectionCard icon={ScrollText} title="PG Rules & Agreement">
              <InfoRow label="Rules Acknowledged" value={profile.rules_acknowledged} />
              <InfoRow label="Agreement Accepted" value={profile.agreement_accepted} />
              <InfoRow label="Signed At" value={profile.agreement_signed_at ? formatDate(profile.agreement_signed_at) : undefined} />
            </SectionCard>

            {/* Verification panel */}
            {tenant && (
              <SectionCard icon={BadgeCheck} title="Verify Tenant">
                <VerificationPanel
                  tenantId={tenant.id}
                  verificationStatus={profile.verification_status || "pending"}
                />
              </SectionCard>
            )}

            {/* Timeline */}
            {tenant && (
              <SectionCard icon={Clock} title="Activity Timeline">
                <ActivityTimeline tenantId={tenant.id} />
              </SectionCard>
            )}
          </div>
        )}
      </div>

      {/* Share panel */}
      {tenant && (
        <OwnerSharePanel
          tenantId={tenant.id}
          tenantName={tenant.name}
          tenantPhone={tenant.phone}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}
    </div>
  );
}
