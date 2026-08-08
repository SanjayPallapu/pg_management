// Barrel exports for the Tenant Onboarding module
export { ProfileStatusBadge } from "./components/ProfileStatusBadge";
export { OwnerSharePanel } from "./components/OwnerSharePanel";
export { VerificationPanel } from "./components/VerificationPanel";
export { ActivityTimeline } from "./components/ActivityTimeline";
export { PublicTenantOnboardingForm } from "./components/PublicTenantOnboardingForm";

// Hooks
export {
  useOnboardingProfiles,
  useOnboardingProfile,
  useOnboardingProfileMap,
  useGenerateOnboardingLink,
  useOnboardingLink,
  useOnboardingTimeline,
  useOnboardingDocuments,
  useVerifyOnboarding,
  useOnboardingNotifications,
  useMarkNotificationRead,
  useUploadOnboardingDocument,
} from "./hooks/useOnboarding";

// Types
export type {
  OnboardingProfile,
  OnboardingLink,
  OnboardingDocument,
  OnboardingTimelineEvent,
  OnboardingNotification,
  OnboardingStatus,
  VerificationStatus,
  OnboardingLinkStatus,
  TimelineEventType,
  NotificationType,
} from "./types";

// Utilities
export {
  isProfileComplete,
  isVerified,
  getProfileBadgeVariant,
  getCommunicationStatusLabel,
  getVerificationStatusLabel,
  getTimelineEventLabel,
  getTimelineEventIcon,
  ONBOARDING_FORM_STEPS,
} from "./types";
