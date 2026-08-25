export type PlanKey = "monthly" | "yearly" | "pro" | "pro_yearly" | "promax" | "promax_yearly";

export const PLAN_CONFIG: Record<PlanKey, {
  amount: number;
  period: "monthly" | "yearly";
  interval: number;
  totalCount: number;
  label: string;
  maxPgs: number;
  includedTenants: number;
}> = {
  monthly: { amount: 19900, period: "monthly", interval: 1, totalCount: 120, label: "Basic", maxPgs: 1, includedTenants: 100 },
  yearly: { amount: 199900, period: "yearly", interval: 1, totalCount: 10, label: "Basic Yearly", maxPgs: 1, includedTenants: 100 },
  pro: { amount: 29900, period: "monthly", interval: 1, totalCount: 120, label: "Plus", maxPgs: 2, includedTenants: 200 },
  pro_yearly: { amount: 299900, period: "yearly", interval: 1, totalCount: 10, label: "Plus Yearly", maxPgs: 2, includedTenants: 200 },
  promax: { amount: 49900, period: "monthly", interval: 1, totalCount: 120, label: "Pro", maxPgs: 4, includedTenants: 500 },
  promax_yearly: { amount: 499900, period: "yearly", interval: 1, totalCount: 10, label: "Pro Yearly", maxPgs: 4, includedTenants: 500 },
};

export const PAID_PLANS = new Set<PlanKey>(Object.keys(PLAN_CONFIG) as PlanKey[]);
export const TRIAL_DAYS = 7;

export const getPlanDurationDays = (plan: PlanKey) =>
  plan === "yearly" || plan === "pro_yearly" || plan === "promax_yearly" ? 365 : 30;
