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
  billingCycle?: 'trial' | 'monthly' | 'pro' | 'promax' | 'quarterly' | 'yearly' | 'pro_yearly' | 'promax_yearly' | 'lifetime';
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
    maxPgs: 4,
    maxTenantsPerPg: 500,
    includedTenants: 500,
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
    includedTenants: 10,
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
    maxPgs: 1,
    maxTenantsPerPg: 100,
    includedTenants: 100,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Essential PG operations for an individual property owner.',
  },
  yearly: {
    name: 'Basic Plan (Yearly)',
    price: 4999,
    periodLabel: '/year',
    billingCycle: 'yearly',
    maxPgs: 1,
    maxTenantsPerPg: 100,
    includedTenants: 100,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Basic billed yearly with 2 months free.',
  },
  pro: {
    name: 'Plus',
    price: 799,
    periodLabel: '/month',
    billingCycle: 'pro',
    maxPgs: 2,
    maxTenantsPerPg: 200,
    includedTenants: 200,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Multi-property insights, bulk operations and priority support.',
  },
  pro_yearly: {
    name: 'Plus Plan (Yearly)',
    price: 7999,
    periodLabel: '/year',
    billingCycle: 'pro_yearly',
    maxPgs: 2,
    maxTenantsPerPg: 200,
    includedTenants: 200,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Plus billed yearly with 2 months free.',
  },
  promax: {
    name: 'Pro',
    price: 999,
    periodLabel: '/month',
    billingCycle: 'promax',
    maxPgs: 4,
    maxTenantsPerPg: 500,
    includedTenants: 500,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Advanced reporting and exports for multi-property businesses.',
  },
  promax_yearly: {
    name: 'Pro (Yearly)',
    price: 9999,
    periodLabel: '/year',
    billingCycle: 'promax_yearly',
    maxPgs: 4,
    maxTenantsPerPg: 500,
    includedTenants: 500,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Pro billed yearly with 2 months free.',
  },
  lifetime: {
    name: 'Pro Max Lifetime',
    price: 9999,
    periodLabel: 'one-time',
    billingCycle: 'lifetime',
    maxPgs: 4,
    maxTenantsPerPg: 500,
    includedTenants: 500,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Lifetime Pro Max access with up to 4 PGs and 500 tenants.',
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlanKey[] = [
  'trial', 'monthly', 'pro', 'promax', 'yearly', 'pro_yearly', 'promax_yearly'
];

export const SUBSCRIPTION_PLAN_META = {
  maxPgs: 4,
  maxTenantsPerPg: 500,
  features: {
    autoReminders: true,
    dailyReports: true,
    aiLogo: true,
  },
} as const;

export type PaidPlanFamily = 'basic' | 'plus' | 'pro';

export const SUBSCRIPTION_PLAN_MARKETING: Record<PaidPlanFamily, {
  audience: string;
  badge?: string;
  features: readonly string[];
}> = {
  basic: {
    audience: 'For individual PG owners',
    features: [
      '1 PG property',
      '100 active tenants included',
      'Room, bed and occupancy management',
      'Tenant onboarding and KYC links',
      'Rent, overdue and partial-payment tracking',
      'Security deposits and settlements',
      'Electricity and AC bill calculation',
      'PDF receipts and one-tap WhatsApp sharing',
      'Occupancy and revenue dashboard',
      'Standard customer support',
    ],
  },
  plus: {
    audience: 'For growing PG businesses',
    badge: 'Most Popular',
    features: [
      'Up to 2 PG properties',
      '200 active tenants included',
      'Everything in Basic',
      'Consolidated multi-property dashboard',
      'Bulk rent-reminder actions',
      'Advanced collection and overdue insights',
      'English and Telugu voice assistant',
      'Voice confirmations, undo and action history',
      'Priority customer support',
    ],
  },
  pro: {
    audience: 'For multi-property PG businesses',
    features: [
      'Up to 4 PG properties',
      '500 active tenants included',
      'Everything in Plus',
      'Advanced financial and occupancy reports',
      'Excel and PDF data export',
      'Property-wise revenue comparison',
      'Advanced settlement reports',
      'Complete operational audit history',
      'Faster priority support',
    ],
  },
};

export function getPaidPlanFamily(planKey: SubscriptionPlanKey): PaidPlanFamily | null {
  if (planKey === 'monthly' || planKey === 'yearly') return 'basic';
  if (planKey === 'pro' || planKey === 'pro_yearly') return 'plus';
  if (planKey === 'promax' || planKey === 'promax_yearly' || planKey === 'lifetime') return 'pro';
  return null;
}

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
    US: { currency: 'USD', symbol: '$', price: 9.99 },
  },
  yearly: {
    IN: { currency: 'INR', symbol: '₹', price: 4999 },
    US: { currency: 'USD', symbol: '$', price: 99.99 },
  },
  pro: {
    IN: { currency: 'INR', symbol: '₹', price: 799 },
    US: { currency: 'USD', symbol: '$', price: 15.99 },
  },
  pro_yearly: {
    IN: { currency: 'INR', symbol: '₹', price: 7999 },
    US: { currency: 'USD', symbol: '$', price: 159.99 },
  },
  promax: {
    IN: { currency: 'INR', symbol: '₹', price: 999 },
    US: { currency: 'USD', symbol: '$', price: 19.99 },
  },
  promax_yearly: {
    IN: { currency: 'INR', symbol: '₹', price: 9999 },
    US: { currency: 'USD', symbol: '$', price: 199.99 },
  },
  lifetime: {
    IN: { currency: 'INR', symbol: '₹', price: 9999 },
    US: { currency: 'USD', symbol: '$', price: 199.99 },
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
