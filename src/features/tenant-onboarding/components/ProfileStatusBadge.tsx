import { memo } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  isProfileComplete,
  type OnboardingStatus,
} from "../types";

interface ProfileStatusBadgeProps {
  status?: OnboardingStatus | null;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  showLabel?: boolean;
  className?: string;
}

/**
 * ProfileStatusBadge - Displays Profile Complete / Incomplete status.
 * Green (glowing) = Profile Complete, Grey = Profile Incomplete.
 * Clicking opens the Complete Tenant Profile workflow.
 *
 * Redesigned (2026) to use a premium circular badge indicator with a soft glow,
 * matching the new full-screen tenant onboarding UI. Fully backward compatible
 * with existing usages across Dashboard, Room Cards, Tenant Management,
 * Search Results, Rent Sheets, Reports, and Tenant Details.
 */
export const ProfileStatusBadge = memo(function ProfileStatusBadge({
  status,
  size = "sm",
  onClick,
  showLabel = false,
  className,
}: ProfileStatusBadgeProps) {
  const isComplete = status ? isProfileComplete(status) : false;
  const isClickable = !!onClick;

  const sizeConfig = {
    sm: { icon: "h-3 w-3", text: "text-[10px]", padding: "px-1.5 h-4", gap: "gap-0.5" },
    md: { icon: "h-3.5 w-3.5", text: "text-xs", padding: "px-2 h-5", gap: "gap-1" },
    lg: { icon: "h-4 w-4", text: "text-sm", padding: "px-2.5 h-6", gap: "gap-1" },
  };
  const config = sizeConfig[size];

  return (
    <motion.button
      type="button"
      whileHover={isClickable ? { scale: 1.05 } : undefined}
      whileTap={isClickable ? { scale: 0.95 } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={!isClickable}
      className={cn(
        "inline-flex items-center rounded-full font-medium border transition-all",
        config.padding,
        config.gap,
        config.text,
        isComplete
          ? "bg-gradient-to-r from-green-500/15 to-emerald-500/15 text-green-600 dark:text-green-400 border-green-500/40 dark:border-green-500/30 shadow-[0_0_8px_rgba(34,197,94,0.35)]"
          : "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/30 dark:border-gray-500/20",
        isClickable && "cursor-pointer hover:shadow-md",
        !isClickable && "cursor-default",
        className,
      )}
      title={isComplete ? "Profile Complete - Click to view" : "Profile Incomplete - Click to complete"}
    >
      <motion.div
        initial={false}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.35 }}
        key={isComplete ? "complete" : "incomplete"}
        className={cn(
          "rounded-full flex items-center justify-center",
          isComplete && "drop-shadow-[0_0_4px_rgba(34,197,94,0.6)]",
        )}
      >
        {isComplete ? (
          <CheckCircle2 className={cn(config.icon, "text-green-500 dark:text-green-400")} />
        ) : (
          <Circle className={cn(config.icon, "text-gray-400")} />
        )}
      </motion.div>
      {showLabel && (
        <span>{isComplete ? "Profile Complete" : "Profile Incomplete"}</span>
      )}
    </motion.button>
  );
});
