import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck,
  Share2,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOnboardingProfile } from "../hooks/useOnboarding";
import type { OnboardingStatus, OnboardingProfile } from "../types";
import { ProfileStatusBadge } from "./ProfileStatusBadge";
import { OwnerSharePanel } from "./OwnerSharePanel";
import { VerificationPanel } from "./VerificationPanel";
import { ActivityTimeline } from "./ActivityTimeline";

interface CompleteTenantProfileDialogProps {
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompleteTenantProfileDialog({
  tenantId,
  tenantName,
  tenantPhone,
  open,
  onOpenChange,
}: CompleteTenantProfileDialogProps) {
  const { data: profile } = useOnboardingProfile(tenantId);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const status = profile?.status || "not_started";
  const verificationStatus = profile?.verification_status || "pending";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
          {/* Glassmorphism Header */}
          <div className="relative bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-transparent border-b border-border">
            <div className="absolute inset-0 backdrop-blur-sm" />
            <DialogHeader className="relative p-6 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{tenantName}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <span>Tenant Onboarding</span>
                      <ProfileStatusBadge status={status} size="md" showLabel />
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="text-xs gap-1">
                  <UserCheck className="h-3.5 w-3.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="share" className="text-xs gap-1">
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </TabsTrigger>
                <TabsTrigger value="verify" className="text-xs gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verify
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[50vh] mt-4 pr-4">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0 space-y-4">
                  <ProfileOverviewSection profile={profile} />
                </TabsContent>

                {/* Share Tab */}
                <TabsContent value="share" className="mt-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Generate a secure onboarding link and share it with {tenantName} via WhatsApp, SMS, QR Code, or copy link.
                    </p>
                    <ShareSummaryCard
                      tenantName={tenantName}
                      status={status}
                      onOpenShare={() => setShareOpen(true)}
                    />
                  </div>
                </TabsContent>

                {/* Verify Tab */}
                <TabsContent value="verify" className="mt-0">
                  <VerificationPanel
                    tenantId={tenantId}
                    verificationStatus={verificationStatus}
                  />
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-0">
                  <ActivityTimeline tenantId={tenantId} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owner Share Panel */}
      <OwnerSharePanel
        tenantId={tenantId}
        tenantName={tenantName}
        tenantPhone={tenantPhone}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </>
  );
}

function ShareSummaryCard({
  tenantName,
  status,
  onOpenShare,
}: {
  tenantName: string;
  status: string;
  onOpenShare: () => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Onboarding Link Status</div>
        <ProfileStatusBadge status={status as OnboardingStatus} size="md" showLabel />
      </div>
      <button
        onClick={onOpenShare}
        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        {status === "not_started" ? "Generate & Share Link" : "Manage Link"}
      </button>
    </div>
  );
}

function ProfileOverviewSection({ profile }: { profile: OnboardingProfile | null }) {
  if (!profile) {
    return (
      <div className="text-center py-12">
        <UserCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No onboarding profile yet. Generate and share an onboarding link to get started.
        </p>
      </div>
    );
  }

  const sections = [
    {
      title: "Personal Information",
      fields: [
        { label: "Full Name", value: profile.full_name },
        { label: "Date of Birth", value: profile.date_of_birth },
        { label: "Gender", value: profile.gender },
        { label: "Blood Group", value: profile.blood_group },
        { label: "Emergency Contact", value: profile.emergency_contact_name },
        { label: "Emergency Phone", value: profile.emergency_contact_phone },
      ],
    },
    {
      title: "Identity Verification",
      fields: [
        { label: "ID Type", value: profile.id_proof_type },
        { label: "ID Number", value: profile.id_proof_number },
      ],
    },
    {
      title: "Contact Details",
      fields: [
        { label: "Email", value: profile.email },
        { label: "Alternate Phone", value: profile.alternate_phone },
        { label: "Permanent Address", value: profile.permanent_address },
      ],
    },
    {
      title: "Occupation",
      fields: [
        { label: "Occupation", value: profile.occupation },
        { label: "Company", value: profile.company_name },
        { label: "Office Address", value: profile.office_address },
      ],
    },
    {
      title: "Stay Details",
      fields: [
        { label: "Stay Purpose", value: profile.stay_purpose },
        { label: "Expected Duration", value: profile.expected_stay_duration },
        { label: "Move-in Date", value: profile.move_in_date },
      ],
    },
    {
      title: "Payment Details",
      fields: [
        { label: "Payment Mode", value: profile.payment_mode },
        { label: "UPI ID", value: profile.upi_id },
        { label: "Bank Name", value: profile.bank_name },
      ],
    },
    {
      title: "Food Preferences",
      fields: [
        { label: "Food Preference", value: profile.food_preference },
        { label: "Dietary Restrictions", value: profile.dietary_restrictions },
      ],
    },
    {
      title: "Agreement",
      fields: [
        { label: "Rules Acknowledged", value: profile.rules_acknowledged ? "Yes" : "No" },
        { label: "Agreement Accepted", value: profile.agreement_accepted ? "Yes" : "No" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const hasData = section.fields.some((f) => f.value);
        if (!hasData) return null;

        return (
          <div key={section.title} className="rounded-xl border border-border p-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              {section.title}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {section.fields
                .filter((f) => f.value)
                .map((field) => (
                  <div key={field.label}>
                    <div className="text-[10px] text-muted-foreground/70 font-medium">
                      {field.label}
                    </div>
                    <div className="text-sm font-medium mt-0.5">
                      {field.value}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        );
      })}

      {/* Progress bar */}
      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Form Progress
          </div>
          <div className="text-sm font-bold">{profile.form_progress || 0}%</div>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${profile.form_progress || 0}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600"
          />
        </div>
      </div>
    </div>
  );
}
