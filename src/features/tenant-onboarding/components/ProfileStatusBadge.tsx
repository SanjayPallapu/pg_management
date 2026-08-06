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
 * the ribbon-medal badge icon only (no pill/card background), green = complete,
 * grey = incomplete. Clicking opens the Complete Tenant Profile workflow.
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
    sm: { icon: 18, text: "text-[10px]" },
    md: { icon: 24, text: "text-xs" },
    lg: { icon: 32, text: "text-sm" },
  };
  const config = sizeConfig[size];

  return (
    <motion.button
      type="button"
      whileHover={isClickable ? { scale: 1.08 } : undefined}
      whileTap={isClickable ? { scale: 0.95 } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={!isClickable}
      className={cn(
        "inline-flex items-center gap-1.5 bg-transparent border-0 p-0 m-0",
        isClickable ? "cursor-pointer" : "cursor-default",
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
        <span
          className={cn(
            "font-medium",
            config.text,
            isComplete
              ? "text-green-600 dark:text-green-400"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          {isComplete ? "Profile Complete" : "Profile Incomplete"}
        </span>
      )}
    </motion.button>
  );
});
