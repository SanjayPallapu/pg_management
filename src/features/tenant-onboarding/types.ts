// ============================================================================
// Tenant Onboarding System - Type Definitions
// Isolated module - does not modify existing types
// ============================================================================

export type OnboardingStatus =
  | 'not_started'
  | 'link_sent'
  | 'link_viewed'
  | 'form_started'
  | 'form_submitted'
  | 'profile_completed'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export type VerificationStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 're_upload_requested';

export type OnboardingLinkStatus =
  | 'sent'
  | 'viewed'
  | 'started'
  | 'submitted'
  | 'completed'
  | 'expired'
  | 'revoked';

export type TimelineEventType =
  | 'tenant_added'
  | 'room_assigned'
  | 'link_shared'
  | 'link_viewed'
  | 'form_started'
  | 'documents_uploaded'
  | 'profile_completed'
  | 'verified'
  | 'rejected'
  | 're_upload_requested';

export type NotificationType =
  | 'link_viewed'
  | 'form_started'
  | 'documents_uploaded'
  | 'form_submitted'
  | 'profile_completed'
  | 'verification_pending';

export interface OnboardingProfile {
  id: string;
  tenant_id: string;
  pg_id: string;
  owner_id: string;
  status: OnboardingStatus;
  verification_status: VerificationStatus;

  // Personal Information
  full_name?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;

  // Identity Verification
  id_proof_type?: string;
  id_proof_number?: string;
  id_proof_url?: string;
  address_proof_url?: string;

  // Contact Details
  email?: string;
  alternate_phone?: string;
  permanent_address?: string;

  // Occupation
  occupation?: string;
  company_name?: string;
  office_address?: string;

  // Stay Details
  stay_purpose?: string;
  expected_stay_duration?: string;
  move_in_date?: string;

  // Payment Details
  payment_mode?: string;
  upi_id?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  bank_name?: string;

  // Food Preferences
  food_preference?: string;
  dietary_restrictions?: string;

  // PG Rules & Agreement
  rules_acknowledged?: boolean;
  agreement_accepted?: boolean;
  agreement_signed_at?: string;

  // Progress
  form_progress?: number;
  last_saved_step?: string;

  created_at: string;
  updated_at: string;
  completed_at?: string;
  verified_at?: string;
  verified_by?: string;
}

export interface OnboardingLink {
  id: string;
  tenant_id: string;
  pg_id: string;
  owner_id: string;
  token: string;
  status: OnboardingLinkStatus;
  sent_via?: string;
  sent_at?: string;
  viewed_at?: string;
  started_at?: string;
  submitted_at?: string;
  completed_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingDocument {
  id: string;
  onboarding_profile_id: string;
  tenant_id: string;
  document_type: string;
  document_name?: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  status: 'pending' | 'approved' | 'rejected' | 're_upload_requested';
  rejection_reason?: string;
  uploaded_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface OnboardingTimelineEvent {
  id: string;
  tenant_id: string;
  pg_id: string;
  onboarding_profile_id?: string;
  event_type: TimelineEventType;
  event_description?: string;
  event_metadata?: Record<string, unknown>;
  created_at: string;
}

export interface OnboardingNotification {
  id: string;
  owner_id: string;
  tenant_id: string;
  pg_id: string;
  notification_type: NotificationType;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

// Helper: Check if profile is complete
export const isProfileComplete = (status: OnboardingStatus): boolean =>
  status === 'profile_completed' || status === 'pending_verification' || status === 'verified';

// Helper: Check if verification is verified
export const isVerified = (status: VerificationStatus): boolean =>
  status === 'verified';

// Helper: Get badge variant
export const getProfileBadgeVariant = (status: OnboardingStatus): 'complete' | 'incomplete' => {
  return isProfileComplete(status) ? 'complete' : 'incomplete';
};

// Helper: Communication status label
export const getCommunicationStatusLabel = (link: OnboardingLink | null): string => {
  if (!link) return 'Not Sent';
  switch (link.status) {
    case 'sent': return 'Link Sent';
    case 'viewed': return 'Link Viewed';
    case 'started': return 'Form Started';
    case 'submitted': return 'Form Submitted';
    case 'completed': return 'Profile Completed';
    case 'expired': return 'Link Expired';
    case 'revoked': return 'Link Revoked';
    default: return 'Not Sent';
  }
};

// Helper: Verification status label
export const getVerificationStatusLabel = (status: VerificationStatus): string => {
  switch (status) {
    case 'pending': return 'Pending Verification';
    case 'verified': return 'Verified';
    case 'rejected': return 'Rejected';
    case 're_upload_requested': return 'Re-upload Requested';
    default: return 'Pending Verification';
  }
};

// Helper: Timeline event label
export const getTimelineEventLabel = (eventType: TimelineEventType): string => {
  switch (eventType) {
    case 'tenant_added': return 'Tenant Added';
    case 'room_assigned': return 'Room Assigned';
    case 'link_shared': return 'Link Shared';
    case 'link_viewed': return 'Link Viewed';
    case 'form_started': return 'Form Started';
    case 'documents_uploaded': return 'Documents Uploaded';
    case 'profile_completed': return 'Profile Completed';
    case 'verified': return 'Verified';
    case 'rejected': return 'Rejected';
    case 're_upload_requested': return 'Re-upload Requested';
    default: return eventType;
  }
};

// Helper: Timeline event icon name
export const getTimelineEventIcon = (eventType: TimelineEventType): string => {
  switch (eventType) {
    case 'tenant_added': return 'UserPlus';
    case 'room_assigned': return 'BedDouble';
    case 'link_shared': return 'Send';
    case 'link_viewed': return 'Eye';
    case 'form_started': return 'FileEdit';
    case 'documents_uploaded': return 'FileUp';
    case 'profile_completed': return 'CheckCircle';
    case 'verified': return 'BadgeCheck';
    case 'rejected': return 'XCircle';
    case 're_upload_requested': return 'RefreshCw';
    default: return 'Circle';
  }
};

// Form step definitions for the public onboarding form
export interface OnboardingFormStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  fields: string[];
}

export const ONBOARDING_FORM_STEPS: OnboardingFormStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    icon: 'User',
    fields: ['full_name', 'date_of_birth', 'gender', 'blood_group', 'alternate_phone', 'emergency_contact_name', 'emergency_contact_phone'],
  },
  {
    id: 'identity',
    title: 'Identity Verification',
    description: 'Verify your identity',
    icon: 'Shield',
    fields: ['id_proof_type', 'id_proof_number', 'id_proof_url'],
  },
  {
    id: 'stay',
    title: 'Stay Details',
    description: 'About your stay',
    icon: 'Home',
    fields: ['room_number', 'bed_label', 'move_in_date', 'monthly_rent', 'security_deposit_amount'],
  },
  {
    id: 'rules',
    title: 'PG Rules & Agreement',
    description: 'Review and accept terms',
    icon: 'ScrollText',
    fields: ['rules_acknowledged', 'agreement_accepted'],
  },
];
