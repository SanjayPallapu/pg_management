import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useVerifyOnboarding, useOnboardingDocuments } from "../hooks/useOnboarding";
import { getVerificationStatusLabel, type VerificationStatus } from "../types";
import { supabase } from "@/integrations/supabase/proxyClient";

interface VerificationPanelProps {
  tenantId: string;
  verificationStatus: VerificationStatus;
  idProofUrl?: string;
}

export function VerificationPanel({ tenantId, verificationStatus, idProofUrl }: VerificationPanelProps) {
  const verify = useVerifyOnboarding();
  const { data: documents = [] } = useOnboardingDocuments(tenantId);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = () => {
    verify.mutate({ tenantId, action: "approve" });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason before rejecting.");
      return;
    }
    verify.mutate({ tenantId, action: "reject", rejectionReason });
    setShowRejectForm(false);
    setRejectionReason("");
  };

  const handleRequestReupload = () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide instructions for re-upload.");
      return;
    }
    verify.mutate({ tenantId, action: "request_reupload", rejectionReason });
    setShowRejectForm(false);
    setRejectionReason("");
  };

  const openDocument = async (path: string) => {
    if (/^https?:\/\//.test(path)) { window.open(path, "_blank", "noopener,noreferrer"); return; }
    const { data, error } = await supabase.storage.from("tenant-onboarding-docs").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) { toast.error("Could not open this document"); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const statusConfig: Record<VerificationStatus, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: { color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertCircle },
    verified: { color: "text-green-600", bg: "bg-green-500/10 border-green-500/30", icon: ShieldCheck },
    rejected: { color: "text-red-600", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
    re_upload_requested: { color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30", icon: RefreshCw },
  };

  const config = statusConfig[verificationStatus];
  const StatusIcon = config.icon;
  const aadhaarDocument = documents.find((document) => document.document_type === "aadhaar" || document.document_type === "id_proof") || documents[0];
  const documentPath = aadhaarDocument?.file_url || idProofUrl;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg border", config.bg)}>
            <StatusIcon className={cn("h-4 w-4", config.color)} />
          </div>
          <div>
            <div className="text-sm font-medium">Verification Status</div>
            <Badge variant="outline" className={cn("text-xs", config.bg, config.color)}>
              {getVerificationStatusLabel(verificationStatus)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Exactly one Aadhaar document is required for onboarding. */}
      {documentPath ? (
        <div className="border-y border-border py-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Aadhaar document</div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{aadhaarDocument?.document_name || "Uploaded Aadhaar"}</div>
                  <div className="text-xs text-muted-foreground">One identity document</div>
                  {aadhaarDocument?.rejection_reason && (
                    <div className="text-xs text-red-500 mt-0.5 italic">
                      {aadhaarDocument.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {aadhaarDocument?.status && <Badge variant="outline" className="text-xs capitalize">{aadhaarDocument.status.replaceAll("_", " ")}</Badge>}
                <Button type="button" variant="outline" size="sm" onClick={() => openDocument(documentPath)} className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />View
                </Button>
              </div>
            </div>
        </div>
      ) : (
        <div className="border-y border-border py-4 text-center text-xs text-muted-foreground">No Aadhaar document was attached to this submission.</div>
      )}

      {/* Verified success banner */}
      {verificationStatus === "verified" && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <div className="text-sm font-medium text-green-700 dark:text-green-400">Tenant Verified</div>
            <div className="text-xs text-green-600/80 dark:text-green-500/80">
              This tenant&apos;s onboarding has been approved.
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {verificationStatus !== "verified" && (
        <div className="space-y-3">
          {!showRejectForm ? (
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={verify.isPending}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={verify.isPending}
                variant="outline"
                className="flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={verify.isPending}
                variant="outline"
                className="flex-1 gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <RefreshCw className="h-4 w-4" />
                Re-upload
              </Button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <Textarea
                placeholder="Enter rejection reason or re-upload instructions (required)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className={cn(!rejectionReason.trim() && "border-red-300 dark:border-red-800")}
              />
              {!rejectionReason.trim() && (
                <p className="text-xs text-red-500">A reason is required before confirming.</p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={handleReject}
                  disabled={verify.isPending}
                  className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  <XCircle className="h-4 w-4" />
                  Confirm Reject
                </Button>
                <Button
                  onClick={handleRequestReupload}
                  disabled={verify.isPending}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Request Re-upload
                </Button>
                <Button
                  onClick={() => setShowRejectForm(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
