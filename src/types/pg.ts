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
    name: 'Monthly Basic',
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
  pro: {
    name: 'Pro Plan',
    price: 1999,
    periodLabel: '/month',
    billingCycle: 'pro',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Advanced statistics, premium WhatsApp templates, priority support.',
  },
  pro_quarterly: {
    name: 'Pro Plan',
    price: 5399,
    periodLabel: '/3 months',
    billingCycle: 'pro_quarterly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Advanced statistics, premium WhatsApp templates, priority support.',
  },
  pro_yearly: {
    name: 'Pro Plan',
    price: 19999,
    periodLabel: '/year',
    billingCycle: 'pro_yearly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Advanced statistics, premium WhatsApp templates, priority support.',
  },
  promax: {
    name: 'Pro Max Plan',
    price: 3999,
    periodLabel: '/month',
    billingCycle: 'promax',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'All Pro features plus dedicated account manager, custom API access, and zero downtime.',
  },
  promax_quarterly: {
    name: 'Pro Max Plan',
    price: 9999,
    periodLabel: '/3 months',
    billingCycle: 'promax_quarterly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'All Pro features plus dedicated account manager, custom API access, and zero downtime.',
  },
  promax_yearly: {
    name: 'Pro Max Plan',
    price: 39999,
    periodLabel: '/year',
    billingCycle: 'promax_yearly',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'All Pro features plus dedicated account manager, custom API access, and zero downtime.',
  },
  quarterly: {
    name: 'Quarterly Save',
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
    description: 'Save 10% with a single payment every 3 months.',
  },
  yearly: {
    name: 'Yearly Value',
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
  lifetime: {
    name: 'Lifetime Unlimited',
    price: 29999,
    periodLabel: 'one-time',
    billingCycle: 'lifetime',
    maxPgs: -1,
    maxTenantsPerPg: -1,
    features: {
      autoReminders: true,
      dailyReports: true,
      aiLogo: true,
    },
    description: 'Pay once, use forever. Free updates and all premium features included.',
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlanKey[] = [
  'trial', 'monthly', 'pro', 'promax', 'quarterly', 'yearly', 'lifetime',
  'pro_quarterly', 'pro_yearly', 'promax_quarterly', 'promax_yearly'
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
