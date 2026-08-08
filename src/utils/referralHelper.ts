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

export interface ReferralShareContent {
  title: string;
  text: string;
  url: string;
}

export type ReferralShareResult = "shared" | "copied" | "cancelled";

const REFERRAL_CODE_PATTERN = /^PGHUB-[A-Z0-9]{5,24}$/;

export const getPublicAppUrl = () => {
  if (import.meta.env.VITE_PUBLIC_APP_URL) return import.meta.env.VITE_PUBLIC_APP_URL;
  if (
    typeof window !== "undefined" &&
    window.location.protocol.startsWith("http") &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  ) {
    return window.location.origin;
  }
  return "https://pgmanagee.vercel.app";
};

export const isReferralCodeFormatValid = (code: string) =>
  REFERRAL_CODE_PATTERN.test(code.trim().toUpperCase());

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
    totalInvited: 0,
    activePaidReferrals: 0,
    freeMonthsEarned: 0,
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

  if (!isReferralCodeFormatValid(cleanInput)) {
    return { success: false, message: "Enter a valid PG HUB referral code." };
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

export const captureReferralCodeFromUrl = () => {
  if (typeof window === "undefined") return null;
  const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
  if (!code || !isReferralCodeFormatValid(code)) return null;
  localStorage.setItem("applied_referral_code", code);
  return code;
};

export const getReferralShareContent = (referralCode: string): ReferralShareContent => {
  const code = referralCode.trim().toUpperCase();
  const url = `${getPublicAppUrl().replace(/\/$/, "")}/onboarding?ref=${encodeURIComponent(code)}`;
  return {
    title: "Join me on PG HUB",
    text: `Manage your PG smarter with PG HUB. Use my referral code ${code} to get 30% off your first month.`,
    url,
  };
};

const copyInvite = async ({ text, url }: ReferralShareContent) => {
  const invitation = `${text}\n${url}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(invitation);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = invitation;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
};

export const shareReferralInvite = async (referralCode: string): Promise<ReferralShareResult> => {
  const content = getReferralShareContent(referralCode);

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: content.title,
        text: content.text,
        url: content.url,
        dialogTitle: "Share your PG HUB invite",
      });
      return "shared";
    }

    if (navigator.share) {
      await navigator.share(content);
      return "shared";
    }

    await copyInvite(content);
    return "copied";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw error;
  }
};
