import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MessageCircle,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Link2,
  Clock,
  Eye,
  FileEdit,
  FileCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGenerateOnboardingLink, useOnboardingLink } from "../hooks/useOnboarding";
import { getCommunicationStatusLabel, type OnboardingLink as OnboardingLinkType } from "../types";

interface OwnerSharePanelProps {
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OwnerSharePanel({
  tenantId,
  tenantName,
  tenantPhone,
  open,
  onOpenChange,
}: OwnerSharePanelProps) {
  const generateLink = useGenerateOnboardingLink();
  const { data: existingLink } = useOnboardingLink(tenantId);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const link = existingLink as OnboardingLinkType | null;

  const handleGenerateLink = async (sentVia: string) => {
    await generateLink.mutateAsync({
      tenantId,
      tenantName,
      sentVia,
    });
  };

  // Single helper that ensures a link exists and returns the deep link URL.
  const getOrCreateOnboardingUrl = async (sentVia: string) => {
    if (!link) {
      await handleGenerateLink(sentVia);
    }

    const token =
      (existingLink?.token ??
        (generateLink.data as Array<{ token: string }>)?.[0]?.token) || "";

    return `${window.location.origin}/tenant-onboarding/${token}`;
  };

  const handleShareWhatsApp = async () => {
    const url = await getOrCreateOnboardingUrl("whatsapp");

    const phoneDigits = tenantPhone.replace(/\D/g, "");
    const formattedPhone = phoneDigits.startsWith("91") ? phoneDigits : `91${phoneDigits}`;
    const message = `Hi ${tenantName},\n\nPlease complete your tenant onboarding by filling out the form at the link below:\n\n${url}\n\nThis link is secure and expires in 7 days.\n\nThank you!`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShareSMS = async () => {
    const url = await getOrCreateOnboardingUrl("sms");
    const message = `Hi ${tenantName}, please complete your tenant onboarding: ${url}`;
    window.location.href = `sms:${tenantPhone}?body=${encodeURIComponent(message)}`;
  };

  const handleCopyLink = async () => {
    const url = await getOrCreateOnboardingUrl("copy");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShowQR = async () => {
    const url = await getOrCreateOnboardingUrl("qr");
    setQrUrl(url);
    setShowQR(true);
  };

  const statusSteps = [
    { key: "sent", label: "Link Sent", icon: Send },
    { key: "viewed", label: "Link Viewed", icon: Eye },
    { key: "started", label: "Form Started", icon: FileEdit },
    { key: "submitted", label: "Form Submitted", icon: FileCheck },
    { key: "completed", label: "Profile Completed", icon: Check },
  ];

  const currentStepIndex = link
    ? statusSteps.findIndex((s) => s.key === link.status)
    : -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Share Onboarding Link
          </DialogTitle>
          <DialogDescription>
            Send a secure onboarding link to {tenantName} to complete their profile.
          </DialogDescription>
        </DialogHeader>

        {/* Communication Status Tracker */}
        {link && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border border-border">
            <div className="text-xs font-medium text-muted-foreground mb-3">Communication Status</div>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
                    <div className="flex items-center w-full">
                      {index > 0 && (
                        <div
                          className={cn(
                            "flex-1 h-0.5 transition-colors",
                            isCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700",
                          )}
                        />
                      )}
                      <motion.div
                        initial={false}
                        animate={{
                          scale: isCurrent ? [1, 1.15, 1] : 1,
                        }}
                        transition={{ duration: 0.4 }}
                        className={cn(
                          "flex items-center justify-center rounded-full border-2 transition-colors",
                          isCompleted
                            ? "bg-green-500 border-green-500 text-white"
                            : "bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700 text-gray-400",
                          isCurrent && "ring-2 ring-green-500/30",
                        )}
                        style={{ width: 28, height: 28 }}
                      >
                        <Icon className="h-3 w-3" />
                      </motion.div>
                      {index < statusSteps.length - 1 && (
                        <div
                          className={cn(
                            "flex-1 h-0.5 transition-colors",
                            index < currentStepIndex ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700",
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[9px] text-center font-medium leading-tight",
                        isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-center">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  link.status === "completed"
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
                )}
              >
                {getCommunicationStatusLabel(link)}
              </Badge>
            </div>
          </div>
        )}

        {/* Share Options */}
        <div className="grid grid-cols-2 gap-3">
          <ShareButton
            icon={MessageCircle}
            label="WhatsApp"
            color="text-green-600"
            bgColor="bg-green-500/10 hover:bg-green-500/20"
            onClick={handleShareWhatsApp}
            loading={generateLink.isPending}
          />
          <ShareButton
            icon={Smartphone}
            label="SMS"
            color="text-blue-600"
            bgColor="bg-blue-500/10 hover:bg-blue-500/20"
            onClick={handleShareSMS}
            loading={generateLink.isPending}
          />
          <ShareButton
            icon={QrCode}
            label="QR Code"
            color="text-purple-600"
            bgColor="bg-purple-500/10 hover:bg-purple-500/20"
            onClick={handleShowQR}
            loading={generateLink.isPending}
          />
          <ShareButton
            icon={copied ? Check : Copy}
            label={copied ? "Copied!" : "Copy Link"}
            color="text-gray-600"
            bgColor="bg-gray-500/10 hover:bg-gray-500/20"
            onClick={handleCopyLink}
            loading={generateLink.isPending}
          />
        </div>

        {/* QR Code Display */}
        <AnimatePresence>
          {showQR && qrUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl border border-border bg-white dark:bg-slate-900 flex flex-col items-center gap-3">
                <QRCodePlaceholder url={qrUrl} />
                <p className="text-xs text-muted-foreground break-all text-center max-w-xs">
                  {qrUrl}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expiry notice */}
        {link && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Link expires {new Date(link.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareButton({
  icon: Icon,
  label,
  color,
  bgColor,
  onClick,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border transition-all",
        bgColor,
        loading && "opacity-50 cursor-wait",
      )}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Icon className={cn("h-5 w-5", color)} />
      )}
      <span className={cn("text-xs font-medium", color)}>{label}</span>
    </button>
  );
}

// Simple QR code placeholder - uses an external QR code service
function QRCodePlaceholder({ url }: { url: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
  return (
    <div className="p-3 bg-white rounded-lg">
      <img src={qrUrl} alt="QR Code" className="w-36 h-36" />
    </div>
  );
}
