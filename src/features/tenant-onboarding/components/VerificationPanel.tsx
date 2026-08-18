import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  FileText,
  AlertCircle,
  ExternalLink,
  Eye,
  ZoomIn,
  X,
  Maximize2,
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
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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
    if (!path) return;
    if (/^https?:\/\//.test(path)) { window.open(path, "_blank", "noopener,noreferrer"); return; }
    
    // 1. Try signed URL first
    const { data, error } = await supabase.storage.from("tenant-onboarding-docs").createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    
    // 2. Fallback to getPublicUrl
    const { data: pubData } = supabase.storage.from("tenant-onboarding-docs").getPublicUrl(path);
    if (pubData?.publicUrl) {
      window.open(pubData.publicUrl, "_blank", "noopener,noreferrer");
      return;
    }
    
    toast.error("Could not open this document");
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

  useEffect(() => {
    if (!documentPath) {
      setSignedDocUrl(null);
      return;
    }
    if (/^https?:\/\//.test(documentPath)) {
      setSignedDocUrl(documentPath);
      return;
    }
    supabase.storage
      .from("tenant-onboarding-docs")
      .createSignedUrl(documentPath, 3600)
      .then(({ data }: { data: { signedUrl?: string } | null }) => {
        if (data?.signedUrl) {
          setSignedDocUrl(data.signedUrl);
        } else {
          const { data: pubData } = supabase.storage.from("tenant-onboarding-docs").getPublicUrl(documentPath);
          if (pubData?.publicUrl) setSignedDocUrl(pubData.publicUrl);
        }
      })
      .catch(() => {
        const { data: pubData } = supabase.storage.from("tenant-onboarding-docs").getPublicUrl(documentPath);
        if (pubData?.publicUrl) setSignedDocUrl(pubData.publicUrl);
      });
  }, [documentPath]);

  return (
    <div className="space-y-4">
      {/* 1. Aadhaar Document Crop & Preview FIRST */}
      {documentPath ? (
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs font-bold text-foreground truncate">
                {aadhaarDocument?.document_name || "Uploaded Aadhaar Card"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {aadhaarDocument?.status && (
                <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0.2">
                  {aadhaarDocument.status.replaceAll("_", " ")}
                </Badge>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="h-7 text-[11px] gap-1 px-2">
                <Eye className="h-3 w-3" /> Preview
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => openDocument(documentPath)} className="h-7 text-[11px] gap-1 px-2">
                <ExternalLink className="h-3 w-3" /> Open
              </Button>
            </div>
          </div>

          {/* In-app cropped image box */}
          {signedDocUrl ? (
            <div
              onClick={() => setPreviewOpen(true)}
              className="relative w-full h-48 rounded-xl overflow-hidden border border-border/80 bg-slate-950/20 cursor-pointer group shadow-inner"
              title="Click to view full document"
            >
              <img
                src={signedDocUrl}
                alt="Aadhaar Card Preview"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">
                  Click to Expand
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-24 rounded-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              Loading Aadhaar Preview...
            </div>
          )}

          {aadhaarDocument?.rejection_reason && (
            <div className="text-xs text-red-500 mt-1 italic">
              Reason: {aadhaarDocument.rejection_reason}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No Aadhaar document was attached to this submission.
        </div>
      )}

      {/* 2. Verification Status Badge & Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <div className={cn("p-2 rounded-lg border", config.bg)}>
            <StatusIcon className={cn("h-4 w-4", config.color)} />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Status</div>
            <Badge variant="outline" className={cn("text-xs font-bold", config.bg, config.color)}>
              {getVerificationStatusLabel(verificationStatus)}
            </Badge>
          </div>
        </div>
      </div>

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

      {/* Action Buttons with non-overflowing responsive layout */}
      {verificationStatus !== "verified" && (
        <div className="space-y-3">
          {!showRejectForm ? (
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={handleApprove}
                disabled={verify.isPending}
                className="h-10 text-xs font-semibold px-1 py-2 gap-1 bg-green-600 hover:bg-green-700 text-white shrink-0"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Approve</span>
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={verify.isPending}
                variant="outline"
                className="h-10 text-xs font-semibold px-1 py-2 gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
              >
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Reject</span>
              </Button>
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={verify.isPending}
                variant="outline"
                className="h-10 text-xs font-semibold px-1 py-2 gap-1 border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                <span>Re-upload</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  onClick={handleReject}
                  disabled={verify.isPending}
                  className="h-10 text-xs font-semibold gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Confirm Reject
                </Button>
                <Button
                  onClick={handleRequestReupload}
                  disabled={verify.isPending}
                  variant="outline"
                  className="h-10 text-xs font-semibold gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-upload
                </Button>
                <Button
                  onClick={() => setShowRejectForm(false)}
                  variant="ghost"
                  className="h-10 text-xs font-semibold"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Full-screen document preview modal */}
      {previewOpen && signedDocUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">{aadhaarDocument?.document_name || "Aadhaar Card"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => openDocument(documentPath!)} className="h-8 text-xs gap-1">
                  <ExternalLink className="h-3.5 w-3.5" /> Open in Tab
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewOpen(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[82vh] bg-slate-50 dark:bg-slate-950">
              {signedDocUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe src={signedDocUrl} className="w-full h-[78vh] rounded-lg border" title="Document Preview" />
              ) : (
                <img
                  src={signedDocUrl}
                  alt="Aadhaar Card Full Preview"
                  className="max-w-full max-h-[78vh] object-contain rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
