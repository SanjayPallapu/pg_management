import { memo } from "react";
import { cn } from "@/lib/utils";

interface MedalBadgeIconProps {
  variant: "complete" | "incomplete";
  className?: string;
  size?: number;
}

/**
 * MedalBadgeIcon - Ribbon-medal style badge icon used to represent
 * tenant profile completion status across the app.
 *
 * - "complete"   => Green medal (matches approved reference design)
 * - "incomplete" => Grey medal
 *
 * Rendered as inline SVG (no external image assets required) so it scales
 * crisply at any size and adapts colors without extra network requests.
 */
export const MedalBadgeIcon = memo(function MedalBadgeIcon({
  variant,
  className,
  size = 40,
}: MedalBadgeIconProps) {
  const isComplete = variant === "complete";

  const colors = isComplete
    ? {
        body: "#1F9D55",
        bodyLight: "#2FBE6A",
        ring: "#8FE3AE",
        star: "#BFF2D2",
        starShadow: "#8FE3AE",
        ribbon: "#188A4A",
        ribbonLight: "#9FE9BC",
      }
    : {
        body: "#9CA3AF",
        bodyLight: "#B7BEC7",
        ring: "#E5E7EB",
        star: "#F1F2F4",
        starShadow: "#D6D9DE",
        ribbon: "#8A9099",
        ribbonLight: "#D8DBDF",
      };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("select-none", className)}
      aria-label={isComplete ? "Profile complete medal" : "Profile incomplete medal"}
      role="img"
    >
      {/* Ribbon tails */}
      <path
        d="M35 62 L18 100 L30 96 L38 106 L48 70 Z"
        fill={colors.ribbon}
      />
      <path
        d="M35 62 L18 100 L30 96 L34 98 L44 68 Z"
        fill={colors.ribbonLight}
        opacity="0.55"
      />
      <path
        d="M65 62 L82 100 L70 96 L62 106 L52 70 Z"
        fill={colors.ribbon}
      />
      <path
        d="M65 62 L82 100 L70 96 L66 98 L56 68 Z"
        fill={colors.ribbonLight}
        opacity="0.55"
      />

      {/* Medal body - scalloped circle */}
      <path
        d="M50 2c3 0 5.5 4 8.5 4.6c3 .6 7-2 9.7-.8c2.7 1.2 3.3 5.8 5.6 7.6c2.3 1.8 6.8.7 8.7 3c1.9 2.3.3 6.5 1.7 9.2c1.4 2.7 5.8 3.9 6.6 6.9c.8 3-2.1 6.4-1.8 9.5c.3 3.1 4.2 5.5 3.9 8.6c-.3 3.1-4.6 4.7-5.4 7.7c-.8 3 1.6 6.8.3 9.6c-1.3 2.8-5.9 3.1-7.7 5.5c-1.8 2.4-.9 6.9-3.2 8.8c-2.3 1.9-6.5.1-9.2 1.5c-2.7 1.4-3.5 5.9-6.4 6.7c-2.9.8-6-2.4-9-2.4c-3 0-6.1 3.2-9 2.4c-2.9-.8-3.7-5.3-6.4-6.7c-2.7-1.4-6.9.4-9.2-1.5c-2.3-1.9-1.4-6.4-3.2-8.8c-1.8-2.4-6.4-2.7-7.7-5.5c-1.3-2.8 1.1-6.6.3-9.6c-.8-3-5.1-4.6-5.4-7.7c-.3-3.1 3.6-5.5 3.9-8.6c.3-3.1-2.6-6.5-1.8-9.5c.8-3 5.2-4.2 6.6-6.9c1.4-2.7-.2-6.9 1.7-9.2c1.9-2.3 6.4-1.2 8.7-3c2.3-1.8 2.9-6.4 5.6-7.6c2.7-1.2 6.7 1.4 9.7.8C44.5 6 47 2 50 2Z"
        fill={colors.body}
      />
      <path
        d="M50 2c3 0 5.5 4 8.5 4.6c3 .6 7-2 9.7-.8c2.7 1.2 3.3 5.8 5.6 7.6c2.3 1.8 6.8.7 8.7 3c1.9 2.3.3 6.5 1.7 9.2c1.4 2.7 5.8 3.9 6.6 6.9c.8 3-2.1 6.4-1.8 9.5c.3 3.1 4.2 5.5 3.9 8.6"
        stroke={colors.bodyLight}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Inner ring */}
      <circle cx="50" cy="47" r="29" fill={colors.ring} />
      <circle cx="50" cy="47" r="23" fill={colors.body} />

      {/* Star */}
      <path
        d="M50 30 L55.5 41.3 L68 43.1 L59 51.9 L61.1 64.3 L50 58.4 L38.9 64.3 L41 51.9 L32 43.1 L44.5 41.3 Z"
        fill={colors.star}
      />
      <path
        d="M50 30 L55.5 41.3 L68 43.1 L59 51.9 L60.2 58.7 L50 46 Z"
        fill={colors.starShadow}
        opacity="0.6"
      />
    </svg>
  );
});
