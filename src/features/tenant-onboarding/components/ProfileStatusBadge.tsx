import { memo } from "react";
import { cn } from "@/lib/utils";
import type { OnboardingStatus } from "../types";
import completeBadge from "@/assets/tenant-onboarding/profile-complete.png";
import incompleteBadge from "@/assets/tenant-onboarding/profile-incomplete.png";

interface ProfileStatusBadgeProps {
  status?: OnboardingStatus | null;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showLabel?: boolean;
  className?: string;
}

export const ProfileStatusBadge = memo(function ProfileStatusBadge({ status, size = "sm", onClick, showLabel = true, className }: ProfileStatusBadgeProps) {
  const verified = status === "verified";
  const complete = ["profile_completed", "pending_verification", "form_submitted"].includes(status || "");
  const label = verified ? "Verified" : complete ? "Profile complete" : "Profile incomplete";
  const compact = size === "sm" && !showLabel;
  const badgeImage = verified || complete ? completeBadge : incompleteBadge;

  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onClick?.(); }}
      disabled={!onClick}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center font-bold transition-transform",
        onClick && "cursor-pointer hover:scale-[1.03] active:scale-95",
        compact ? "border-0 bg-transparent p-0" : "rounded-full border",
        !compact && (verified || complete ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "border-slate-400/20 bg-slate-500/10 text-slate-500"),
        !compact && (size === "sm" ? "gap-1 px-1.5 py-0.5 text-[9px]" : size === "md" ? "gap-1.5 px-2.5 py-1 text-[10px]" : "gap-2 px-3 py-1.5 text-xs"),
        className,
      )}
    >
      <img
        src={badgeImage}
        alt=""
        aria-hidden="true"
        className={cn("shrink-0 object-contain", size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : "h-[18px] w-[18px]")}
      />
      {!compact && label}
    </button>
  );
});
