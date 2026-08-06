import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MedalBadgeIcon } from "./MedalBadgeIcon";
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
 * ProfileStatusBadge - Displays Profile Complete / Incomplete status using
 * the ribbon-medal badge icon (green = complete, grey = incomplete).
 * Clicking opens the Complete Tenant Profile workflow.
 *
 * This badge is designed to appear consistently across:
 * Dashboard, Room Cards, Tenant Management, Search Results, Rent Sheets,
 * Reports, Tenant Details, and the public onboarding success screen.
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
    sm: { icon: 16, text: "text-[10px]", padding: "px-1.5 h-5", gap: "gap-1" },
    md: { icon: 20, text: "text-xs", padding: "px-2 h-6", gap: "gap-1.5" },
    lg: { icon: 28, text: "text-sm", padding: "px-2.5 h-8", gap: "gap-2" },
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
        className="flex items-center justify-center flex-shrink-0"
      >
        <MedalBadgeIcon
          variant={isComplete ? "complete" : "incomplete"}
          size={config.icon}
        />
      </motion.div>
      {showLabel && (
        <span>{isComplete ? "Profile Complete" : "Profile Incomplete"}</span>
      )}
    </motion.button>
  );
});
