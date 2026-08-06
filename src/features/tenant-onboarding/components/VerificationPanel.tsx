import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useVerifyOnboarding, useOnboardingDocuments } from "../hooks/useOnboarding";
import { getVerificationStatusLabel, type VerificationStatus } from "../types";

interface VerificationPanelProps {
  tenantId: string;
  verificationStatus: VerificationStatus;
}

export function VerificationPanel({ tenantId, verificationStatus }: VerificationPanelProps) {
  const verify = useVerifyOnboarding();
  const { data: documents = [] } = useOnboardingDocuments(tenantId);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = () => {
    verify.mutate({ tenantId, action: "approve" });
  };

  const handleReject = () => {
    verify.mutate({
      tenantId,
      action: "reject",
      rejectionReason,
    });
    setShowRejectForm(false);
    setRejectionReason("");
  };

  const handleRequestReupload = () => {
    verify.mutate({
      tenantId,
      action: "request_reupload",
      rejectionReason,
    });
    setShowRejectForm(false);
    setRejectionReason("");
  };

  const statusConfig: Record<VerificationStatus, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: { color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30", icon: AlertCircle },
    verified: { color: "text-green-600", bg: "bg-green-500/10 border-green-500/30", icon: ShieldCheck },
    rejected: { color: "text-red-600", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
    re_upload_requested: { color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30", icon: RefreshCw },
  };

  const config = statusConfig[verificationStatus];
  const StatusIcon = config.icon;

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

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Uploaded Documents</div>
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-slate-50 dark:bg-slate-900/50"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {doc.document_name || doc.document_type}
                  </div>
                  <div className="text-xs text-muted-foreground">{doc.document_type}</div>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs ml-2",
                  doc.status === "approved" && "bg-green-500/10 text-green-600 border-green-500/30",
                  doc.status === "rejected" && "bg-red-500/10 text-red-600 border-red-500/30",
                  doc.status === "pending" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
                  doc.status === "re_upload_requested" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                )}
              >
                {doc.status}
              </Badge>
            </div>
          ))}
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
                placeholder="Enter rejection reason or re-upload instructions..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
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
