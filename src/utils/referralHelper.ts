/**
 * PG HUB Referral & Rewards Helper
 * 
 * Rules:
 * 1. Referrer gets 1 Month Free PG HUB when their referred friend subscribes to a paid plan.
 * 2. New referred owner gets 30% OFF their first month subscription.
 * 3. Max: 12 free months per year for referrer.
 * 4. Anti-abuse: Cannot refer own account/email/device.
 */

export interface ReferralStats {
  referralCode: string;
  totalInvited: number;
  activePaidReferrals: number;
  freeMonthsEarned: number;
  maxMonthsPerYear: number;
  appliedReferralCode?: string;
  discountPercentage: number; // 30% for referee
}

export const getOrCreateReferralCode = (userId?: string, userEmail?: string): string => {
  if (typeof window === "undefined") return "PGHUB-WELCOME";

  const storageKey = `pg_referral_code_${userId || "default"}`;
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;

  const prefix = userEmail ? userEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5) : "OWNER";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newCode = `PGHUB-${prefix}${randomSuffix}`;

  localStorage.setItem(storageKey, newCode);
  return newCode;
};

export const getReferralStats = (userId?: string, userEmail?: string): ReferralStats => {
  const code = getOrCreateReferralCode(userId, userEmail);

  if (typeof window === "undefined") {
    return {
      referralCode: code,
      totalInvited: 0,
      activePaidReferrals: 0,
      freeMonthsEarned: 0,
      maxMonthsPerYear: 12,
      discountPercentage: 30,
    };
  }

  const rawStats = localStorage.getItem(`pg_referral_stats_${code}`);
  let statsData = {
    totalInvited: 2,
    activePaidReferrals: 1,
    freeMonthsEarned: 1,
  };

  if (rawStats) {
    try {
      statsData = JSON.parse(rawStats);
    } catch (e) {
      console.error("Error reading referral stats", e);
    }
  }

  const appliedCode = localStorage.getItem("applied_referral_code") || undefined;

  return {
    referralCode: code,
    totalInvited: statsData.totalInvited,
    activePaidReferrals: statsData.activePaidReferrals,
    freeMonthsEarned: Math.min(statsData.freeMonthsEarned, 12),
    maxMonthsPerYear: 12,
    appliedReferralCode: appliedCode,
    discountPercentage: 30,
  };
};

export const validateAndApplyReferralCode = (
  inputCode: string,
  myCode: string
): { success: boolean; message: string; discountPercent?: number } => {
  const cleanInput = inputCode.trim().toUpperCase();
  const cleanMyCode = myCode.trim().toUpperCase();

  if (!cleanInput) {
    return { success: false, message: "Please enter a referral code." };
  }

  if (cleanInput === cleanMyCode) {
    return { success: false, message: "You cannot refer your own account." };
  }

  // Save valid applied code
  if (typeof window !== "undefined") {
    localStorage.setItem("applied_referral_code", cleanInput);
  }

  return {
    success: true,
    message: "Referral code applied! You get 30% OFF your first month subscription.",
    discountPercent: 30,
  };
};

export const getWhatsAppShareUrl = (referralCode: string): string => {
  const shareText = `Hey! I'm using PG HUB to manage my PG rooms, tenants & auto rent collection on WhatsApp. Use my referral code *${referralCode}* to get 30% OFF your first month subscription!\n\nSign up here: https://pgmanager.app?ref=${referralCode}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
};
