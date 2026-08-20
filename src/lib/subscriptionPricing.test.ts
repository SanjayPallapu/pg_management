import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/types/pg";
import { PLAN_CONFIG, type PlanKey } from "../../supabase/functions/_shared/subscriptionPlans";

describe("Razorpay subscription pricing", () => {
  it("matches every paid price displayed in the app", () => {
    (Object.keys(PLAN_CONFIG) as PlanKey[]).forEach((plan) => {
      expect(PLAN_CONFIG[plan].amount).toBe(SUBSCRIPTION_PLANS[plan as SubscriptionPlanKey].price * 100);
    });
  });
});
