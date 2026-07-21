import type { Room } from "@/types";
import type { PG } from "@/types/pg";

export const PHONE_OTP_TEST_CODE = "123456";

const TEST_CHALLENGE_KEY = "pghPhoneOtpTestChallenge";
const TEST_SESSION_KEY = "pghPhoneOtpTestSession";
const TEST_WORKSPACE_KEY = "pghPhoneOtpTestWorkspace";

export type PhoneOtpTestWorkspace = {
  pg: PG;
  rooms: Room[];
};

const hasSessionStorage = () => typeof window !== "undefined" && Boolean(window.sessionStorage);

export const isPhoneOtpTestModeEnabled = () =>
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_OTP_BYPASS === "true";

export const startPhoneOtpTestChallenge = (phone: string) => {
  if (!isPhoneOtpTestModeEnabled() || !hasSessionStorage()) return false;
  sessionStorage.setItem(TEST_CHALLENGE_KEY, phone);
  return true;
};

export const hasPhoneOtpTestChallenge = (phone: string) =>
  isPhoneOtpTestModeEnabled() &&
  hasSessionStorage() &&
  sessionStorage.getItem(TEST_CHALLENGE_KEY) === phone;

export const activatePhoneOtpTestSession = (phone: string) => {
  if (!hasPhoneOtpTestChallenge(phone)) return false;
  sessionStorage.setItem(TEST_SESSION_KEY, phone);
  return true;
};

export const getPhoneOtpTestSession = () => {
  if (!isPhoneOtpTestModeEnabled() || !hasSessionStorage()) return null;
  return sessionStorage.getItem(TEST_SESSION_KEY);
};

export const savePhoneOtpTestWorkspace = (workspace: PhoneOtpTestWorkspace) => {
  if (!getPhoneOtpTestSession() || !hasSessionStorage()) return false;
  sessionStorage.setItem(TEST_WORKSPACE_KEY, JSON.stringify(workspace));
  return true;
};

export const getPhoneOtpTestWorkspace = (): PhoneOtpTestWorkspace | null => {
  if (!getPhoneOtpTestSession() || !hasSessionStorage()) return null;
  const stored = sessionStorage.getItem(TEST_WORKSPACE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as PhoneOtpTestWorkspace;
  } catch {
    sessionStorage.removeItem(TEST_WORKSPACE_KEY);
    return null;
  }
};

export const clearPhoneOtpTestMode = () => {
  if (!hasSessionStorage()) return;
  sessionStorage.removeItem(TEST_CHALLENGE_KEY);
  sessionStorage.removeItem(TEST_SESSION_KEY);
  sessionStorage.removeItem(TEST_WORKSPACE_KEY);
};
