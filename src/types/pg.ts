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
  billingCycle?: 'trial' | 'monthly' | 'pro' | 'promax' | 'quarterly' | 'yearly' | 'lifetime';
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
// Subscription plan definitions
export const SUBSCRIPTION_PLANS = {
  trial: {
    name: 'Free Trial',
    price: 0,
    periodLabel: '7 days',
    billingCycle: 'trial',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Start with a full-featured 7-day free trial.',
  },
  free: {
    name: 'Free Plan',
    price: 0,
    periodLabel: 'forever',
    billingCycle: 'free',
    maxPgs: 1,
    maxTenantsPerPg: 10,
    features: {
      autoReminders: false,
      dailyReports: false,
      aiLogo: false,
    },
    description: 'Free basic management for a single small PG.',
  },
  monthly: {
    name: 'Basic',
    price: 499,
    periodLabel: '/month',
    billingCycle: 'monthly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Essential PG management tools for small to medium properties.',
  },
  yearly: {
    name: 'Basic Plan (Yearly)',
    price: 4999,
    periodLabel: '/year',
    billingCycle: 'yearly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Best value for growing PG operators (Save over ₹900).',
  },
  pro: {
    name: 'Plus',
    price: 999,
    periodLabel: '/month',
    billingCycle: 'pro',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Advanced analytics, auto WhatsApp reminders & priority support.',
  },
  pro_yearly: {
    name: 'Plus Plan (Yearly)',
    price: 9999,
    periodLabel: '/year',
    billingCycle: 'pro_yearly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Advanced analytics, auto WhatsApp reminders & priority support.',
  },
  promax: {
    name: 'Pro Max',
    price: 1999,
    periodLabel: '/month',
    billingCycle: 'promax',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Multi-PG management, dedicated account manager & zero downtime.',
  },
  promax_yearly: {
    name: 'Pro Max (Yearly)',
    price: 19999,
    periodLabel: '/year',
    billingCycle: 'promax_yearly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Multi-PG management, dedicated account manager & zero downtime.',
  },
  lifetime: {
    name: 'Lifetime',
    price: 49999,
    periodLabel: 'one-time',
    billingCycle: 'lifetime',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Pay once, use forever. All Pro Max features with no renewals.',
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlanKey[] = [
  'trial', 'free', 'monthly', 'pro', 'promax', 'yearly', 'pro_yearly', 'promax_yearly', 'lifetime'
];

export const SUBSCRIPTION_PLAN_META = {
  maxPgs: -1,
  maxTenantsPerPg: -1,
  features: {
    autoReminders: true,
    dailyReports: true,
    aiLogo: true,
  },
} as const;

export interface RegionalPrice {
  currency: string;
  symbol: string;
  price: number;
}

export const REGIONAL_PRICING: Record<SubscriptionPlanKey, Record<string, RegionalPrice>> = {
  trial: {
    IN: { currency: 'INR', symbol: '₹', price: 0 },
    US: { currency: 'USD', symbol: '$', price: 0 },
  },
  free: {
    IN: { currency: 'INR', symbol: '₹', price: 0 },
    US: { currency: 'USD', symbol: '$', price: 0 },
  },
  monthly: {
    IN: { currency: 'INR', symbol: '₹', price: 499 },
    US: { currency: 'USD', symbol: '$', price: 6.99 },
  },
  yearly: {
    IN: { currency: 'INR', symbol: '₹', price: 4999 },
    US: { currency: 'USD', symbol: '$', price: 69.99 },
  },
  pro: {
    IN: { currency: 'INR', symbol: '₹', price: 999 },
    US: { currency: 'USD', symbol: '$', price: 14.99 },
  },
  pro_yearly: {
    IN: { currency: 'INR', symbol: '₹', price: 9999 },
    US: { currency: 'USD', symbol: '$', price: 149.99 },
  },
  promax: {
    IN: { currency: 'INR', symbol: '₹', price: 1999 },
    US: { currency: 'USD', symbol: '$', price: 29.99 },
  },
  promax_yearly: {
    IN: { currency: 'INR', symbol: '₹', price: 19999 },
    US: { currency: 'USD', symbol: '$', price: 289.99 },
  },
  lifetime: {
    IN: { currency: 'INR', symbol: '₹', price: 49999 },
    US: { currency: 'USD', symbol: '$', price: 699.99 },
  },
};

export function getLocalizedSubscriptionPrice(planKey: SubscriptionPlanKey, regionOverride?: string): RegionalPrice {
  let region = regionOverride || 'IN';
  if (!regionOverride && typeof navigator !== 'undefined') {
    const lang = (navigator.language || 'en-IN').toUpperCase();
    if (!lang.includes('IN')) region = 'US';
  }
  const planRegions = REGIONAL_PRICING[planKey];
  return planRegions?.[region] || planRegions?.['IN'] || { currency: 'INR', symbol: '₹', price: SUBSCRIPTION_PLANS[planKey].price };
}
