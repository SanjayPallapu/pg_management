import type { Subscription } from "@/types/pg";

export type SubscriptionAccess = {
  allowed: boolean;
  expired: boolean;
  daysRemaining: number | null;
  reason: "active" | "expired" | "missing" | "inactive";
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getSubscriptionAccess(subscription: Subscription | null, now = new Date()): SubscriptionAccess {
  if (!subscription) return { allowed: false, expired: false, daysRemaining: null, reason: "missing" };

  const isLifetime = subscription.billingCycle === "lifetime" && subscription.status === "active";
  if (isLifetime) return { allowed: true, expired: false, daysRemaining: null, reason: "active" };

  const expiryMs = subscription.expiresAt ? new Date(subscription.expiresAt).getTime() : Number.NaN;
  const hasValidExpiry = Number.isFinite(expiryMs);
  const daysRemaining = hasValidExpiry ? Math.max(0, Math.ceil((expiryMs - now.getTime()) / DAY_MS)) : null;
  const expired = hasValidExpiry && expiryMs <= now.getTime();
  const allowed = subscription.status === "active" && hasValidExpiry && !expired;

  return {
    allowed,
    expired: expired || subscription.status === "expired",
    daysRemaining,
    reason: allowed ? "active" : expired || subscription.status === "expired" ? "expired" : "inactive",
  };
}
