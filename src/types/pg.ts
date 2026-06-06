// Multi-PG Types

export interface PG {
  id: string;
  ownerId: string;
  name: string;
  address?: string;
  logoUrl?: string;
  floors: number;
  electricityUnitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'pro';
  status: 'free' | 'pending' | 'active' | 'expired';
  billingCycle?: 'trial' | 'monthly' | 'quarterly' | 'yearly';
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
  paymentMethod: 'razorpay';
  screenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'authenticated' | 'active' | 'cancelled' | 'halted';
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
  trial: {
    name: 'Free Trial',
    price: 0,
    periodLabel: '30 days',
    billingCycle: 'trial',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Start with a full-featured 1 month free trial.',
  },
  monthly: {
    name: 'Monthly',
    price: 999,
    periodLabel: '/month',
    billingCycle: 'monthly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Unlimited PGs, unlimited tenants, billed every month.',
  },
  quarterly: {
    name: 'Quarterly',
    price: 2699,
    periodLabel: '/3 months',
    billingCycle: 'quarterly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Save more with one payment every 3 months.',
  },
  yearly: {
    name: 'Yearly',
    price: 9999,
    periodLabel: '/year',
    billingCycle: 'yearly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Best value for serious multi-PG operators.',
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlanKey[] = ['trial', 'monthly', 'quarterly', 'yearly'];

export const SUBSCRIPTION_PLAN_META = {
  maxPgs: -1,
  maxTenantsPerPg: -1,
  features: {
    autoReminders: true,
    dailyReports: true,
    aiLogo: true,
  },
} as const;
