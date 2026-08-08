import { memo } from "react";
import { BadgeCheck, CircleDashed, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStatus } from "../types";

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
  const Icon = verified ? BadgeCheck : complete ? Clock3 : CircleDashed;
  const label = verified ? "Verified" : complete ? "Profile complete" : "Profile incomplete";
  const compact = size === "sm" && !showLabel;

  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onClick?.(); }}
      disabled={!onClick}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-bold transition-transform",
        onClick && "cursor-pointer hover:scale-[1.03] active:scale-95",
        verified ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-500" : complete ? "border-amber-500/25 bg-amber-500/15 text-amber-500" : "border-slate-400/20 bg-slate-500/10 text-slate-500",
        size === "sm" ? "gap-1 px-1.5 py-0.5 text-[9px]" : size === "md" ? "gap-1.5 px-2.5 py-1 text-[10px]" : "gap-2 px-3 py-1.5 text-xs",
        className,
      )}
    >
      <Icon className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} />
      {!compact && label}
    </button>
  );
});
