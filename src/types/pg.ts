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
  free: {
    name: 'Free',
    price: 0,
    maxPgs: 1,
    maxTenantsPerPg: 10,
    features: {
      autoReminders: false,
      dailyReports: false,
      aiLogo: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 999, // Monthly in INR
    maxPgs: -1, // Unlimited
    maxTenantsPerPg: -1, // Unlimited
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
  },
} as const;

export const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI', icon: 'Smartphone' },
  { id: 'whatsapp', name: 'WhatsApp Pay', icon: 'MessageCircle' },
  { id: 'gpay', name: 'Google Pay', icon: 'Wallet' },
  { id: 'phonepe', name: 'PhonePe', icon: 'CreditCard' },
] as const;
