import { motion } from "framer-motion";
import {
  UserPlus,
  BedDouble,
  Send,
  Eye,
  FileEdit,
  FileUp,
  CheckCircle,
  BadgeCheck,
  XCircle,
  RefreshCw,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingTimeline } from "../hooks/useOnboarding";
import { getTimelineEventLabel, type TimelineEventType } from "../types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  BedDouble,
  Send,
  Eye,
  FileEdit,
  FileUp,
  CheckCircle,
  BadgeCheck,
  XCircle,
  RefreshCw,
  Circle,
};

interface ActivityTimelineProps {
  tenantId: string;
  maxItems?: number;
}

export function ActivityTimeline({ tenantId, maxItems }: ActivityTimelineProps) {
  const { data: events = [], isLoading } = useOnboardingTimeline(tenantId);

  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Circle className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-500/20 via-purple-500/20 to-transparent" />

      <div className="space-y-4">
        {displayEvents.map((event, index) => {
          const Icon = ICON_MAP[event.event_type] || Circle;
          const label = getTimelineEventLabel(event.event_type as TimelineEventType);

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex items-start gap-3"
            >
              {/* Icon dot */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full border-2 bg-background flex-shrink-0",
                  "w-8 h-8",
                  getEventColor(event.event_type),
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="text-sm font-medium">{label}</div>
                {event.event_description && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {event.event_description}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground/70 mt-1">
                  {new Date(event.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "tenant_added":
    case "room_assigned":
      return "border-blue-500/30 text-blue-600 bg-blue-500/5";
    case "link_shared":
      return "border-purple-500/30 text-purple-600 bg-purple-500/5";
    case "link_viewed":
      return "border-cyan-500/30 text-cyan-600 bg-cyan-500/5";
    case "form_started":
      return "border-amber-500/30 text-amber-600 bg-amber-500/5";
    case "documents_uploaded":
      return "border-indigo-500/30 text-indigo-600 bg-indigo-500/5";
    case "profile_completed":
      return "border-green-500/30 text-green-600 bg-green-500/5";
    case "verified":
      return "border-green-600/30 text-green-700 bg-green-600/5";
    case "rejected":
      return "border-red-500/30 text-red-600 bg-red-500/5";
    case "re_upload_requested":
      return "border-orange-500/30 text-orange-600 bg-orange-500/5";
    default:
      return "border-gray-500/30 text-gray-600 bg-gray-500/5";
  }
}
