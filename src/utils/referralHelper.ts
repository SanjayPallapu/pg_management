/**
 * PG HUB Referral & Rewards Helper
 * 
 * Referral attribution and rewards are stored server-side. Browser storage is
 * used only to carry an invite code from the public link until sign-in.
 */

export interface ReferralStats {
  referralCode: string;
  totalInvited: number;
  activePaidReferrals: number;
  freeMonthsEarned: number;
  maxMonthsPerYear: number;
  appliedReferralCode?: string;
  appliedStatus?: "applied" | "rewarded" | "cancelled";
}

export interface ReferralShareContent {
  title: string;
  text: string;
  url: string;
}

export type ReferralShareResult = "shared" | "copied" | "cancelled";

const REFERRAL_CODE_PATTERN = /^PGHUB-[A-Z0-9]{10}$/;

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

export const EMPTY_REFERRAL_STATS: ReferralStats = {
  referralCode: "Loading…",
  totalInvited: 0,
  activePaidReferrals: 0,
  freeMonthsEarned: 0,
  maxMonthsPerYear: 12,
};

type ReferralRpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

export const getReferralStats = async (): Promise<ReferralStats> => {
  const { supabase } = await import("@/integrations/supabase/proxyClient");
  const { data, error } = await (supabase as unknown as ReferralRpcClient).rpc("get_referral_dashboard");
  if (error) throw error;
  return { ...EMPTY_REFERRAL_STATS, ...(data || {}) } as ReferralStats;
};

export const validateAndApplyReferralCode = async (
  inputCode: string,
  myCode: string,
): Promise<{ success: boolean; message: string }> => {
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

  const { supabase } = await import("@/integrations/supabase/proxyClient");
  const { error } = await (supabase as unknown as ReferralRpcClient).rpc("apply_referral_code", { p_code: cleanInput });
  if (error) return { success: false, message: error.message || "Could not apply this referral code." };
  if (typeof window !== "undefined") localStorage.removeItem("applied_referral_code");

  return {
    success: true,
    message: "Referral linked. You both receive 30 bonus days after your first successful payment.",
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
    text: `Manage your PG smarter with PG HUB. Use my referral code ${code}. After your first successful payment, we both receive 30 bonus days.`,
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
