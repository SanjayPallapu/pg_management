export type PlanKey = "monthly" | "yearly" | "pro" | "pro_yearly" | "promax" | "promax_yearly";

export const PLAN_CONFIG: Record<PlanKey, {
  amount: number;
  period: "monthly" | "yearly";
  interval: number;
  totalCount: number;
  label: string;
}> = {
  monthly: { amount: 19900, period: "monthly", interval: 1, totalCount: 120, label: "Basic" },
  yearly: { amount: 199900, period: "yearly", interval: 1, totalCount: 10, label: "Basic Yearly" },
  pro: { amount: 29900, period: "monthly", interval: 1, totalCount: 120, label: "Plus" },
  pro_yearly: { amount: 299900, period: "yearly", interval: 1, totalCount: 10, label: "Plus Yearly" },
  promax: { amount: 49900, period: "monthly", interval: 1, totalCount: 120, label: "Pro Ultimate" },
  promax_yearly: { amount: 499900, period: "yearly", interval: 1, totalCount: 10, label: "Pro Ultimate Yearly" },
};

export const PAID_PLANS = new Set<PlanKey>(Object.keys(PLAN_CONFIG) as PlanKey[]);
export const TRIAL_DAYS = 7;

export const getPlanDurationDays = (plan: PlanKey) =>
  plan === "yearly" || plan === "pro_yearly" || plan === "promax_yearly" ? 365 : 30;
