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
 * Gray = Profile Incomplete, Green = Profile Complete
 * Clicking opens the Complete Tenant Profile workflow.
 *
 * This badge is designed to appear consistently across:
 * Dashboard, Room Cards, Tenant Management, Search Results, Rent Sheets, Reports, Tenant Details
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
          ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 dark:border-green-500/20"
          : "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/30 dark:border-gray-500/20",
        isClickable && "cursor-pointer hover:shadow-sm",
        !isClickable && "cursor-default",
        className,
      )}
      title={isComplete ? "Profile Complete - Click to view" : "Profile Incomplete - Click to complete"}
    >
      <motion.div
        initial={false}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.3 }}
        key={isComplete ? "complete" : "incomplete"}
      >
        {isComplete ? (
          <CheckCircle2 className={cn(config.icon)} />
        ) : (
          <Circle className={cn(config.icon)} />
        )}
      </motion.div>
      {showLabel && (
        <span>{isComplete ? "Complete" : "Incomplete"}</span>
      )}
    </motion.button>
  );
});
