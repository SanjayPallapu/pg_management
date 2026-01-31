// Multi-PG Types

export interface PG {
  id: string;
  ownerId: string;
  name: string;
  address?: string;
  logoUrl?: string;
  floors: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'pro';
  status: 'free' | 'pending' | 'active' | 'expired';
  maxPgs: number;
  maxTenantsPerPg: number;
  features: SubscriptionFeatures;
  paymentProofUrl?: string;
  paymentRequestedAt?: string;
  paymentApprovedAt?: string;
  approvedBy?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionFeatures {
  autoReminders: boolean;
  dailyReports: boolean;
  aiLogo: boolean;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  amount: number;
  paymentMethod: 'upi' | 'whatsapp' | 'gpay' | 'phonepe';
  screenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PGSetupData {
  pgCount: number;
  pgs: PGBrandingData[];
}

export interface PGBrandingData {
  name: string;
  address?: string;
  logoType: 'upload' | 'generate';
  logoUrl?: string;
  logoStyle?: 'modern' | 'minimal' | 'luxury' | 'friendly';
  logoColor?: string;
  floors: number;
  roomsPerFloor: number;
}

// Subscription plan definitions
export const SUBSCRIPTION_PLANS = {
  manual: {
    name: 'Manual',
    price: 499, // Monthly in INR
    maxPgs: -1, // Unlimited
    maxTenantsPerPg: -1, // Unlimited
    features: {
      autoReminders: false,
      dailyReports: false,
      aiLogo: true,
    },
    description: 'Manual reminders via WhatsApp',
  },
  automatic: {
    name: 'Automatic',
    price: 999, // Monthly in INR
    maxPgs: -1, // Unlimited
    maxTenantsPerPg: -1, // Unlimited
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Automated image reminders & reports',
  },
} as const;

export const ADMIN_UPI_ID = '9390418552@kotak811';
export const ADMIN_WHATSAPP = '919390418552';

export const PAYMENT_METHODS = [
  { id: 'gpay', name: 'Google Pay', icon: 'Wallet' },
  { id: 'phonepe', name: 'PhonePe', icon: 'CreditCard' },
  { id: 'paytm', name: 'Paytm', icon: 'Smartphone' },
  { id: 'upi', name: 'Any UPI', icon: 'Smartphone' },
] as const;
